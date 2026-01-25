package handlers

import (
	"content-engine/internal/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type BadgeHandler struct {
	db *gorm.DB
}

func NewBadgeHandler(db *gorm.DB) *BadgeHandler {
	return &BadgeHandler{db: db}
}

// 获取所有徽章定义
func (h *BadgeHandler) ListBadges(c *gin.Context) {
	var badges []models.Badge
	if err := h.db.Order("category, threshold").Find(&badges).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取徽章列表失败"})
		return
	}
	c.JSON(http.StatusOK, badges)
}

// 获取用户已获得的徽章
func (h *BadgeHandler) GetUserBadges(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		// 获取当前登录用户
		if uid, exists := c.Get("user_id"); exists {
			userID = uid.(string)
		}
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	var userBadges []models.UserBadge
	if err := h.db.Preload("Badge").Where("user_id = ?", userID).Order("earned_at DESC").Find(&userBadges).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户徽章失败"})
		return
	}
	c.JSON(http.StatusOK, userBadges)
}

// 获取用户总积分
func (h *BadgeHandler) GetUserPoints(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		if uid, exists := c.Get("user_id"); exists {
			userID = uid.(string)
		}
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	var totalPoints int64
	h.db.Model(&models.UserPoints{}).Where("user_id = ?", userID).Select("COALESCE(SUM(points), 0)").Scan(&totalPoints)

	// 获取徽章数量
	var badgeCount int64
	h.db.Model(&models.UserBadge{}).Where("user_id = ?", userID).Count(&badgeCount)

	// 计算等级
	level := h.calculateLevel(int(totalPoints))

	c.JSON(http.StatusOK, gin.H{
		"total_points":      totalPoints,
		"badge_count":       badgeCount,
		"level":             level,
		"level_name":        h.getLevelName(level),
		"next_level_points": h.getNextLevelPoints(level),
	})
}

// 获取用户积分历史
func (h *BadgeHandler) GetPointsHistory(c *gin.Context) {
	var userID string
	if uid, exists := c.Get("user_id"); exists {
		userID = uid.(string)
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	var history []models.UserPoints
	if err := h.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&history).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取积分历史失败"})
		return
	}
	c.JSON(http.StatusOK, history)
}

// 检查并授予徽章 (内部调用)
func (h *BadgeHandler) CheckAndAwardBadges(userID string) []models.Badge {
	var earnedBadges []models.Badge

	// 获取用户统计
	var commentCount, favoriteCount, subscribeCount, viewCount int64
	h.db.Model(&models.Comment{}).Where("user_id = ?", userID).Count(&commentCount)
	h.db.Model(&models.Favorite{}).Where("user_id = ?", userID).Count(&favoriteCount)
	h.db.Model(&models.Subscription{}).Where("user_id = ?", userID).Count(&subscribeCount)
	h.db.Model(&models.ViewHistory{}).Where("user_id = ?", userID).Count(&viewCount)

	// 获取用户信息
	var user models.User
	h.db.First(&user, "id = ?", userID)

	// 获取所有徽章
	var badges []models.Badge
	h.db.Find(&badges)

	// 获取用户已有的徽章
	var existingBadges []models.UserBadge
	h.db.Where("user_id = ?", userID).Find(&existingBadges)
	existingMap := make(map[string]bool)
	for _, ub := range existingBadges {
		existingMap[ub.BadgeID] = true
	}

	// 检查每个徽章
	for _, badge := range badges {
		if existingMap[badge.ID] {
			continue // 已经拥有
		}

		shouldAward := false

		switch badge.ID {
		case "first_comment":
			shouldAward = commentCount >= 1
		case "active_commenter":
			shouldAward = commentCount >= 10
		case "discussion_master":
			shouldAward = commentCount >= 50
		case "first_favorite":
			shouldAward = favoriteCount >= 1
		case "collector":
			shouldAward = favoriteCount >= 20
		case "curator":
			shouldAward = favoriteCount >= 100
		case "first_subscribe":
			shouldAward = subscribeCount >= 1
		case "trend_watcher":
			shouldAward = subscribeCount >= 5
		case "explorer":
			shouldAward = viewCount >= 50
		case "knowledge_seeker":
			shouldAward = viewCount >= 200
		case "web3_pioneer":
			shouldAward = user.WalletAddress != ""
		case "social_connector":
			shouldAward = user.GoogleID != "" || user.TwitterID != ""
		case "one_month":
			shouldAward = time.Since(user.CreatedAt) >= 30*24*time.Hour
		case "early_bird":
			// 早期用户: 前1000名注册
			var userRank int64
			h.db.Model(&models.User{}).Where("created_at <= ?", user.CreatedAt).Count(&userRank)
			shouldAward = userRank <= 1000
		}

		if shouldAward {
			h.awardBadge(userID, badge)
			earnedBadges = append(earnedBadges, badge)
		}
	}

	return earnedBadges
}

// 授予徽章
func (h *BadgeHandler) awardBadge(userID string, badge models.Badge) {
	// 创建用户徽章记录
	userBadge := models.UserBadge{
		UserID:   userID,
		BadgeID:  badge.ID,
		EarnedAt: time.Now(),
	}
	if err := h.db.Create(&userBadge).Error; err != nil {
		return
	}

	// 增加积分
	points := models.UserPoints{
		UserID:  userID,
		Points:  badge.Points,
		Reason:  "获得徽章: " + badge.Name,
		RefType: "badge",
		RefID:   badge.ID,
	}
	h.db.Create(&points)

	// 发送通知
	notification := models.Notification{
		UserID:  userID,
		Type:    "badge_earned",
		Title:   "恭喜获得新徽章!",
		Message: badge.Icon + " " + badge.Name + " - " + badge.Description,
		Link:    "/profile?tab=badges",
	}
	h.db.Create(&notification)
}

// 手动触发徽章检查
func (h *BadgeHandler) CheckBadges(c *gin.Context) {
	var userID string
	if uid, exists := c.Get("user_id"); exists {
		userID = uid.(string)
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	newBadges := h.CheckAndAwardBadges(userID)
	c.JSON(http.StatusOK, gin.H{
		"new_badges": newBadges,
		"count":      len(newBadges),
	})
}

// 获取徽章排行榜
func (h *BadgeHandler) GetLeaderboard(c *gin.Context) {
	type LeaderboardEntry struct {
		UserID     string `json:"user_id"`
		Nickname   string `json:"nickname"`
		Avatar     string `json:"avatar"`
		Points     int64  `json:"points"`
		BadgeCount int64  `json:"badge_count"`
	}

	var entries []LeaderboardEntry

	// 获取积分排行
	h.db.Raw(`
		SELECT 
			u.id as user_id,
			u.nickname,
			u.avatar,
			COALESCE(SUM(p.points), 0) as points,
			COUNT(DISTINCT b.id) as badge_count
		FROM users u
		LEFT JOIN user_points p ON u.id = p.user_id
		LEFT JOIN user_badges b ON u.id = b.user_id
		GROUP BY u.id, u.nickname, u.avatar
		HAVING COALESCE(SUM(p.points), 0) > 0
		ORDER BY points DESC
		LIMIT 20
	`).Scan(&entries)

	c.JSON(http.StatusOK, entries)
}

// 计算等级
func (h *BadgeHandler) calculateLevel(points int) int {
	levels := []int{0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500, 5000}
	for i := len(levels) - 1; i >= 0; i-- {
		if points >= levels[i] {
			return i + 1
		}
	}
	return 1
}

// 获取等级名称
func (h *BadgeHandler) getLevelName(level int) string {
	names := []string{
		"", "新手探索者", "活跃学习者", "进阶用户", "资深玩家",
		"核心成员", "社区达人", "意见领袖", "超级用户", "传奇贡献者", "WAGMI大师",
	}
	if level < 1 || level > 10 {
		return "新手探索者"
	}
	return names[level]
}

// 获取下一级所需积分
func (h *BadgeHandler) getNextLevelPoints(level int) int {
	levels := []int{50, 150, 300, 500, 800, 1200, 1800, 2500, 3500, 5000, -1}
	if level < 1 || level > 10 {
		return 50
	}
	return levels[level]
}
