package handlers

import (
	"content-engine/internal/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// StatsHandler 统计处理器
type StatsHandler struct {
	db *gorm.DB
}

// NewStatsHandler 创建处理器
func NewStatsHandler(db *gorm.DB) *StatsHandler {
	return &StatsHandler{db: db}
}

// Overview 获取平台统计概览
func (h *StatsHandler) Overview(c *gin.Context) {
	var stats struct {
		TotalContents     int64 `json:"total_contents"`
		PublishedContents int64 `json:"published_contents"`
		PendingContents   int64 `json:"pending_contents"`
		TotalUsers        int64 `json:"total_users"`
		TotalComments     int64 `json:"total_comments"`
		TotalFavorites    int64 `json:"total_favorites"`
		TodayContents     int64 `json:"today_contents"`
		TodayUsers        int64 `json:"today_users"`
		TodayComments     int64 `json:"today_comments"`
	}

	today := time.Now().Truncate(24 * time.Hour)

	// 内容统计
	h.db.Model(&models.Content{}).Count(&stats.TotalContents)
	h.db.Model(&models.Content{}).Where("status = ?", "published").Count(&stats.PublishedContents)
	h.db.Model(&models.Content{}).Where("status IN ?", []string{"raw", "processed"}).Count(&stats.PendingContents)
	h.db.Model(&models.Content{}).Where("created_at >= ?", today).Count(&stats.TodayContents)

	// 用户统计
	h.db.Model(&models.User{}).Count(&stats.TotalUsers)
	h.db.Model(&models.User{}).Where("created_at >= ?", today).Count(&stats.TodayUsers)

	// 评论统计
	h.db.Model(&models.Comment{}).Count(&stats.TotalComments)
	h.db.Model(&models.Comment{}).Where("created_at >= ?", today).Count(&stats.TodayComments)

	// 收藏统计
	h.db.Model(&models.Favorite{}).Count(&stats.TotalFavorites)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// ContentTrend 获取内容发布趋势（最近30天）
func (h *StatsHandler) ContentTrend(c *gin.Context) {
	days := 30

	type DayStat struct {
		Date  string `json:"date"`
		Count int64  `json:"count"`
	}

	var results []DayStat

	// 查询最近30天每天的发布数量
	rows, err := h.db.Raw(`
		SELECT 
			DATE(created_at) as date,
			COUNT(*) as count
		FROM contents
		WHERE created_at >= NOW() - INTERVAL '? days'
			AND status = 'published'
		GROUP BY DATE(created_at)
		ORDER BY date
	`, days).Rows()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	defer rows.Close()

	dateMap := make(map[string]int64)
	for rows.Next() {
		var date time.Time
		var count int64
		rows.Scan(&date, &count)
		dateMap[date.Format("2006-01-02")] = count
	}

	// 填充完整的日期范围
	for i := days - 1; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		count := dateMap[date]
		results = append(results, DayStat{Date: date, Count: count})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    results,
	})
}

// TagDistribution 获取标签分布
func (h *StatsHandler) TagDistribution(c *gin.Context) {
	type TagStat struct {
		Tag   string `json:"tag"`
		Count int64  `json:"count"`
	}

	// 从 contents 表的 tags 字段统计
	// 注意：tags 是 JSONB 数组
	rows, err := h.db.Raw(`
		SELECT 
			tag,
			COUNT(*) as count
		FROM contents, jsonb_array_elements_text(tags) as tag
		WHERE status = 'published'
		GROUP BY tag
		ORDER BY count DESC
		LIMIT 10
	`).Rows()

	if err != nil {
		// 如果查询失败，返回空数组
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    []TagStat{},
		})
		return
	}
	defer rows.Close()

	var results []TagStat
	for rows.Next() {
		var stat TagStat
		rows.Scan(&stat.Tag, &stat.Count)
		results = append(results, stat)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    results,
	})
}

// TopContents 获取热门内容（按收藏和评论数）
func (h *StatsHandler) TopContents(c *gin.Context) {
	type TopContent struct {
		ID            string `json:"id"`
		CoreIdea      string `json:"core_idea"`
		FavoriteCount int64  `json:"favorite_count"`
		CommentCount  int64  `json:"comment_count"`
		PublishedAt   string `json:"published_at"`
	}

	rows, err := h.db.Raw(`
		SELECT 
			c.id,
			c.core_idea,
			COALESCE((SELECT COUNT(*) FROM favorites WHERE content_id = c.id), 0) as favorite_count,
			COALESCE((SELECT COUNT(*) FROM comments WHERE content_id = c.id), 0) as comment_count,
			c.published_at
		FROM contents c
		WHERE c.status = 'published'
		ORDER BY (favorite_count + comment_count) DESC
		LIMIT 10
	`).Rows()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	defer rows.Close()

	var results []TopContent
	for rows.Next() {
		var item TopContent
		var publishedAt *time.Time
		rows.Scan(&item.ID, &item.CoreIdea, &item.FavoriteCount, &item.CommentCount, &publishedAt)
		if publishedAt != nil {
			item.PublishedAt = publishedAt.Format("2006-01-02")
		}
		results = append(results, item)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    results,
	})
}

// ActiveUsers 获取活跃用户
func (h *StatsHandler) ActiveUsers(c *gin.Context) {
	type ActiveUser struct {
		ID           string `json:"id"`
		Nickname     string `json:"nickname"`
		Avatar       string `json:"avatar"`
		CommentCount int64  `json:"comment_count"`
	}

	rows, err := h.db.Raw(`
		SELECT 
			u.id,
			u.nickname,
			u.avatar,
			COUNT(c.id) as comment_count
		FROM users u
		LEFT JOIN comments c ON c.user_id = u.id
		GROUP BY u.id
		ORDER BY comment_count DESC
		LIMIT 10
	`).Rows()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	defer rows.Close()

	var results []ActiveUser
	for rows.Next() {
		var item ActiveUser
		rows.Scan(&item.ID, &item.Nickname, &item.Avatar, &item.CommentCount)
		results = append(results, item)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    results,
	})
}
