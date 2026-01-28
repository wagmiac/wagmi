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

// IMOEvaluationService IMO项目评估服务
type IMOEvaluationService struct {
	cfg           *config.Config
	db            *gorm.DB
	aiService     *AIService
	settingRepo   *repository.SettingRepository
	githubService *GitHubService
}

// NewIMOEvaluationService 创建IMO评估服务
func NewIMOEvaluationService(cfg *config.Config, db *gorm.DB, aiService *AIService, settingRepo *repository.SettingRepository) *IMOEvaluationService {
	// 从配置获取GitHub Token（可选）
	githubToken := settingRepo.GetValue("github_token")

	return &IMOEvaluationService{
		cfg:           cfg,
		db:            db,
		aiService:     aiService,
		settingRepo:   settingRepo,
		githubService: NewGitHubService(githubToken),
	}
}

// AIEvaluationResult AI返回的评估结果
type AIEvaluationResult struct {
	OverallGrade string `json:"overall_grade"` // S/A/B/C/D

	// 六维度
	GradeProduct     string `json:"grade_product"`
	GradeTeam        string `json:"grade_team"`
	GradeCommunity   string `json:"grade_community"`
	GradeMeme        string `json:"grade_meme"`
	GradeCompetition string `json:"grade_competition"`
	GradeTiming      string `json:"grade_timing"`

	// 分析
	AnalysisProduct     string `json:"analysis_product"`
	AnalysisTeam        string `json:"analysis_team"`
	AnalysisCommunity   string `json:"analysis_community"`
	AnalysisMeme        string `json:"analysis_meme"`
	AnalysisCompetition string `json:"analysis_competition"`
	AnalysisTiming      string `json:"analysis_timing"`

	// 汇总
	Highlights       []string `json:"highlights"`
	Risks            []string `json:"risks"`
	InvestmentAdvice string   `json:"investment_advice"`
	Summary          string   `json:"summary"`
}

// EvaluateProject 评估项目
func (s *IMOEvaluationService) EvaluateProject(projectID string, evaluatedBy string, evaluatorID *string) (*models.ProjectEvaluation, error) {
	// 获取项目数据
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		return nil, fmt.Errorf("project not found: %w", err)
	}

	// 检查是否正在评估中，防止重复评估
	if project.IsEvaluating {
		return nil, fmt.Errorf("project is currently being evaluated")
	}

	// 设置评估中状态
	s.db.Model(&project).Update("is_evaluating", true)

	// 确保评估结束时重置状态
	defer func() {
		s.db.Model(&project).Update("is_evaluating", false)
	}()

	// 调用AI生成评估
	result, err := s.generateAIEvaluation(&project)
	if err != nil {
		return nil, fmt.Errorf("AI evaluation failed: %w", err)
	}

	// 检查是否已有评估
	var existing models.ProjectEvaluation
	var version int = 1
	if err := s.db.Where("project_id = ?", projectID).Order("version desc").First(&existing).Error; err == nil {
		version = existing.Version + 1
	}

	// 序列化亮点和风险
	highlightsJSON, _ := json.Marshal(result.Highlights)
	risksJSON, _ := json.Marshal(result.Risks)

	// 生成完整报告
	fullReport := s.generateFullReport(&project, result)

	// 获取AI模型 - 优先使用环境变量配置
	aiModel := s.cfg.POEModel

	// 创建评估记录
	evaluation := &models.ProjectEvaluation{
		ProjectID:           projectID,
		OverallGrade:        models.EvaluationGrade(result.OverallGrade),
		GradeProduct:        models.EvaluationGrade(result.GradeProduct),
		GradeTeam:           models.EvaluationGrade(result.GradeTeam),
		GradeCommunity:      models.EvaluationGrade(result.GradeCommunity),
		GradeMeme:           models.EvaluationGrade(result.GradeMeme),
		GradeCompetition:    models.EvaluationGrade(result.GradeCompetition),
		GradeTiming:         models.EvaluationGrade(result.GradeTiming),
		AnalysisProduct:     result.AnalysisProduct,
		AnalysisTeam:        result.AnalysisTeam,
		AnalysisCommunity:   result.AnalysisCommunity,
		AnalysisMeme:        result.AnalysisMeme,
		AnalysisCompetition: result.AnalysisCompetition,
		AnalysisTiming:      result.AnalysisTiming,
		Highlights:          string(highlightsJSON),
		Risks:               string(risksJSON),
		InvestmentAdvice:    result.InvestmentAdvice,
		Summary:             result.Summary,
		FullReport:          fullReport,
		EvaluatedBy:         evaluatedBy,
		EvaluatorID:         evaluatorID,
		AIModel:             aiModel,
		Version:             version,
	}

	if err := s.db.Create(evaluation).Error; err != nil {
		return nil, fmt.Errorf("failed to save evaluation: %w", err)
	}

	return evaluation, nil
}

// GetLatestEvaluation 获取项目最新评估
func (s *IMOEvaluationService) GetLatestEvaluation(projectID string) (*models.ProjectEvaluation, error) {
	var evaluation models.ProjectEvaluation
	if err := s.db.Where("project_id = ?", projectID).Order("version desc").First(&evaluation).Error; err != nil {
		return nil, err
	}
	return &evaluation, nil
}

// GetEvaluationByID 通过ID获取评估
func (s *IMOEvaluationService) GetEvaluationByID(id string) (*models.ProjectEvaluation, error) {
	var evaluation models.ProjectEvaluation
	if err := s.db.First(&evaluation, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &evaluation, nil
}

// GetEvaluationHistory 获取项目评估历史
func (s *IMOEvaluationService) GetEvaluationHistory(projectID string) ([]models.ProjectEvaluation, error) {
	var evaluations []models.ProjectEvaluation
	if err := s.db.Where("project_id = ?", projectID).Order("version desc").Find(&evaluations).Error; err != nil {
		return nil, err
	}
	return evaluations, nil
}

// generateAIEvaluation 调用AI生成评估
func (s *IMOEvaluationService) generateAIEvaluation(project *models.Project) (*AIEvaluationResult, error) {
	// 获取GitHub实时数据
	githubDataStr := ""
	if project.Github != "" {
		stats, err := s.githubService.GetRepoStats(project.Github)
		if err != nil {
			// GitHub数据获取失败，记录但不阻塞评估
			githubDataStr = fmt.Sprintf("GitHub数据获取失败: %v", err)
		} else {
			githubDataStr = s.githubService.FormatStatsForPrompt(stats)
		}
	} else {
		githubDataStr = "GitHub数据: 未提供GitHub链接"
	}

	// 构建项目信息
	projectInfo := fmt.Sprintf(`项目名称: %s
代币符号: $%s
项目描述: %s
官网: %s
Twitter: %s
GitHub: %s
Product Hunt: %s
Discord: %s
Reddit: %s

%s`,
		project.Name,
		project.Ticker,
		project.Description,
		project.Website,
		project.Twitter,
		project.Github,
		project.ProductHunt,
		project.Discord,
		project.Reddit,
		githubDataStr,
	)

	// 构建评估prompt
	prompt := fmt.Sprintf(`你是一位专业的加密货币投资分析师，专门评估 Meme 币项目。请对以下项目进行全面评估。

## 项目信息
%s

## 评估要求

请从以下6个维度对项目进行评估，每个维度给出 S/A/B/C/D 等级评分：
- S（顶级）: 该维度表现极其出色，属于市场前 5%%
- A（优秀）: 该维度表现优秀，属于市场前 20%%
- B（良好）: 该维度表现良好，高于市场平均水平
- C（一般）: 该维度表现一般，处于市场平均水平
- D（较弱）: 该维度表现较弱，低于市场平均水平

### 评估维度

1. **产品力** (product): 产品创新性、解决的问题、市场需求、技术实现难度
2. **团队/背书** (team): 基于提供的社交链接判断项目可信度、背书强度、贡献者数量
3. **社区热度** (community): 基于 GitHub Stars/Forks增长趋势、Product Hunt、Twitter、Discord、Reddit 等判断社区活跃度。**特别注意GitHub热度等级，explosive/hot级别应给予S或A评分**
4. **Meme潜力** (meme): 名称/概念是否适合做 Meme、传播性、易记程度、病毒性潜力
5. **竞争格局** (competition): 赛道竞争情况、差异化程度、护城河
6. **时机判断** (timing): 是否处于风口、趋势契合度、市场情绪。**GitHub热度explosive的项目说明正处于爆发期，时机极佳**

### 重要提示
- 如果GitHub热度为explosive（爆发级），这是非常罕见的信号，说明项目正在被市场疯狂关注，综合评级应考虑给予S级
- 日均Stars超过100是极其罕见的，只有顶级项目才能达到
- Stars超过50000的项目已经是头部项目

## 输出格式

请严格按照以下 JSON 格式输出，不要有其他内容：

{
  "overall_grade": "等级",
  "grade_product": "等级",
  "grade_team": "等级",
  "grade_community": "等级",
  "grade_meme": "等级",
  "grade_competition": "等级",
  "grade_timing": "等级",
  "analysis_product": "产品力分析（50-100字）",
  "analysis_team": "团队/背书分析（50-100字）",
  "analysis_community": "社区热度分析（50-100字，务必提及GitHub Stars数据和增长趋势）",
  "analysis_meme": "Meme潜力分析（50-100字）",
  "analysis_competition": "竞争格局分析（50-100字）",
  "analysis_timing": "时机判断分析（50-100字，如有爆发式增长务必提及）",
  "highlights": ["亮点1", "亮点2", "亮点3"],
  "risks": ["风险1", "风险2", "风险3"],
  "investment_advice": "投资建议（100-150字，包含风险提示）",
  "summary": "一句话总结（20-30字，用于卡片展示）"
}`, projectInfo)

	// 获取AI模型 - 优先使用环境变量配置
	aiModel := s.cfg.POEModel
	if dbModel := s.settingRepo.GetValue("ai_model"); dbModel != "" {
		// 只有当环境变量是默认值时，才使用数据库配置
		if aiModel == "GPT-4" {
			aiModel = dbModel
		}
	}
	fmt.Printf("[Evaluation] Using AI model: %s\n", aiModel)

	// 调用AI
	response, err := s.aiService.callPOESimple(prompt, aiModel)
	if err != nil {
		return nil, fmt.Errorf("AI call failed: %w", err)
	}

	// 解析JSON
	result := &AIEvaluationResult{}

	// 尝试提取JSON
	jsonContent := response
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

	// 找到JSON对象
	jsonStart := strings.Index(jsonContent, "{")
	jsonEnd := strings.LastIndex(jsonContent, "}")
	if jsonStart >= 0 && jsonEnd > jsonStart {
		jsonStr := jsonContent[jsonStart : jsonEnd+1]
		if err := json.Unmarshal([]byte(jsonStr), result); err != nil {
			return nil, fmt.Errorf("failed to parse AI response: %w, content: %s", err, jsonStr[:min(500, len(jsonStr))])
		}
	} else {
		return nil, fmt.Errorf("no valid JSON in AI response")
	}

	// 验证等级有效性
	validGrades := map[string]bool{"S": true, "A": true, "B": true, "C": true, "D": true}
	if !validGrades[result.OverallGrade] {
		result.OverallGrade = "C" // 默认
	}

	return result, nil
}

// generateFullReport 生成完整的Markdown报告
func (s *IMOEvaluationService) generateFullReport(project *models.Project, result *AIEvaluationResult) string {
	// 格式化亮点
	highlightsList := ""
	for _, h := range result.Highlights {
		highlightsList += fmt.Sprintf("- ✅ %s\n", h)
	}

	// 格式化风险
	risksList := ""
	for _, r := range result.Risks {
		risksList += fmt.Sprintf("- ⚠️ %s\n", r)
	}

	report := fmt.Sprintf(`# %s ($%s) AI评估报告

## 📊 综合评级: %s

> %s

---

## 六维度评估

### 🎯 产品力: %s
%s

### 👥 团队/背书: %s
%s

### 🔥 社区热度: %s
%s

### 🚀 Meme潜力: %s
%s

### ⚔️ 竞争格局: %s
%s

### ⏰ 时机判断: %s
%s

---

## 💎 核心亮点
%s

## ⚠️ 风险提示
%s

---

## 💡 投资建议

%s

---

*本评估由 AI 自动生成，仅供参考，不构成投资建议。*
`,
		project.Name, project.Ticker, result.OverallGrade, result.Summary,
		result.GradeProduct, result.AnalysisProduct,
		result.GradeTeam, result.AnalysisTeam,
		result.GradeCommunity, result.AnalysisCommunity,
		result.GradeMeme, result.AnalysisMeme,
		result.GradeCompetition, result.AnalysisCompetition,
		result.GradeTiming, result.AnalysisTiming,
		highlightsList, risksList, result.InvestmentAdvice,
	)

	return report
}
