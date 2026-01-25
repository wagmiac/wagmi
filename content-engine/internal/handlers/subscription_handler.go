package handlers

import (
	"content-engine/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SubscriptionHandler 订阅处理器
type SubscriptionHandler struct {
	db *gorm.DB
}

// NewSubscriptionHandler 创建处理器
func NewSubscriptionHandler(db *gorm.DB) *SubscriptionHandler {
	return &SubscriptionHandler{db: db}
}

// Subscribe 订阅标签
func (h *SubscriptionHandler) Subscribe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	tag := c.Param("tag")
	if tag == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "tag required"})
		return
	}

	// 检查是否已订阅
	var existing models.Subscription
	if err := h.db.Where("user_id = ? AND tag = ?", userID, tag).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "already subscribed"})
		return
	}

	// 创建订阅
	subscription := models.Subscription{
		UserID: userID.(string),
		Tag:    tag,
	}

	if err := h.db.Create(&subscription).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": subscription})
}

// Unsubscribe 取消订阅
func (h *SubscriptionHandler) Unsubscribe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	tag := c.Param("tag")

	result := h.db.Where("user_id = ? AND tag = ?", userID, tag).Delete(&models.Subscription{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "subscription not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "unsubscribed"})
}

// ListSubscriptions 获取用户订阅列表
func (h *SubscriptionHandler) ListSubscriptions(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	var subscriptions []models.Subscription
	if err := h.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&subscriptions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 提取标签列表
	tags := make([]string, len(subscriptions))
	for i, sub := range subscriptions {
		tags[i] = sub.Tag
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"subscriptions": subscriptions,
			"tags":          tags,
		},
	})
}

// CheckSubscription 检查是否订阅了某标签
func (h *SubscriptionHandler) CheckSubscription(c *gin.Context) {
	userID, exists := c.Get("userID")
	tag := c.Param("tag")

	if !exists {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"subscribed": false}})
		return
	}

	var count int64
	h.db.Model(&models.Subscription{}).Where("user_id = ? AND tag = ?", userID, tag).Count(&count)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"subscribed": count > 0,
		},
	})
}

// GetSubscribedContents 获取订阅标签的内容
func (h *SubscriptionHandler) GetSubscribedContents(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	// 获取用户订阅的标签
	var subscriptions []models.Subscription
	h.db.Where("user_id = ?", userID).Find(&subscriptions)

	if len(subscriptions) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"items": []models.Content{},
				"total": 0,
			},
		})
		return
	}

	// 提取标签
	tags := make([]string, len(subscriptions))
	for i, sub := range subscriptions {
		tags[i] = sub.Tag
	}

	// 查找包含任意订阅标签的内容
	var contents []models.Content
	var total int64

	query := h.db.Model(&models.Content{}).Where("status = ?", "published")

	// PostgreSQL 数组包含任一元素
	query = query.Where("tags && ?", tags)

	query.Count(&total)
	query.Order("published_at DESC").Limit(20).Find(&contents)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": contents,
			"total": total,
		},
	})
}

// GetPopularTags 获取热门标签（用于推荐订阅）
func (h *SubscriptionHandler) GetPopularTags(c *gin.Context) {
	type TagCount struct {
		Tag   string `json:"tag"`
		Count int64  `json:"count"`
	}

	var results []TagCount

	// 统计每个标签的订阅数
	h.db.Model(&models.Subscription{}).
		Select("tag, count(*) as count").
		Group("tag").
		Order("count DESC").
		Limit(20).
		Scan(&results)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    results,
	})
}
