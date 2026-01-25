package handlers

import (
	"content-engine/internal/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// HistoryHandler 浏览历史处理器
type HistoryHandler struct {
	db *gorm.DB
}

// NewHistoryHandler 创建处理器
func NewHistoryHandler(db *gorm.DB) *HistoryHandler {
	return &HistoryHandler{db: db}
}

// RecordView 记录浏览历史
func (h *HistoryHandler) RecordView(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		// 未登录用户不记录
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "guest view"})
		return
	}

	contentID := c.Param("contentId")
	if contentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "content_id required"})
		return
	}

	// 检查内容是否存在
	var content models.Content
	if err := h.db.First(&content, "id = ?", contentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "content not found"})
		return
	}

	// 查找已有记录
	var existing models.ViewHistory
	result := h.db.Where("user_id = ? AND content_id = ?", userID, contentID).First(&existing)

	if result.Error == nil {
		// 更新浏览时间
		h.db.Model(&existing).Update("viewed_at", time.Now())
	} else {
		// 创建新记录
		history := models.ViewHistory{
			UserID:    userID.(string),
			ContentID: contentID,
		}
		h.db.Create(&history)
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetHistory 获取浏览历史
func (h *HistoryHandler) GetHistory(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	var histories []models.ViewHistory
	if err := h.db.Where("user_id = ?", userID).
		Preload("Content").
		Order("viewed_at DESC").
		Limit(50).
		Find(&histories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    histories,
	})
}

// ClearHistory 清空浏览历史
func (h *HistoryHandler) ClearHistory(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	h.db.Where("user_id = ?", userID).Delete(&models.ViewHistory{})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "history cleared",
	})
}

// DeleteHistoryItem 删除单条历史
func (h *HistoryHandler) DeleteHistoryItem(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	historyID := c.Param("id")

	result := h.db.Where("id = ? AND user_id = ?", historyID, userID).Delete(&models.ViewHistory{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "history not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "history item deleted",
	})
}
