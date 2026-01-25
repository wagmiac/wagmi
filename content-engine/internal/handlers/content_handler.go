package handlers

import (
	"content-engine/internal/models"
	"content-engine/internal/repository"
	"content-engine/internal/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ContentHandler struct {
	service *services.ContentService
	db      *gorm.DB
}

func NewContentHandler(service *services.ContentService, db *gorm.DB) *ContentHandler {
	return &ContentHandler{service: service, db: db}
}

// List 获取内容列表
func (h *ContentHandler) List(c *gin.Context) {
	params := repository.ListParams{
		Status: c.Query("status"),
		Search: c.Query("search"),
	}

	if page, err := strconv.Atoi(c.DefaultQuery("page", "1")); err == nil {
		params.Page = page
	}
	if limit, err := strconv.Atoi(c.DefaultQuery("limit", "10")); err == nil {
		params.Limit = limit
	}

	result, err := h.service.List(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

// Get 获取单条内容
func (h *ContentHandler) Get(c *gin.Context) {
	id := c.Param("id")

	content, err := h.service.Get(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Content not found"})
		return
	}

	// 查询浏览量
	var viewCount int64
	h.db.Model(&models.ViewHistory{}).Where("content_id = ?", content.ID).Count(&viewCount)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": ContentWithViewCount{
		Content:   *content,
		ViewCount: viewCount,
	}})
}

// GetBySlug 通过 slug 获取单条内容
func (h *ContentHandler) GetBySlug(c *gin.Context) {
	slug := c.Param("slug")

	content, err := h.service.GetBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Content not found"})
		return
	}

	// 查询浏览量
	var viewCount int64
	h.db.Model(&models.ViewHistory{}).Where("content_id = ?", content.ID).Count(&viewCount)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": ContentWithViewCount{
		Content:   *content,
		ViewCount: viewCount,
	}})
}

// CreateRequest 创建请求
type CreateRequest struct {
	Source     string   `json:"source" binding:"required"`
	SourceURL  string   `json:"source_url"`
	Author     string   `json:"author"`
	RawContent string   `json:"raw_content" binding:"required"`
	Tags       []string `json:"tags"`
	Revenue    string   `json:"revenue"`
}

// Create 创建内容
func (h *ContentHandler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	content := &models.Content{
		Source:     req.Source,
		SourceURL:  req.SourceURL,
		Author:     req.Author,
		RawContent: req.RawContent,
		Tags:       req.Tags,
		Revenue:    req.Revenue,
	}

	if err := h.service.Create(content); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": content})
}

// UpdateRequest 更新请求
type UpdateRequest struct {
	ContentZh string   `json:"content_zh"`
	ContentEn string   `json:"content_en"`
	Tags      []string `json:"tags"`
	Revenue   string   `json:"revenue"`
}

// Update 更新内容
func (h *ContentHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	updates := map[string]interface{}{
		"content_zh": req.ContentZh,
		"content_en": req.ContentEn,
		"tags":       req.Tags,
		"revenue":    req.Revenue,
	}

	if err := h.service.Update(id, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Updated successfully"})
}

// Delete 删除内容
func (h *ContentHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Deleted successfully"})
}

// Approve 审核通过
func (h *ContentHandler) Approve(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.Approve(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Approved successfully"})
}

// Reject 审核拒绝
func (h *ContentHandler) Reject(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.Reject(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Rejected successfully"})
}

// Publish 发布内容
func (h *ContentHandler) Publish(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.Publish(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Published successfully"})
}

// Stats 统计数据
func (h *ContentHandler) Stats(c *gin.Context) {
	stats, err := h.service.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": stats})
}

// ContentWithViewCount 带浏览量的内容
type ContentWithViewCount struct {
	models.Content
	ViewCount int64 `json:"view_count"`
}

// PublicListResult 公开列表返回结果
type PublicListResult struct {
	Items []ContentWithViewCount `json:"items"`
	Total int64                  `json:"total"`
	Page  int                    `json:"page"`
	Limit int                    `json:"limit"`
}

// PublicList 公开 API - 获取已发布内容
func (h *ContentHandler) PublicList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	lang := c.DefaultQuery("lang", "zh")
	search := c.Query("search")
	tag := c.Query("tag")

	result, err := h.service.ListPublished(page, limit, lang, search, tag)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 获取所有内容 ID
	contentIDs := make([]string, len(result.Items))
	for i, item := range result.Items {
		contentIDs[i] = item.ID
	}

	// 批量查询浏览量
	type ViewCountResult struct {
		ContentID string
		Count     int64
	}
	var viewCounts []ViewCountResult
	h.db.Model(&models.ViewHistory{}).
		Select("content_id, count(*) as count").
		Where("content_id IN ?", contentIDs).
		Group("content_id").
		Scan(&viewCounts)

	// 构建浏览量 map
	viewCountMap := make(map[string]int64)
	for _, vc := range viewCounts {
		viewCountMap[vc.ContentID] = vc.Count
	}

	// 构建带 view_count 的响应
	itemsWithViewCount := make([]ContentWithViewCount, len(result.Items))
	for i, item := range result.Items {
		itemsWithViewCount[i] = ContentWithViewCount{
			Content:   item,
			ViewCount: viewCountMap[item.ID],
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": PublicListResult{
		Items: itemsWithViewCount,
		Total: result.Total,
		Page:  result.Page,
		Limit: result.Limit,
	}})
}

// GetRelated 获取相关内容推荐
func (h *ContentHandler) GetRelated(c *gin.Context) {
	id := c.Param("id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "6"))

	related, err := h.service.GetRelated(id, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": related})
}
