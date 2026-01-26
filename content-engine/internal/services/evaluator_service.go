package services

import (
	"content-engine/internal/config"
	"content-engine/internal/models"
	"content-engine/internal/repository"
	"encoding/json"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

// EvaluatorService 评估服务
type EvaluatorService struct {
	cfg         *config.Config
	db          *gorm.DB
	phService   *PHService
	aiService   *AIService
	settingRepo *repository.SettingRepository
}

// NewEvaluatorService 创建评估服务
func NewEvaluatorService(cfg *config.Config, db *gorm.DB, phService *PHService, aiService *AIService, settingRepo *repository.SettingRepository) *EvaluatorService {
	return &EvaluatorService{
		cfg:         cfg,
		db:          db,
		phService:   phService,
		aiService:   aiService,
		settingRepo: settingRepo,
	}
}

// EvaluationScores 评分结果
type EvaluationScores struct {
	Product   int `json:"product"`   // 产品力
	Community int `json:"community"` // 社区热度
	AIGC      int `json:"aigc"`      // AIGC 相关性
	Maker     int `json:"maker"`     // Maker 信誉
	Meme      int `json:"meme"`      // Meme 潜力
	Total     int `json:"total"`     // 综合评分
}

// EvaluationReport 评估报告
type EvaluationReport struct {
	ProductAnalysis   string `json:"product_analysis"`
	AIGCAnalysis      string `json:"aigc_analysis"`
	MakerAnalysis     string `json:"maker_analysis"`
	CommunityFeedback string `json:"community_feedback"`
	MemeAnalysis      string `json:"meme_analysis"`
	RiskWarning       string `json:"risk_warning"`
	TokenSuggestion   string `json:"token_suggestion"`
	RecommendLevel    int    `json:"recommend_level"`
}

// EvaluateProduct 评估产品
func (s *EvaluatorService) EvaluateProduct(productID string) (*models.PHEvaluation, error) {
	// 检查是否已有评估
	var existing models.PHEvaluation
	if err := s.db.Where("product_id = ?", productID).First(&existing).Error; err == nil {
		// 已有评估，直接返回
		return &existing, nil
	}

	// 获取产品数据
	product, err := s.phService.GetProductByID(productID)
	if err != nil {
		return nil, fmt.Errorf("product not found: %w", err)
	}

	// 调用 AI 生成评估
	scores, report, err := s.generateAIEvaluation(product)
	if err != nil {
		return nil, fmt.Errorf("AI evaluation failed: %w", err)
	}

	// 生成完整报告
	fullReport := s.generateFullReport(product, scores, report)

	// 保存评估结果
	evaluation := &models.PHEvaluation{
		ProductID:         productID,
		ScoreProduct:      scores.Product,
		ScoreCommunity:    scores.Community,
		ScoreAIGC:         scores.AIGC,
		ScoreMaker:        scores.Maker,
		ScoreMeme:         scores.Meme,
		ScoreTotal:        scores.Total,
		ProductAnalysis:   report.ProductAnalysis,
		AIGCAnalysis:      report.AIGCAnalysis,
		MakerAnalysis:     report.MakerAnalysis,
		CommunityFeedback: report.CommunityFeedback,
		MemeAnalysis:      report.MemeAnalysis,
		RiskWarning:       report.RiskWarning,
		TokenSuggestion:   report.TokenSuggestion,
		RecommendLevel:    report.RecommendLevel,
		FullReport:        fullReport,
	}

	if err := s.db.Create(evaluation).Error; err != nil {
		return nil, err
	}

	return evaluation, nil
}

// generateAIEvaluation 使用 AI 生成评估
func (s *EvaluatorService) generateAIEvaluation(product *models.PHProduct) (*EvaluationScores, *EvaluationReport, error) {
	// 构建 prompt
	prompt := s.buildEvaluationPrompt(product)

	// 获取配置的模型
	model := s.settingRepo.GetValue("ai_model")
	if model == "" {
		model = s.cfg.POEModel
	}

	// 调用 AI
	response, err := s.aiService.Chat(model, prompt)
	if err != nil {
		return nil, nil, err
	}

	// 解析响应
	return s.parseAIResponse(response)
}

// buildEvaluationPrompt 构建评估 Prompt
func (s *EvaluatorService) buildEvaluationPrompt(product *models.PHProduct) string {
	topics := ""
	if len(product.Topics) > 0 {
		topicsJSON, _ := json.Marshal(product.Topics)
		topics = string(topicsJSON)
	}

	return fmt.Sprintf(`你是 WAGMI 平台的 AI 评估专家，专门评估 Product Hunt 上的产品是否适合代币化。

请根据以下产品信息，从 5 个维度进行评估，每个维度打分 1-10 分：

【产品信息】
- 名称：%s
- Tagline：%s
- 描述：%s
- 官网：%s
- 标签：%s
- Upvotes：%d
- 评论数：%d
- Maker：%s
- Maker 简介：%s
- Maker Twitter：%s
- Maker 历史产品数：%d

【评分维度】
1. 产品力（权重25%%）：产品定位清晰度、解决的问题、功能完整度
2. 社区热度（权重20%%）：Upvotes、评论数、用户反馈
3. AIGC相关性（权重20%%）：是否 AI 产品、AI Native 程度
4. Maker信誉（权重15%%）：历史产品表现、社交链接完整度
5. Meme潜力（权重20%%）：名字/品牌传播性、叙事强度、情绪共鸣

请严格按以下 JSON 格式返回：

{
  "scores": {
    "product": 8,
    "community": 7,
    "aigc": 9,
    "maker": 6,
    "meme": 7
  },
  "report": {
    "product_analysis": "产品分析...",
    "aigc_analysis": "AIGC判定：AI技术类型、AI Native程度...",
    "maker_analysis": "Maker背景分析...",
    "community_feedback": "社区反馈摘要...",
    "meme_analysis": "Meme潜力分析：品牌传播性、叙事角度...",
    "risk_warning": "风险提示...",
    "token_suggestion": "代币化建议...",
    "recommend_level": 4
  }
}

注意：
- 每个分数必须是 1-10 的整数
- recommend_level 是 1-5 的整数（1=不推荐，5=强烈推荐）
- 所有分析字段都需要有实质内容
- 只返回 JSON，不要其他文字
`, product.Name, product.Tagline, product.Description, product.URL, topics,
		product.Upvotes, product.CommentsCount,
		product.MakerName, product.MakerHeadline, product.MakerTwitter, product.MakerProductsCount)
}

// parseAIResponse 解析 AI 响应
func (s *EvaluatorService) parseAIResponse(response string) (*EvaluationScores, *EvaluationReport, error) {
	// 尝试提取 JSON
	jsonContent := response

	// 去掉 markdown 代码块标记
	if strings.Contains(response, "```json") {
		start := strings.Index(response, "```json") + 7
		end := strings.LastIndex(response, "```")
		if end > start {
			jsonContent = strings.TrimSpace(response[start:end])
		}
	} else if strings.Contains(response, "```") {
		start := strings.Index(response, "```") + 3
		end := strings.LastIndex(response, "```")
		if end > start {
			jsonContent = strings.TrimSpace(response[start:end])
		}
	}

	// 找到 JSON 对象
	jsonStart := strings.Index(jsonContent, "{")
	jsonEnd := strings.LastIndex(jsonContent, "}")
	if jsonStart >= 0 && jsonEnd > jsonStart {
		jsonContent = jsonContent[jsonStart : jsonEnd+1]
	}

	// 解析 JSON
	var result struct {
		Scores struct {
			Product   int `json:"product"`
			Community int `json:"community"`
			AIGC      int `json:"aigc"`
			Maker     int `json:"maker"`
			Meme      int `json:"meme"`
		} `json:"scores"`
		Report struct {
			ProductAnalysis   string `json:"product_analysis"`
			AIGCAnalysis      string `json:"aigc_analysis"`
			MakerAnalysis     string `json:"maker_analysis"`
			CommunityFeedback string `json:"community_feedback"`
			MemeAnalysis      string `json:"meme_analysis"`
			RiskWarning       string `json:"risk_warning"`
			TokenSuggestion   string `json:"token_suggestion"`
			RecommendLevel    int    `json:"recommend_level"`
		} `json:"report"`
	}

	if err := json.Unmarshal([]byte(jsonContent), &result); err != nil {
		return nil, nil, fmt.Errorf("failed to parse AI response: %w, content: %s", err, jsonContent[:min(200, len(jsonContent))])
	}

	// 计算综合评分（加权平均）
	total := int(float64(result.Scores.Product)*0.25 +
		float64(result.Scores.Community)*0.20 +
		float64(result.Scores.AIGC)*0.20 +
		float64(result.Scores.Maker)*0.15 +
		float64(result.Scores.Meme)*0.20)

	// 转换为 0-100 分
	total = total * 10

	scores := &EvaluationScores{
		Product:   result.Scores.Product,
		Community: result.Scores.Community,
		AIGC:      result.Scores.AIGC,
		Maker:     result.Scores.Maker,
		Meme:      result.Scores.Meme,
		Total:     total,
	}

	report := &EvaluationReport{
		ProductAnalysis:   result.Report.ProductAnalysis,
		AIGCAnalysis:      result.Report.AIGCAnalysis,
		MakerAnalysis:     result.Report.MakerAnalysis,
		CommunityFeedback: result.Report.CommunityFeedback,
		MemeAnalysis:      result.Report.MemeAnalysis,
		RiskWarning:       result.Report.RiskWarning,
		TokenSuggestion:   result.Report.TokenSuggestion,
		RecommendLevel:    result.Report.RecommendLevel,
	}

	return scores, report, nil
}

// generateFullReport 生成完整 Markdown 报告
func (s *EvaluatorService) generateFullReport(product *models.PHProduct, scores *EvaluationScores, report *EvaluationReport) string {
	stars := strings.Repeat("⭐", report.RecommendLevel) + strings.Repeat("☆", 5-report.RecommendLevel)

	return fmt.Sprintf(`# 📊 WAGMI 评估报告

## 基础信息

| 项目 | 内容 |
|------|------|
| **产品名称** | %s |
| **Tagline** | %s |
| **官网** | %s |
| **Upvotes** | %d |
| **评论数** | %d |

## 评分速览

| 维度 | 分数 |
|------|------|
| 产品力 | %d/10 |
| 社区热度 | %d/10 |
| AIGC相关性 | %d/10 |
| Maker信誉 | %d/10 |
| Meme潜力 | %d/10 |
| **综合评分** | **%d/100** |

## 产品分析

%s

## AIGC 判定

%s

## Maker 背景

%s

## 社区反馈摘要

%s

## Meme 潜力分析

%s

## ⚠️ 风险提示

%s

## 💡 代币化建议

- **推荐等级**：%s
- %s

---

*报告由 WAGMI AI 自动生成*
`,
		product.Name, product.Tagline, product.URL, product.Upvotes, product.CommentsCount,
		scores.Product, scores.Community, scores.AIGC, scores.Maker, scores.Meme, scores.Total,
		report.ProductAnalysis,
		report.AIGCAnalysis,
		report.MakerAnalysis,
		report.CommunityFeedback,
		report.MemeAnalysis,
		report.RiskWarning,
		stars, report.TokenSuggestion)
}

// GetEvaluationByProductID 获取产品的评估报告
func (s *EvaluatorService) GetEvaluationByProductID(productID string) (*models.PHEvaluation, error) {
	var evaluation models.PHEvaluation
	if err := s.db.Preload("Product").Where("product_id = ?", productID).First(&evaluation).Error; err != nil {
		return nil, err
	}
	return &evaluation, nil
}

// GetEvaluationByID 获取评估报告
func (s *EvaluatorService) GetEvaluationByID(id string) (*models.PHEvaluation, error) {
	var evaluation models.PHEvaluation
	if err := s.db.Preload("Product").Where("id = ?", id).First(&evaluation).Error; err != nil {
		return nil, err
	}
	return &evaluation, nil
}

// ListEvaluations 获取评估列表
func (s *EvaluatorService) ListEvaluations(page, pageSize int) ([]models.PHEvaluation, int64, error) {
	var evaluations []models.PHEvaluation
	var total int64

	s.db.Model(&models.PHEvaluation{}).Count(&total)

	offset := (page - 1) * pageSize
	if err := s.db.Preload("Product").Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&evaluations).Error; err != nil {
		return nil, 0, err
	}

	return evaluations, total, nil
}

// UpdateEvaluation 更新评估
func (s *EvaluatorService) UpdateEvaluation(evaluation *models.PHEvaluation) error {
	return s.db.Save(evaluation).Error
}
