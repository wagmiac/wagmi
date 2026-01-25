package handlers

import (
	"content-engine/internal/models"

	"gorm.io/gorm"
)

// PointsHelper 积分助手
type PointsHelper struct {
	db           *gorm.DB
	badgeHandler *BadgeHandler
}

// NewPointsHelper 创建积分助手
func NewPointsHelper(db *gorm.DB) *PointsHelper {
	return &PointsHelper{
		db:           db,
		badgeHandler: NewBadgeHandler(db),
	}
}

// 积分规则常量
const (
	PointsComment   = 5 // 发表评论
	PointsFavorite  = 2 // 收藏内容
	PointsSubscribe = 2 // 订阅标签
	PointsView      = 1 // 浏览内容 (每10个)
	PointsSignIn    = 3 // 每日签到
)

// AwardCommentPoints 发放评论积分
func (h *PointsHelper) AwardCommentPoints(userID, commentID string) {
	points := models.UserPoints{
		UserID:  userID,
		Points:  PointsComment,
		Reason:  "发表评论",
		RefType: "comment",
		RefID:   commentID,
	}
	h.db.Create(&points)

	// 检查徽章
	h.badgeHandler.CheckAndAwardBadges(userID)
}

// AwardFavoritePoints 发放收藏积分
func (h *PointsHelper) AwardFavoritePoints(userID, contentID string) {
	// 检查是否已经获得过这个内容的收藏积分
	var existing models.UserPoints
	if h.db.Where("user_id = ? AND ref_type = ? AND ref_id = ?", userID, "favorite", contentID).First(&existing).Error == nil {
		return // 已获得过
	}

	points := models.UserPoints{
		UserID:  userID,
		Points:  PointsFavorite,
		Reason:  "收藏内容",
		RefType: "favorite",
		RefID:   contentID,
	}
	h.db.Create(&points)

	// 检查徽章
	h.badgeHandler.CheckAndAwardBadges(userID)
}

// AwardSubscribePoints 发放订阅积分
func (h *PointsHelper) AwardSubscribePoints(userID, tag string) {
	points := models.UserPoints{
		UserID:  userID,
		Points:  PointsSubscribe,
		Reason:  "订阅标签: " + tag,
		RefType: "subscribe",
		RefID:   tag,
	}
	h.db.Create(&points)

	// 检查徽章
	h.badgeHandler.CheckAndAwardBadges(userID)
}

// AwardViewMilestonePoints 发放浏览里程碑积分
func (h *PointsHelper) AwardViewMilestonePoints(userID string) {
	// 获取用户浏览数
	var viewCount int64
	h.db.Model(&models.ViewHistory{}).Where("user_id = ?", userID).Count(&viewCount)

	// 检查里程碑 (每50次给一次积分)
	milestones := []int64{50, 100, 200, 500, 1000}
	for _, milestone := range milestones {
		if viewCount == milestone {
			points := models.UserPoints{
				UserID:  userID,
				Points:  PointsView * 10,
				Reason:  "浏览里程碑: " + string(rune(milestone)) + " 篇",
				RefType: "view_milestone",
				RefID:   string(rune(milestone)),
			}
			h.db.Create(&points)
			break
		}
	}

	// 检查徽章
	h.badgeHandler.CheckAndAwardBadges(userID)
}

// CheckBadgesForUser 检查用户徽章
func (h *PointsHelper) CheckBadgesForUser(userID string) []models.Badge {
	return h.badgeHandler.CheckAndAwardBadges(userID)
}
