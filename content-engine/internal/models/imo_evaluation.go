package models

import (
	"time"
)

// EvaluationGrade AI评估等级
type EvaluationGrade string

const (
	GradeS EvaluationGrade = "S" // 顶级项目
	GradeA EvaluationGrade = "A" // 优秀项目
	GradeB EvaluationGrade = "B" // 良好项目
	GradeC EvaluationGrade = "C" // 一般项目
	GradeD EvaluationGrade = "D" // 较弱项目
)

// ProjectEvaluation IMO项目AI评估
type ProjectEvaluation struct {
	ID        string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID string `json:"project_id" gorm:"type:uuid;not null;index"` // 关联项目

	// 综合评分
	OverallGrade EvaluationGrade `json:"overall_grade" gorm:"type:varchar(5);not null"` // S/A/B/C/D

	// 六维度评分（S/A/B/C/D）
	GradeProduct     EvaluationGrade `json:"grade_product" gorm:"type:varchar(5)"`     // 产品力
	GradeTeam        EvaluationGrade `json:"grade_team" gorm:"type:varchar(5)"`        // 团队/背书
	GradeCommunity   EvaluationGrade `json:"grade_community" gorm:"type:varchar(5)"`   // 社区热度
	GradeMeme        EvaluationGrade `json:"grade_meme" gorm:"type:varchar(5)"`        // Meme潜力
	GradeCompetition EvaluationGrade `json:"grade_competition" gorm:"type:varchar(5)"` // 竞争格局
	GradeTiming      EvaluationGrade `json:"grade_timing" gorm:"type:varchar(5)"`      // 时机判断

	// 维度分析（详细说明）
	AnalysisProduct     string `json:"analysis_product" gorm:"type:text"`     // 产品力分析
	AnalysisTeam        string `json:"analysis_team" gorm:"type:text"`        // 团队/背书分析
	AnalysisCommunity   string `json:"analysis_community" gorm:"type:text"`   // 社区热度分析
	AnalysisMeme        string `json:"analysis_meme" gorm:"type:text"`        // Meme潜力分析
	AnalysisCompetition string `json:"analysis_competition" gorm:"type:text"` // 竞争格局分析
	AnalysisTiming      string `json:"analysis_timing" gorm:"type:text"`      // 时机判断分析

	// 汇总
	Highlights       string `json:"highlights" gorm:"type:text"`        // 亮点（JSON数组）
	Risks            string `json:"risks" gorm:"type:text"`             // 风险点（JSON数组）
	InvestmentAdvice string `json:"investment_advice" gorm:"type:text"` // 投资建议
	Summary          string `json:"summary" gorm:"type:text"`           // 一句话总结（用于卡片展示）
	FullReport       string `json:"full_report" gorm:"type:text"`       // 完整Markdown报告

	// 评估来源
	EvaluatedBy string  `json:"evaluated_by" gorm:"type:varchar(50)"` // system/admin/scout
	EvaluatorID *string `json:"evaluator_id" gorm:"type:uuid"`        // 手动评估时的用户ID
	AIModel     string  `json:"ai_model" gorm:"type:varchar(50)"`     // 使用的AI模型
	Version     int     `json:"version" gorm:"default:1"`             // 评估版本（重新评估时递增）

	// 关联
	Project Project `json:"project,omitempty" gorm:"foreignKey:ProjectID"`

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (ProjectEvaluation) TableName() string {
	return "imo_project_evaluations"
}

// EvaluationSummary 评估摘要（用于列表展示）
type EvaluationSummary struct {
	OverallGrade EvaluationGrade `json:"overall_grade"`
	Summary      string          `json:"summary"`
	EvaluatedAt  time.Time       `json:"evaluated_at"`
}

// GetGradeColor 获取等级对应的颜色
func GetGradeColor(grade EvaluationGrade) string {
	switch grade {
	case GradeS:
		return "#FFD700" // 金色
	case GradeA:
		return "#10B981" // 绿色
	case GradeB:
		return "#3B82F6" // 蓝色
	case GradeC:
		return "#F59E0B" // 橙色
	case GradeD:
		return "#EF4444" // 红色
	default:
		return "#6B7280" // 灰色
	}
}

// GetGradeLabel 获取等级的中文标签
func GetGradeLabel(grade EvaluationGrade) string {
	switch grade {
	case GradeS:
		return "顶级"
	case GradeA:
		return "优秀"
	case GradeB:
		return "良好"
	case GradeC:
		return "一般"
	case GradeD:
		return "较弱"
	default:
		return "未评估"
	}
}
