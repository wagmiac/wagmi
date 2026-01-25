package handlers

import (
	"content-engine/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// FavoriteHandler 收藏处理器
type FavoriteHandler struct {
	db *gorm.DB
}

// NewFavoriteHandler 创建处理器
func NewFavoriteHandler(db *gorm.DB) *FavoriteHandler {
	return &FavoriteHandler{db: db}
}

// List 获取用户的收藏列表
func (h *FavoriteHandler) List(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	var favorites []models.Favorite
	if err := h.db.Where("user_id = ?", userID).
		Preload("Content").
		Order("created_at desc").
		Find(&favorites).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    favorites,
	})
}

// AddFavoriteRequest 添加收藏请求
type AddFavoriteRequest struct {
	ContentID string `json:"content_id" binding:"required"`
	Note      string `json:"note"`
}

// Add 添加收藏
func (h *FavoriteHandler) Add(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	var req AddFavoriteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 检查内容是否存在
	var content models.Content
	if err := h.db.First(&content, "id = ?", req.ContentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "content not found"})
		return
	}

	// 检查是否已收藏
	var existing models.Favorite
	if err := h.db.Where("user_id = ? AND content_id = ?", userID, req.ContentID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "error": "already favorited"})
		return
	}

	// 创建收藏
	favorite := models.Favorite{
		UserID:    userID.(string),
		ContentID: req.ContentID,
		Note:      req.Note,
	}

	if err := h.db.Create(&favorite).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 加载关联数据
	h.db.Preload("Content").First(&favorite, "id = ?", favorite.ID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    favorite,
	})
}

// Remove 取消收藏
func (h *FavoriteHandler) Remove(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	contentID := c.Param("contentId")

	// 删除收藏
	result := h.db.Where("user_id = ? AND content_id = ?", userID, contentID).Delete(&models.Favorite{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": result.Error.Error()})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "favorite not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "favorite removed",
	})
}

// Check 检查是否已收藏
func (h *FavoriteHandler) Check(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"favorited": false,
			},
		})
		return
	}

	contentID := c.Param("contentId")

	var count int64
	h.db.Model(&models.Favorite{}).Where("user_id = ? AND content_id = ?", userID, contentID).Count(&count)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"favorited": count > 0,
		},
	})
}

// Count 获取内容的收藏数
func (h *FavoriteHandler) Count(c *gin.Context) {
	contentID := c.Param("contentId")

	var count int64
	h.db.Model(&models.Favorite{}).Where("content_id = ?", contentID).Count(&count)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"count": count,
		},
	})
}
