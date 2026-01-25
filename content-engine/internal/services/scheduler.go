package services

import (
	"content-engine/internal/models"
	"content-engine/internal/utils"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

// Scheduler 定时任务调度器
type Scheduler struct {
	db        *gorm.DB
	aiService *AIService
	cron      *cron.Cron
	jobs      map[uint]cron.EntryID // configID -> entryID
	mu        sync.RWMutex
}

// NewScheduler 创建调度器
func NewScheduler(db *gorm.DB, aiService *AIService) *Scheduler {
	return &Scheduler{
		db:        db,
		aiService: aiService,
		cron:      cron.New(cron.WithSeconds()),
		jobs:      make(map[uint]cron.EntryID),
	}
}

// Start 启动调度器
func (s *Scheduler) Start() error {
	log.Println("📅 启动定时任务调度器...")

	// 加载所有启用的搜索配置
	var configs []models.SearchConfig
	if err := s.db.Where("enabled = ?", true).Find(&configs).Error; err != nil {
		return fmt.Errorf("failed to load search configs: %w", err)
	}

	// 注册所有任务
	for _, cfg := range configs {
		if err := s.AddJob(cfg); err != nil {
			log.Printf("⚠️ 添加任务失败 [%s]: %v", cfg.Keyword, err)
		}
	}

	// 启动 cron
	s.cron.Start()
	log.Printf("✅ 调度器已启动，已加载 %d 个定时任务", len(configs))

	return nil
}

// Stop 停止调度器
func (s *Scheduler) Stop() {
	log.Println("🛑 停止定时任务调度器...")
	s.cron.Stop()
}

// AddJob 添加定时任务
func (s *Scheduler) AddJob(cfg models.SearchConfig) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 如果已存在，先移除
	if entryID, exists := s.jobs[cfg.ID]; exists {
		s.cron.Remove(entryID)
		delete(s.jobs, cfg.ID)
	}

	// 添加新任务
	entryID, err := s.cron.AddFunc(cfg.CronExpr, func() {
		s.executeSearch(cfg.ID)
	})
	if err != nil {
		return fmt.Errorf("invalid cron expression: %w", err)
	}

	s.jobs[cfg.ID] = entryID
	log.Printf("📌 添加定时任务: [%d] %s (cron: %s)", cfg.ID, cfg.Keyword, cfg.CronExpr)

	return nil
}

// RemoveJob 移除定时任务
func (s *Scheduler) RemoveJob(configID uint) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if entryID, exists := s.jobs[configID]; exists {
		s.cron.Remove(entryID)
		delete(s.jobs, configID)
		log.Printf("🗑️ 移除定时任务: [%d]", configID)
	}
}

// executeSearch 执行搜索任务
func (s *Scheduler) executeSearch(configID uint) {
	log.Printf("🔍 开始执行搜索任务 [%d]...", configID)

	// 获取最新配置
	var cfg models.SearchConfig
	if err := s.db.First(&cfg, configID).Error; err != nil {
		log.Printf("❌ 获取配置失败 [%d]: %v", configID, err)
		return
	}

	// 检查是否启用
	if !cfg.Enabled {
		log.Printf("⏸️ 任务已禁用 [%d]", configID)
		return
	}

	startTime := time.Now()
	var imported, skipped, noRevenue, failed int

	// 1. 全网搜索
	result, err := s.aiService.SearchWeb(cfg.Keyword)
	if err != nil {
		s.updateSearchResult(configID, fmt.Sprintf("搜索失败: %v", err))
		log.Printf("❌ 搜索失败 [%s]: %v", cfg.Keyword, err)
		return
	}

	log.Printf("📥 搜索到 %d 条结果 [%s]", len(result.Items), cfg.Keyword)

	// 2. 处理每条结果
	for _, item := range result.Items {
		if item.Content == "" {
			continue
		}

		// 2.1 去重检查 - 已采集的内容
		if item.URL != "" {
			var count int64
			s.db.Model(&models.Content{}).Where("source_url = ?", item.URL).Count(&count)
			if count > 0 {
				skipped++
				log.Printf("⏭️ 跳过重复内容: %s", item.URL)
				continue
			}
		}

		// 2.2 去重检查 - 已跳过的内容（无收入等）
		if item.URL != "" {
			var skipCount int64
			s.db.Model(&models.SkippedContent{}).Where("source_url = ?", item.URL).Count(&skipCount)
			if skipCount > 0 {
				skipped++
				log.Printf("⏭️ 跳过已标记内容: %s", item.URL)
				continue
			}
		}

		// 2.3 AI 提炼
		extracted, err := s.aiService.ExtractInsights(item.Content)
		if err != nil {
			log.Printf("⚠️ AI提炼失败: %v", err)
			failed++
			continue
		}

		// 2.4 检查收入数据 - 没有收入信息则跳过并记录
		if extracted.RevenueData == "" || extracted.RevenueData == "未披露" || extracted.RevenueData == "Not disclosed" {
			// 记录到跳过表，避免重复分析
			if item.URL != "" {
				skipRecord := &models.SkippedContent{
					SourceURL: item.URL,
					Reason:    "no_revenue",
					RawTitle:  extracted.CoreIdeaZh,
				}
				s.db.Create(skipRecord)
			}
			noRevenue++
			log.Printf("⏭️ 跳过无收入内容: %s", extracted.CoreIdeaZh)
			continue
		}

		// 2.5 智能翻译
		var contentZh, contentEn string
		if extracted.OriginalLang == "zh" {
			contentZh = extracted.SummaryZh
			contentEn = extracted.SummaryEn
			if contentEn == "" {
				contentEn, _ = s.aiService.Translate(extracted.SummaryZh, "en")
			}
		} else {
			contentEn = extracted.SummaryEn
			contentZh = extracted.SummaryZh
			if contentZh == "" {
				contentZh, _ = s.aiService.Translate(extracted.SummaryEn, "zh")
			}
		}

		// 2.6 合并标签
		tags := cfg.Tags
		if tags == nil {
			tags = models.JSONArray{}
		}

		// 2.7 创建内容并直接发布
		now := time.Now()
		content := &models.Content{
			Source:        "twitter",
			SourceURL:     item.URL,
			Author:        item.Author,
			RawContent:    item.Content,
			ContentZh:     contentZh,
			ContentEn:     contentEn,
			Tags:          tags,
			Revenue:       item.Revenue,
			CoreIdeaZh:    extracted.CoreIdeaZh,
			CoreIdeaEn:    extracted.CoreIdeaEn,
			CoreIdea:      extracted.CoreIdeaZh,
			RevenueData:   extracted.RevenueData,
			RevenueDataZh: extracted.RevenueDataZh,
			RevenueDataEn: extracted.RevenueDataEn,
			KeyPointsZh:   extracted.KeyPointsZh,
			KeyPointsEn:   extracted.KeyPointsEn,
			KeyPoints:     extracted.KeyPointsZh,
			TargetUsersZh: extracted.TargetUsersZh,
			TargetUsersEn: extracted.TargetUsersEn,
			TargetUsers:   extracted.TargetUsersZh,
			OriginalLang:  extracted.OriginalLang,
			Status:        "published", // 全自动发布
			ProcessedAt:   &now,
			PublishedAt:   &now,
		}

		// 生成 URL slug
		slugText := extracted.CoreIdeaEn
		if slugText == "" {
			slugText = extracted.CoreIdeaZh
		}
		content.Slug = utils.GenerateUniqueSlug(slugText, func(slug string) bool {
			var count int64
			s.db.Model(&models.Content{}).Where("slug = ?", slug).Count(&count)
			return count > 0
		})

		// 清理无效 UTF-8 字符
		sanitizeContent(content)

		if err := s.db.Create(content).Error; err != nil {
			log.Printf("⚠️ 保存失败: %v", err)
			failed++
			continue
		}

		imported++
		log.Printf("✅ 已导入并发布: %s", item.Author)
	}

	// 3. 更新执行结果
	duration := time.Since(startTime)
	resultMsg := fmt.Sprintf("搜索: %d, 导入: %d, 跳过: %d, 无收入: %d, 失败: %d, 耗时: %s",
		len(result.Items), imported, skipped, noRevenue, failed, duration.Round(time.Second))
	s.updateSearchResult(configID, resultMsg)

	log.Printf("✅ 任务完成 [%s]: %s", cfg.Keyword, resultMsg)
}

// updateSearchResult 更新搜索结果
func (s *Scheduler) updateSearchResult(configID uint, result string) {
	now := time.Now()
	s.db.Model(&models.SearchConfig{}).Where("id = ?", configID).Updates(map[string]interface{}{
		"last_run_at": now,
		"last_result": result,
	})
}

// RunNow 立即执行指定配置的搜索（异步）
func (s *Scheduler) RunNow(configID uint) error {
	go s.executeSearch(configID)
	return nil
}

// RunNowSync 同步执行搜索并返回结果
func (s *Scheduler) RunNowSync(configID uint) (searched int, imported int, err error) {
	return s.executeSearchSync(configID)
}

// executeSearchSync 同步执行搜索任务并返回结果
func (s *Scheduler) executeSearchSync(configID uint) (searched int, imported int, err error) {
	var cfg models.SearchConfig
	if err := s.db.First(&cfg, configID).Error; err != nil {
		return 0, 0, fmt.Errorf("配置不存在: %v", err)
	}

	if !cfg.Enabled {
		return 0, 0, fmt.Errorf("任务已禁用")
	}

	log.Printf("🔍 开始同步搜索: %s", cfg.Keyword)
	startTime := time.Now()

	// 1. 全网搜索
	result, err := s.aiService.SearchWeb(cfg.Keyword)
	if err != nil {
		s.updateSearchResult(configID, fmt.Sprintf("搜索失败: %v", err))
		return 0, 0, err
	}

	searched = len(result.Items)
	skipped := 0
	noRevenue := 0
	failed := 0

	// 2. 处理每条结果
	for _, item := range result.Items {
		// 2.1 检查是否已存在于内容表
		var count int64
		s.db.Model(&models.Content{}).Where("source_url = ?", item.URL).Count(&count)
		if count > 0 {
			skipped++
			continue
		}

		// 2.2 检查是否已在跳过表中
		var skipCount int64
		s.db.Model(&models.SkippedContent{}).Where("source_url = ?", item.URL).Count(&skipCount)
		if skipCount > 0 {
			skipped++
			continue
		}

		// 2.3 AI 提炼
		extracted, err := s.aiService.ExtractInsights(item.Content)
		if err != nil {
			log.Printf("⚠️ AI提炼失败: %v", err)
			failed++
			continue
		}

		// 2.4 检查收入数据 - 没有收入信息则跳过并记录
		if extracted.RevenueData == "" || extracted.RevenueData == "未披露" || extracted.RevenueData == "Not disclosed" {
			if item.URL != "" {
				skipRecord := &models.SkippedContent{
					SourceURL: item.URL,
					Reason:    "no_revenue",
					RawTitle:  extracted.CoreIdeaZh,
				}
				s.db.Create(skipRecord)
			}
			noRevenue++
			log.Printf("⏭️ 跳过无收入内容: %s", extracted.CoreIdeaZh)
			continue
		}

		// 2.5 智能翻译
		var contentZh, contentEn string
		if extracted.OriginalLang == "zh" {
			contentZh = extracted.SummaryZh
			contentEn = extracted.SummaryEn
			if contentEn == "" {
				contentEn, _ = s.aiService.Translate(extracted.SummaryZh, "en")
			}
		} else {
			contentEn = extracted.SummaryEn
			contentZh = extracted.SummaryZh
			if contentZh == "" {
				contentZh, _ = s.aiService.Translate(extracted.SummaryEn, "zh")
			}
		}

		// 2.6 合并标签
		tags := cfg.Tags
		if tags == nil {
			tags = models.JSONArray{}
		}

		// 2.7 创建内容
		now := time.Now()
		content := &models.Content{
			Source:        "web-search",
			SourceURL:     item.URL,
			Author:        item.Author,
			RawContent:    item.Content,
			ContentZh:     contentZh,
			ContentEn:     contentEn,
			Tags:          tags,
			Revenue:       item.Revenue,
			CoreIdeaZh:    extracted.CoreIdeaZh,
			CoreIdeaEn:    extracted.CoreIdeaEn,
			CoreIdea:      extracted.CoreIdeaZh,
			RevenueData:   extracted.RevenueData,
			RevenueDataZh: extracted.RevenueDataZh,
			RevenueDataEn: extracted.RevenueDataEn,
			KeyPointsZh:   extracted.KeyPointsZh,
			KeyPointsEn:   extracted.KeyPointsEn,
			KeyPoints:     extracted.KeyPointsZh,
			TargetUsersZh: extracted.TargetUsersZh,
			TargetUsersEn: extracted.TargetUsersEn,
			TargetUsers:   extracted.TargetUsersZh,
			OriginalLang:  extracted.OriginalLang,
			Status:        "published",
			ProcessedAt:   &now,
			PublishedAt:   &now,
		}

		// 生成 URL slug
		slugText := extracted.CoreIdeaEn
		if slugText == "" {
			slugText = extracted.CoreIdeaZh
		}
		content.Slug = utils.GenerateUniqueSlug(slugText, func(slug string) bool {
			var count int64
			s.db.Model(&models.Content{}).Where("slug = ?", slug).Count(&count)
			return count > 0
		})

		sanitizeContent(content)

		if err := s.db.Create(content).Error; err != nil {
			log.Printf("⚠️ 保存失败: %v", err)
			failed++
			continue
		}

		imported++
		log.Printf("✅ 已导入: %s", item.Author)
	}

	// 3. 更新执行结果
	duration := time.Since(startTime)
	resultMsg := fmt.Sprintf("搜索: %d, 导入: %d, 跳过: %d, 无收入: %d, 失败: %d, 耗时: %s",
		searched, imported, skipped, noRevenue, failed, duration.Round(time.Second))
	s.updateSearchResult(configID, resultMsg)

	log.Printf("✅ 同步任务完成 [%s]: %s", cfg.Keyword, resultMsg)
	return searched, imported, nil
}

// GetJobStatus 获取任务状态
func (s *Scheduler) GetJobStatus() []map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var status []map[string]interface{}
	for configID, entryID := range s.jobs {
		entry := s.cron.Entry(entryID)
		status = append(status, map[string]interface{}{
			"config_id": configID,
			"next_run":  entry.Next,
			"prev_run":  entry.Prev,
		})
	}
	return status
}

// ExtractedInsights AI提炼结果
type ExtractedInsights struct {
	CoreIdeaZh    string           `json:"core_idea_zh"`
	CoreIdeaEn    string           `json:"core_idea_en"`
	RevenueData   string           `json:"revenue_data"`
	RevenueDataZh string           `json:"revenue_data_zh"`
	RevenueDataEn string           `json:"revenue_data_en"`
	KeyPointsZh   models.JSONArray `json:"key_points_zh"`
	KeyPointsEn   models.JSONArray `json:"key_points_en"`
	TargetUsersZh string           `json:"target_users_zh"`
	TargetUsersEn string           `json:"target_users_en"`
	OriginalLang  string           `json:"original_lang"`
	SummaryZh     string           `json:"summary_zh"`
	SummaryEn     string           `json:"summary_en"`
}

// ExtractInsights AI 提炼内容精华 (双语版本)
func (s *AIService) ExtractInsights(content string) (*ExtractedInsights, error) {
	prompt := fmt.Sprintf(`你是一个顶级的创业内容编辑，风格类似即刻热门帖、小红书爆款、@levelsio 的推特。

你的内容特点是：
- 说人话，不说废话
- 用数字制造冲击感
- 让读者觉得"这个我也能做"
- 标题要有钩子，让人想点进来

===== 优秀案例参考 =====

案例1:
标题：辞职后第8个月，终于月入$10K了
收入：$10K MRR
要点：
- 🎯 选对赛道 - 做海外SaaS，避开国内内卷
- ⏰ 6个月零收入 - 但坚持每周发布新功能
- 🔄 用户反馈驱动 - 前100个用户全部1v1聊过
适合：想做海外产品但不知道从哪开始的独立开发者

案例2:
标题：一个人、一个周末、写了个小工具，现在月入$2K
收入：$2K MRR
要点：
- 💡 解决自己的痛点 - 最好的产品来自真实需求
- ⚡ MVP只用2天 - 先丑着上线，再慢慢迭代
- 📣 在Reddit发帖引爆 - 第一批用户全来自一篇帖子
适合：有技术能力但不知道做什么的程序员

===== 现在分析这个创业案例 =====

%s

===== 请回答以下问题 =====

1. 这个人做对了什么？（找最有戏剧性的角度：数量多？速度快？策略独特？）
2. 如果我是新手，最应该学习的是什么？
3. 用一个吸引人的标题总结（要有数字、有对比、像推特风格）

然后整理成以下JSON格式（不要包含markdown代码块）：
{
  "core_idea_zh": "吸引人的中文标题，要有数字和亮点，20-40字，像即刻爆款帖子",
  "core_idea_en": "Catchy English title with numbers, Twitter style, 10-25 words",
  "revenue_data": "收入数据原始格式",
  "revenue_data_zh": "中文收入，格式如：$5K MRR / 月入3万 / 年收$100K",
  "revenue_data_en": "English revenue, format: $5K MRR / $100K ARR",
  "key_points_zh": ["🎯 关键词 - 具体洞察，不是罗列事实", "⚡ 关键词 - 回答为什么有效", "💡 关键词 - 我能学到什么"],
  "key_points_en": ["🎯 Keyword - Specific insight", "⚡ Keyword - Why it works", "💡 Keyword - Actionable takeaway"],
  "target_users_zh": "具体描述，如：想做副业但不敢辞职的程序员",
  "target_users_en": "Specific description, e.g. developers wanting side income",
  "original_lang": "zh 或 en",
  "summary_zh": "100-150字精华总结，要有故事感，突出戏剧性",
  "summary_en": "50-80 words summary, storytelling style"
}`, content)

	response, err := s.Chat("Claude-4.5-Sonnet", prompt)
	if err != nil {
		return nil, err
	}

	// 清理 response 中可能的 markdown 代码块标记
	response = cleanJSONResponse(response)

	var insights ExtractedInsights
	if err := json.Unmarshal([]byte(response), &insights); err != nil {
		// 如果解析失败，使用默认值
		lang := detectLanguage(content)
		summary := content[:min(200, len(content))]
		return &ExtractedInsights{
			CoreIdeaZh:    "AI相关创业项目",
			CoreIdeaEn:    "AI-related startup project",
			RevenueData:   "未披露",
			RevenueDataZh: "未披露",
			RevenueDataEn: "Not disclosed",
			KeyPointsZh:   models.JSONArray{"值得关注的创业案例"},
			KeyPointsEn:   models.JSONArray{"Notable startup case"},
			TargetUsersZh: "创业者",
			TargetUsersEn: "Entrepreneurs",
			OriginalLang:  lang,
			SummaryZh:     summary,
			SummaryEn:     summary,
		}, nil
	}

	return &insights, nil
}

// Translate 翻译内容
func (s *AIService) Translate(content string, targetLang string) (string, error) {
	var langName string
	if targetLang == "zh" {
		langName = "中文"
	} else {
		langName = "English"
	}

	prompt := fmt.Sprintf(`请将以下内容翻译成%s，保持原意和风格，不要添加任何解释：

%s`, langName, content)

	return s.Chat("Claude-4.5-Sonnet", prompt)
}

// cleanJSONResponse 清理 JSON 响应中的 markdown 代码块
func cleanJSONResponse(response string) string {
	// 移除 ```json 和 ``` 标记
	if len(response) > 7 && response[:7] == "```json" {
		response = response[7:]
	}
	if len(response) > 3 && response[:3] == "```" {
		response = response[3:]
	}
	if len(response) > 3 && response[len(response)-3:] == "```" {
		response = response[:len(response)-3]
	}
	return response
}

// detectLanguage 简单的语言检测
func detectLanguage(content string) string {
	chineseCount := 0
	for _, r := range content {
		if r >= 0x4e00 && r <= 0x9fff {
			chineseCount++
		}
	}
	if chineseCount > len([]rune(content))/4 {
		return "zh"
	}
	return "en"
}

// sanitizeUTF8 清理无效的 UTF-8 字符
func sanitizeUTF8(s string) string {
	// 使用 strings.ToValidUTF8 替换无效字符
	return strings.ToValidUTF8(s, "")
}

// sanitizeContent 清理内容中的无效字符
func sanitizeContent(content *models.Content) {
	content.RawContent = sanitizeUTF8(content.RawContent)
	content.ContentZh = sanitizeUTF8(content.ContentZh)
	content.ContentEn = sanitizeUTF8(content.ContentEn)
	content.CoreIdea = sanitizeUTF8(content.CoreIdea)
	content.CoreIdeaZh = sanitizeUTF8(content.CoreIdeaZh)
	content.CoreIdeaEn = sanitizeUTF8(content.CoreIdeaEn)
	content.RevenueData = sanitizeUTF8(content.RevenueData)
	content.RevenueDataZh = sanitizeUTF8(content.RevenueDataZh)
	content.RevenueDataEn = sanitizeUTF8(content.RevenueDataEn)
	content.TargetUsers = sanitizeUTF8(content.TargetUsers)
	content.TargetUsersZh = sanitizeUTF8(content.TargetUsersZh)
	content.TargetUsersEn = sanitizeUTF8(content.TargetUsersEn)
	content.Revenue = sanitizeUTF8(content.Revenue)
	content.Author = sanitizeUTF8(content.Author)
}
