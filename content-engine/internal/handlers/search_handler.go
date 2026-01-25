package handlers

import (
	"content-engine/internal/models"
	"content-engine/internal/repository"
	"content-engine/internal/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type SearchHandler struct {
	aiService   *services.AIService
	contentRepo *repository.ContentRepository
}

func NewSearchHandler(aiService *services.AIService, contentRepo *repository.ContentRepository) *SearchHandler {
	return &SearchHandler{
		aiService:   aiService,
		contentRepo: contentRepo,
	}
}

// SearchRequest 搜索请求
type SearchRequest struct {
	Query string `json:"query" binding:"required"`
}

// Search 使用 POE Web-Search 全网搜索
func (h *SearchHandler) Search(c *gin.Context) {
	var req SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	result, err := h.aiService.SearchWeb(req.Query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

// SearchAndImportRequest 搜索并导入请求
type SearchAndImportRequest struct {
	Query string   `json:"query" binding:"required"`
	Tags  []string `json:"tags"`
}

// SearchAndImport 搜索并自动导入到系统
func (h *SearchHandler) SearchAndImport(c *gin.Context) {
	var req SearchAndImportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 搜索
	result, err := h.aiService.SearchWeb(req.Query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 导入搜索结果
	var imported []string
	var failed []string

	for _, item := range result.Items {
		if item.Content == "" {
			continue
		}

		content := &models.Content{
			Source:     "web-search",
			SourceURL:  item.URL,
			Author:     item.Author,
			RawContent: item.Content,
			Tags:       req.Tags,
			Revenue:    item.Revenue,
			Status:     "raw",
		}

		if err := h.contentRepo.Create(content); err != nil {
			failed = append(failed, item.Author)
		} else {
			imported = append(imported, content.ID)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"imported": len(imported),
		"failed":   len(failed),
		"ids":      imported,
		"message":  "Search and import completed",
	})
}

// AutoSearchRequest 自动搜索请求
type AutoSearchRequest struct {
	Queries []string `json:"queries" binding:"required"` // 多个搜索关键词
	Tags    []string `json:"tags"`
}

// AutoSearch 批量自动搜索并导入
func (h *SearchHandler) AutoSearch(c *gin.Context) {
	var req AutoSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	totalImported := 0
	totalFailed := 0
	var allIds []string

	for _, query := range req.Queries {
		// 搜索
		result, err := h.aiService.SearchWeb(query)
		if err != nil {
			continue
		}

		// 导入
		for _, item := range result.Items {
			if item.Content == "" {
				continue
			}

			content := &models.Content{
				Source:     "web-search",
				SourceURL:  item.URL,
				Author:     item.Author,
				RawContent: item.Content,
				Tags:       req.Tags,
				Revenue:    item.Revenue,
				Status:     "raw",
			}

			if err := h.contentRepo.Create(content); err != nil {
				totalFailed++
			} else {
				totalImported++
				allIds = append(allIds, content.ID)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"imported": totalImported,
		"failed":   totalFailed,
		"ids":      allIds,
		"message":  "Auto search completed",
	})
}
