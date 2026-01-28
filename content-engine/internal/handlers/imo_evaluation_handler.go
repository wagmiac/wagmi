package handlers

import (
	"content-engine/internal/models"
	"content-engine/internal/services"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// IMOEvaluationHandler IMO项目评估处理器
type IMOEvaluationHandler struct {
	db                *gorm.DB
	evaluationService *services.IMOEvaluationService
}

// NewIMOEvaluationHandler 创建评估处理器
func NewIMOEvaluationHandler(db *gorm.DB, evaluationService *services.IMOEvaluationService) *IMOEvaluationHandler {
	return &IMOEvaluationHandler{
		db:                db,
		evaluationService: evaluationService,
	}
}

// GetProjectEvaluation 获取项目最新评估
// @Summary 获取项目最新评估
// @Description 获取指定项目的最新AI评估报告
// @Tags IMO Evaluation
// @Produce json
// @Param id path string true "项目ID"
// @Success 200 {object} models.ProjectEvaluation
// @Router /api/imo/projects/{id}/evaluation [get]
func (h *IMOEvaluationHandler) GetProjectEvaluation(c *gin.Context) {
	projectID := c.Param("id")

	evaluation, err := h.evaluationService.GetLatestEvaluation(projectID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "evaluation not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    evaluation,
	})
}

// GetEvaluationByID 通过ID获取评估
// @Summary 通过ID获取评估
// @Description 通过评估ID获取评估详情
// @Tags IMO Evaluation
// @Produce json
// @Param id path string true "评估ID"
// @Success 200 {object} models.ProjectEvaluation
// @Router /api/imo/evaluations/{id} [get]
func (h *IMOEvaluationHandler) GetEvaluationByID(c *gin.Context) {
	id := c.Param("id")

	evaluation, err := h.evaluationService.GetEvaluationByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "evaluation not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    evaluation,
	})
}

// GetEvaluationHistory 获取项目评估历史
// @Summary 获取项目评估历史
// @Description 获取项目的所有历史评估记录
// @Tags IMO Evaluation
// @Produce json
// @Param id path string true "项目ID"
// @Success 200 {array} models.ProjectEvaluation
// @Router /api/imo/projects/{id}/evaluations [get]
func (h *IMOEvaluationHandler) GetEvaluationHistory(c *gin.Context) {
	projectID := c.Param("id")

	evaluations, err := h.evaluationService.GetEvaluationHistory(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    evaluations,
	})
}

// TriggerEvaluation 手动触发评估（管理员/伯乐）
// @Summary 手动触发评估
// @Description 管理员或伯乐手动重新触发AI评估
// @Tags IMO Evaluation
// @Accept json
// @Produce json
// @Param id path string true "项目ID"
// @Success 200 {object} models.ProjectEvaluation
// @Router /api/imo/projects/{id}/evaluate [post]
func (h *IMOEvaluationHandler) TriggerEvaluation(c *gin.Context) {
	projectID := c.Param("id")

	// 获取当前用户信息
	evaluatedBy := "admin" // 默认管理员
	var evaluatorID *string

	// 如果是钱包认证的用户
	if wallet, exists := c.Get("wallet"); exists {
		walletStr := wallet.(string)

		// 查询项目确认是否为伯乐
		var project models.Project
		if err := h.db.First(&project, "id = ?", projectID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "project not found",
			})
			return
		}

		// 如果是伯乐
		if project.ScoutWallet == walletStr {
			evaluatedBy = "scout"
			// 查询用户ID
			var user models.IMOUser
			if err := h.db.Where("wallet = ?", walletStr).First(&user).Error; err == nil {
				evaluatorID = &user.ID
			}
		}
	}

	// 触发评估
	evaluation, err := h.evaluationService.EvaluateProject(projectID, evaluatedBy, evaluatorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    evaluation,
		"message": "评估完成",
	})
}

// AdminTriggerEvaluation 管理员触发评估
// @Summary 管理员触发评估
// @Description 管理员强制重新触发AI评估
// @Tags IMO Evaluation
// @Accept json
// @Produce json
// @Param id path string true "项目ID"
// @Success 200 {object} models.ProjectEvaluation
// @Router /api/imo/admin/projects/{id}/evaluate [post]
func (h *IMOEvaluationHandler) AdminTriggerEvaluation(c *gin.Context) {
	projectID := c.Param("id")

	// 管理员触发
	evaluation, err := h.evaluationService.EvaluateProject(projectID, "admin", nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    evaluation,
		"message": "管理员评估完成",
	})
}

// ListEvaluations 获取评估列表（带分页）
// @Summary 获取评估列表
// @Description 获取所有项目的最新评估列表
// @Tags IMO Evaluation
// @Produce json
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(20)
// @Param grade query string false "评级筛选（S/A/B/C/D）"
// @Success 200 {array} models.ProjectEvaluation
// @Router /api/imo/evaluations [get]
func (h *IMOEvaluationHandler) ListEvaluations(c *gin.Context) {
	var evaluations []models.ProjectEvaluation

	query := h.db.Model(&models.ProjectEvaluation{})

	// 只获取每个项目的最新版本
	subQuery := h.db.Model(&models.ProjectEvaluation{}).
		Select("project_id, MAX(version) as max_version").
		Group("project_id")

	query = query.Joins("JOIN (?) as latest ON imo_project_evaluations.project_id = latest.project_id AND imo_project_evaluations.version = latest.max_version", subQuery)

	// 评级筛选
	if grade := c.Query("grade"); grade != "" {
		query = query.Where("overall_grade = ?", grade)
	}

	// 分页
	page := 1
	limit := 20
	if p := c.Query("page"); p != "" {
		if _, err := c.GetQuery("page"); err {
			page = 1
		}
	}
	if l := c.Query("limit"); l != "" {
		if _, err := c.GetQuery("limit"); err {
			limit = 20
		}
	}

	offset := (page - 1) * limit

	// 获取总数
	var total int64
	query.Count(&total)

	// 查询
	if err := query.Preload("Project").Order("created_at desc").Offset(offset).Limit(limit).Find(&evaluations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    evaluations,
		"meta": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}
