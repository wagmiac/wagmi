package handlers

import (
	"content-engine/internal/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// NotificationHandler 通知处理器
type NotificationHandler struct {
	db *gorm.DB
}

// NewNotificationHandler 创建处理器
func NewNotificationHandler(db *gorm.DB) *NotificationHandler {
	return &NotificationHandler{db: db}
}

// List 获取用户的通知列表
func (h *NotificationHandler) List(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	var notifications []models.Notification
	if err := h.db.Where("user_id = ?", userID).
		Order("created_at desc").
		Limit(50).
		Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    notifications,
	})
}

// UnreadCount 获取未读通知数量
func (h *NotificationHandler) UnreadCount(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"count": 0,
			},
		})
		return
	}

	var count int64
	h.db.Model(&models.Notification{}).Where("user_id = ? AND read = ?", userID, false).Count(&count)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"count": count,
		},
	})
}

// MarkRead 标记通知为已读
func (h *NotificationHandler) MarkRead(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	notificationID := c.Param("id")

	h.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", notificationID, userID).
		Update("read", true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "notification marked as read",
	})
}

// MarkAllRead 标记所有通知为已读
func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	h.db.Model(&models.Notification{}).
		Where("user_id = ? AND read = ?", userID, false).
		Update("read", true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "all notifications marked as read",
	})
}

// Delete 删除通知
func (h *NotificationHandler) Delete(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	notificationID := c.Param("id")

	result := h.db.Where("id = ? AND user_id = ?", notificationID, userID).Delete(&models.Notification{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "notification not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "notification deleted",
	})
}

// CreateNotification 创建通知（内部方法）
func CreateNotification(db *gorm.DB, userID, notifType, title, message, link string) error {
	notification := models.Notification{
		UserID:  userID,
		Type:    notifType,
		Title:   title,
		Message: message,
		Link:    link,
		Read:    false,
	}
	return db.Create(&notification).Error
}

// NotifyCommentReply 通知评论被回复
func NotifyCommentReply(db *gorm.DB, originalCommentUserID, replierName, contentID string) {
	CreateNotification(
		db,
		originalCommentUserID,
		"comment_reply",
		"新的回复",
		replierName+" 回复了你的评论",
		"/insights/"+contentID,
	)
}

// NotifyNewFavorite 通知内容被收藏（如果有作者概念的话）
func NotifyNewFavorite(db *gorm.DB, contentAuthorID, favoritersName, contentID string) {
	CreateNotification(
		db,
		contentAuthorID,
		"new_favorite",
		"有人收藏了你的内容",
		favoritersName+" 收藏了你的洞见",
		"/insights/"+contentID,
	)
}

// NotifySystemMessage 发送系统通知
func NotifySystemMessage(db *gorm.DB, userID, title, message string) {
	CreateNotification(
		db,
		userID,
		"system",
		title,
		message,
		"",
	)
}

// BroadcastNotification 向所有用户发送通知
func BroadcastNotification(db *gorm.DB, title, message, link string) {
	var users []models.User
	db.Find(&users)

	for _, user := range users {
		CreateNotification(db, user.ID, "broadcast", title, message, link)
	}
}

// CleanOldNotifications 清理旧通知（超过30天）
func CleanOldNotifications(db *gorm.DB) {
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	db.Where("created_at < ?", thirtyDaysAgo).Delete(&models.Notification{})
}
