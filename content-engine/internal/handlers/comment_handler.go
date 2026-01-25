package handlers

import (
	"content-engine/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CommentHandler 评论处理器
type CommentHandler struct {
	db *gorm.DB
}

// NewCommentHandler 创建处理器
func NewCommentHandler(db *gorm.DB) *CommentHandler {
	return &CommentHandler{db: db}
}

// ListByContent 获取内容的评论列表
func (h *CommentHandler) ListByContent(c *gin.Context) {
	contentID := c.Param("contentId")
	if contentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "content_id required"})
		return
	}

	var comments []models.Comment
	if err := h.db.Where("content_id = ? AND parent_id IS NULL", contentID).
		Preload("User").
		Order("created_at desc").
		Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 获取每条评论的回复
	var result []map[string]interface{}
	for _, comment := range comments {
		var replies []models.Comment
		h.db.Where("parent_id = ?", comment.ID).Preload("User").Order("created_at asc").Find(&replies)

		result = append(result, map[string]interface{}{
			"id":         comment.ID,
			"content":    comment.Content,
			"user":       comment.User,
			"created_at": comment.CreatedAt,
			"replies":    replies,
		})
	}

	// 获取评论总数
	var total int64
	h.db.Model(&models.Comment{}).Where("content_id = ?", contentID).Count(&total)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": result,
			"total": total,
		},
	})
}

// CreateCommentRequest 创建评论请求
type CreateCommentRequest struct {
	ContentID string  `json:"content_id" binding:"required"`
	Content   string  `json:"content" binding:"required"`
	ParentID  *string `json:"parent_id"` // 可选，回复某条评论
}

// Create 创建评论
func (h *CommentHandler) Create(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 验证内容是否存在
	var content models.Content
	if err := h.db.First(&content, "id = ?", req.ContentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "content not found"})
		return
	}

	// 如果是回复，验证父评论是否存在
	var parentComment models.Comment
	if req.ParentID != nil && *req.ParentID != "" {
		if err := h.db.First(&parentComment, "id = ?", *req.ParentID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "parent comment not found"})
			return
		}
	}

	comment := models.Comment{
		ContentID: req.ContentID,
		UserID:    userID.(string),
		Content:   req.Content,
		ParentID:  req.ParentID,
	}

	if err := h.db.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 加载用户信息
	h.db.Preload("User").First(&comment, "id = ?", comment.ID)

	// 创建通知：如果是回复，通知被回复的用户
	if req.ParentID != nil && *req.ParentID != "" && parentComment.UserID != userID.(string) {
		notification := models.Notification{
			UserID:  parentComment.UserID,
			Type:    "comment_reply",
			Title:   "收到新回复",
			Message: truncateString(req.Content, 100),
			Link:    "/insights/" + req.ContentID + "#comment-" + comment.ID,
		}
		h.db.Create(&notification)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    comment,
	})
}

// Delete 删除评论（只能删除自己的）
func (h *CommentHandler) Delete(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	commentID := c.Param("id")

	// 检查评论是否存在且属于当前用户
	var comment models.Comment
	if err := h.db.First(&comment, "id = ? AND user_id = ?", commentID, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "comment not found or not yours"})
		return
	}

	// 删除评论及其所有回复
	h.db.Where("parent_id = ?", commentID).Delete(&models.Comment{})
	h.db.Delete(&comment)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "comment deleted",
	})
}

// GetCount 获取评论数量
func (h *CommentHandler) GetCount(c *gin.Context) {
	contentID := c.Param("contentId")

	var count int64
	h.db.Model(&models.Comment{}).Where("content_id = ?", contentID).Count(&count)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"count": count,
		},
	})
}

// ListByUser 获取用户的所有评论
func (h *CommentHandler) ListByUser(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	var comments []models.Comment
	if err := h.db.Where("user_id = ?", userID).
		Preload("User").
		Order("created_at desc").
		Limit(50).
		Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 为每条评论加载对应内容的标题
	var result []map[string]interface{}
	for _, comment := range comments {
		var content models.Content
		h.db.First(&content, "id = ?", comment.ContentID)

		result = append(result, map[string]interface{}{
			"id":            comment.ID,
			"content":       comment.Content,
			"content_id":    comment.ContentID,
			"content_title": content.CoreIdea,
			"created_at":    comment.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// truncateString 截断字符串
func truncateString(s string, maxLen int) string {
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	return string(runes[:maxLen]) + "..."
}
