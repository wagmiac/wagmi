package handlers

import (
	"content-engine/internal/models"
	"content-engine/internal/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SearchConfigHandler 搜索配置处理器
type SearchConfigHandler struct {
	db        *gorm.DB
	scheduler *services.Scheduler
	aiService *services.AIService
}

// NewSearchConfigHandler 创建处理器
func NewSearchConfigHandler(db *gorm.DB, scheduler *services.Scheduler, aiService *services.AIService) *SearchConfigHandler {
	return &SearchConfigHandler{
		db:        db,
		scheduler: scheduler,
		aiService: aiService,
	}
}

// List 获取所有搜索配置
func (h *SearchConfigHandler) List(c *gin.Context) {
	var configs []models.SearchConfig
	if err := h.db.Order("id asc").Find(&configs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    configs,
	})
}

// Create 创建搜索配置
func (h *SearchConfigHandler) Create(c *gin.Context) {
	var cfg models.SearchConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	if err := h.db.Create(&cfg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 如果启用，添加到调度器
	if cfg.Enabled {
		h.scheduler.AddJob(cfg)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    cfg,
	})
}

// Update 更新搜索配置
func (h *SearchConfigHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid id"})
		return
	}

	var cfg models.SearchConfig
	if err := h.db.First(&cfg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "config not found"})
		return
	}

	var input struct {
		Keyword  string           `json:"keyword"`
		CronExpr string           `json:"cron_expr"`
		Enabled  *bool            `json:"enabled"`
		Tags     models.JSONArray `json:"tags"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 更新字段
	if input.Keyword != "" {
		cfg.Keyword = input.Keyword
	}
	if input.CronExpr != "" {
		cfg.CronExpr = input.CronExpr
	}
	if input.Enabled != nil {
		cfg.Enabled = *input.Enabled
	}
	if input.Tags != nil {
		cfg.Tags = input.Tags
	}

	if err := h.db.Save(&cfg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 更新调度器
	if cfg.Enabled {
		h.scheduler.AddJob(cfg)
	} else {
		h.scheduler.RemoveJob(cfg.ID)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    cfg,
	})
}

// Delete 删除搜索配置
func (h *SearchConfigHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid id"})
		return
	}

	// 从调度器移除
	h.scheduler.RemoveJob(uint(id))

	// 从数据库删除
	if err := h.db.Delete(&models.SearchConfig{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "deleted",
	})
}

// RunNow 立即执行搜索（同步等待结果）
func (h *SearchConfigHandler) RunNow(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid id"})
		return
	}

	// 使用同步方法等待结果
	searched, imported, err := h.scheduler.RunNowSync(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "task completed",
		"data": gin.H{
			"searched": searched,
			"imported": imported,
		},
	})
}

// Status 获取调度器状态
func (h *SearchConfigHandler) Status(c *gin.Context) {
	status := h.scheduler.GetJobStatus()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    status,
	})
}

// ExpandRequest 扩展关键词请求
type ExpandRequest struct {
	SeedKeyword string           `json:"seed_keyword" binding:"required"`
	Count       int              `json:"count"`       // 生成数量，默认 10
	Tags        models.JSONArray `json:"tags"`        // 自动添加的标签
	CronExpr    string           `json:"cron_expr"`   // 执行频率，默认每6小时
	AutoCreate  bool             `json:"auto_create"` // 是否自动创建搜索配置
}

// Expand 使用 AI 扩展种子关键词
func (h *SearchConfigHandler) Expand(c *gin.Context) {
	var req ExpandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 默认值
	if req.Count <= 0 {
		req.Count = 10
	}
	if req.CronExpr == "" {
		req.CronExpr = "0 0 */6 * * *" // 每6小时
	}

	// AI 扩展关键词
	keywords, err := h.aiService.ExpandKeywords(req.SeedKeyword, req.Count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 如果需要自动创建搜索配置
	var created []models.SearchConfig
	var skipped []string
	if req.AutoCreate {
		for _, keyword := range keywords {
			// 检查是否已存在
			var count int64
			h.db.Model(&models.SearchConfig{}).Where("keyword = ?", keyword).Count(&count)
			if count > 0 {
				skipped = append(skipped, keyword)
				continue
			}

			// 创建配置
			cfg := models.SearchConfig{
				Keyword:  keyword,
				CronExpr: req.CronExpr,
				Tags:     req.Tags,
				Enabled:  true,
			}
			if err := h.db.Create(&cfg).Error; err != nil {
				continue
			}
			created = append(created, cfg)

			// 添加到调度器
			h.scheduler.AddJob(cfg)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"keywords": keywords,
		"created":  len(created),
		"skipped":  len(skipped),
		"data":     created,
	})
}
