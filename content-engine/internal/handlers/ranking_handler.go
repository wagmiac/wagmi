package handlers

import (
	"content-engine/internal/models"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RankingHandler 排行榜处理器
type RankingHandler struct {
	db *gorm.DB
}

// NewRankingHandler 创建处理器
func NewRankingHandler(db *gorm.DB) *RankingHandler {
	return &RankingHandler{db: db}
}

// ContentRanking 内容排行数据
type ContentRanking struct {
	models.Content
	FavoriteCount int64 `json:"favorite_count"`
	CommentCount  int64 `json:"comment_count"`
	ViewCount     int64 `json:"view_count"`
	Score         int64 `json:"score"` // 综合得分
}

// GetHotContents 获取热门内容（综合评分）
func (h *RankingHandler) GetHotContents(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	period := c.DefaultQuery("period", "week") // day, week, month, all

	// 计算时间范围
	var since time.Time
	switch period {
	case "day":
		since = time.Now().AddDate(0, 0, -1)
	case "week":
		since = time.Now().AddDate(0, 0, -7)
	case "month":
		since = time.Now().AddDate(0, -1, 0)
	default:
		since = time.Time{} // 所有时间
	}

	// 获取已发布内容
	var contents []models.Content
	query := h.db.Where("status = ?", "published")
	if !since.IsZero() {
		query = query.Where("published_at >= ?", since)
	}
	query.Order("published_at DESC").Limit(100).Find(&contents)

	// 计算每个内容的得分
	var rankings []ContentRanking
	for _, content := range contents {
		var favoriteCount, commentCount, viewCount int64

		h.db.Model(&models.Favorite{}).Where("content_id = ?", content.ID).Count(&favoriteCount)
		h.db.Model(&models.Comment{}).Where("content_id = ?", content.ID).Count(&commentCount)
		h.db.Model(&models.ViewHistory{}).Where("content_id = ?", content.ID).Count(&viewCount)

		// 综合得分：收藏*5 + 评论*3 + 浏览*1
		score := favoriteCount*5 + commentCount*3 + viewCount

		rankings = append(rankings, ContentRanking{
			Content:       content,
			FavoriteCount: favoriteCount,
			CommentCount:  commentCount,
			ViewCount:     viewCount,
			Score:         score,
		})
	}

	// 按得分排序
	for i := 0; i < len(rankings)-1; i++ {
		for j := i + 1; j < len(rankings); j++ {
			if rankings[j].Score > rankings[i].Score {
				rankings[i], rankings[j] = rankings[j], rankings[i]
			}
		}
	}

	// 限制返回数量
	if len(rankings) > limit {
		rankings = rankings[:limit]
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items":  rankings,
			"period": period,
		},
	})
}

// GetMostFavorited 获取收藏最多的内容
func (h *RankingHandler) GetMostFavorited(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	type Result struct {
		ContentID     string `json:"content_id"`
		FavoriteCount int64  `json:"favorite_count"`
	}

	var results []Result
	h.db.Model(&models.Favorite{}).
		Select("content_id, count(*) as favorite_count").
		Group("content_id").
		Order("favorite_count DESC").
		Limit(limit).
		Scan(&results)

	// 获取内容详情
	var rankings []ContentRanking
	for _, r := range results {
		var content models.Content
		if err := h.db.First(&content, "id = ? AND status = ?", r.ContentID, "published").Error; err == nil {
			rankings = append(rankings, ContentRanking{
				Content:       content,
				FavoriteCount: r.FavoriteCount,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    rankings,
	})
}

// GetMostCommented 获取评论最多的内容
func (h *RankingHandler) GetMostCommented(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	type Result struct {
		ContentID    string `json:"content_id"`
		CommentCount int64  `json:"comment_count"`
	}

	var results []Result
	h.db.Model(&models.Comment{}).
		Select("content_id, count(*) as comment_count").
		Group("content_id").
		Order("comment_count DESC").
		Limit(limit).
		Scan(&results)

	var rankings []ContentRanking
	for _, r := range results {
		var content models.Content
		if err := h.db.First(&content, "id = ? AND status = ?", r.ContentID, "published").Error; err == nil {
			rankings = append(rankings, ContentRanking{
				Content:      content,
				CommentCount: r.CommentCount,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    rankings,
	})
}

// GetMostViewed 获取浏览最多的内容
func (h *RankingHandler) GetMostViewed(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	type Result struct {
		ContentID string `json:"content_id"`
		ViewCount int64  `json:"view_count"`
	}

	var results []Result
	h.db.Model(&models.ViewHistory{}).
		Select("content_id, count(*) as view_count").
		Group("content_id").
		Order("view_count DESC").
		Limit(limit).
		Scan(&results)

	var rankings []ContentRanking
	for _, r := range results {
		var content models.Content
		if err := h.db.First(&content, "id = ? AND status = ?", r.ContentID, "published").Error; err == nil {
			rankings = append(rankings, ContentRanking{
				Content:   content,
				ViewCount: r.ViewCount,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    rankings,
	})
}

// GetTrendingTags 获取热门标签趋势
func (h *RankingHandler) GetTrendingTags(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	// 统计最近一周内容中出现最多的标签
	weekAgo := time.Now().AddDate(0, 0, -7)

	var contents []models.Content
	h.db.Where("status = ? AND published_at >= ?", "published", weekAgo).Find(&contents)

	// 统计标签出现次数
	tagCounts := make(map[string]int)
	for _, content := range contents {
		for _, tag := range content.Tags {
			tagCounts[tag]++
		}
	}

	// 转换为排序列表
	type TagTrend struct {
		Tag   string `json:"tag"`
		Count int    `json:"count"`
	}

	var trends []TagTrend
	for tag, count := range tagCounts {
		trends = append(trends, TagTrend{Tag: tag, Count: count})
	}

	// 排序
	for i := 0; i < len(trends)-1; i++ {
		for j := i + 1; j < len(trends); j++ {
			if trends[j].Count > trends[i].Count {
				trends[i], trends[j] = trends[j], trends[i]
			}
		}
	}

	if len(trends) > limit {
		trends = trends[:limit]
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    trends,
	})
}
