package main

import (
	"content-engine/internal/config"
	"content-engine/internal/handlers"
	"content-engine/internal/models"
	"content-engine/internal/repository"
	"content-engine/internal/services"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 连接数据库
	db, err := models.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	// 自动迁移
	if err := models.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// 初始化各层
	contentRepo := repository.NewContentRepository(db)
	tagRepo := repository.NewTagRepository(db)
	settingRepo := repository.NewSettingRepository(db)

	aiService := services.NewAIService(cfg, settingRepo)
	contentService := services.NewContentService(contentRepo, aiService)

	// 初始化定时任务调度器
	scheduler := services.NewScheduler(db, aiService)
	if err := scheduler.Start(); err != nil {
		log.Printf("⚠️ 调度器启动失败: %v", err)
	}

	// 优雅关闭
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan
		log.Println("正在关闭服务...")
		scheduler.Stop()
		os.Exit(0)
	}()

	contentHandler := handlers.NewContentHandler(contentService, db)
	tagHandler := handlers.NewTagHandler(tagRepo)
	settingHandler := handlers.NewSettingHandler(settingRepo)
	processHandler := handlers.NewProcessHandler(contentService)
	searchHandler := handlers.NewSearchHandler(aiService, contentRepo)
	searchConfigHandler := handlers.NewSearchConfigHandler(db, scheduler, aiService)

	// 认证和评论
	authService := services.NewAuthService(db, cfg)
	authHandler := handlers.NewAuthHandler(authService)
	commentHandler := handlers.NewCommentHandler(db)
	oauthHandler := handlers.NewOAuthHandler(authService, cfg)
	favoriteHandler := handlers.NewFavoriteHandler(db)
	statsHandler := handlers.NewStatsHandler(db)
	notificationHandler := handlers.NewNotificationHandler(db)
	historyHandler := handlers.NewHistoryHandler(db)
	subscriptionHandler := handlers.NewSubscriptionHandler(db)
	rankingHandler := handlers.NewRankingHandler(db)
	badgeHandler := handlers.NewBadgeHandler(db)

	// 代币管理
	tokenHandler := handlers.NewTokenHandler(db)

	// 设置 Gin 模式
	if cfg.GinMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建路由
	r := gin.Default()

	// CORS 配置
	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// API 路由
	api := r.Group("/api")
	{
		// ========== 管理员路由（需要认证）==========
		admin := api.Group("")
		admin.Use(handlers.AuthMiddleware(authService), handlers.AdminMiddleware(authService))
		{
			// 内容管理
			contents := admin.Group("/contents")
			{
				contents.POST("", contentHandler.Create)
				contents.PUT("/:id", contentHandler.Update)
				contents.DELETE("/:id", contentHandler.Delete)
				contents.POST("/:id/approve", contentHandler.Approve)
				contents.POST("/:id/reject", contentHandler.Reject)
				contents.POST("/:id/publish", contentHandler.Publish)
			}

			// AI 加工
			admin.POST("/process/:id", processHandler.Process)
			admin.POST("/process/batch", processHandler.BatchProcess)

			// Grok 4 x_search 自动搜索
			search := admin.Group("/search")
			{
				search.POST("", searchHandler.Search)                 // 搜索 Twitter
				search.POST("/import", searchHandler.SearchAndImport) // 搜索并导入
				search.POST("/auto", searchHandler.AutoSearch)        // 批量自动搜索
			}

			// 搜索配置管理 (定时任务)
			searchConfigs := admin.Group("/search-configs")
			{
				searchConfigs.GET("", searchConfigHandler.List)            // 获取所有配置
				searchConfigs.POST("", searchConfigHandler.Create)         // 创建配置
				searchConfigs.PUT("/:id", searchConfigHandler.Update)      // 更新配置
				searchConfigs.DELETE("/:id", searchConfigHandler.Delete)   // 删除配置
				searchConfigs.POST("/:id/run", searchConfigHandler.RunNow) // 立即执行
				searchConfigs.GET("/status", searchConfigHandler.Status)   // 调度器状态
				searchConfigs.POST("/expand", searchConfigHandler.Expand)  // AI 扩展关键词
			}

			// 标签管理
			tags := admin.Group("/tags")
			{
				tags.POST("", tagHandler.Create)
				tags.DELETE("/:id", tagHandler.Delete)
			}

			// 系统配置
			settings := admin.Group("/settings")
			{
				settings.GET("", settingHandler.List)
				settings.PUT("/:key", settingHandler.Update)
			}

			// 代币管理（管理员）- 已移至公开路由区域（开发测试用）
			// TODO: 生产环境需要恢复认证
			// adminTokens := admin.Group("/admin/tokens")
			// {
			// 	adminTokens.GET("", tokenHandler.AdminGetAllTokens)         // 获取所有代币
			// 	adminTokens.GET("/:id", tokenHandler.AdminGetTokenByID)     // 获取代币详情
			// 	adminTokens.POST("", tokenHandler.CreateToken)              // 创建代币
			// 	adminTokens.PATCH("/:id", tokenHandler.UpdateToken)         // 更新代币
			// 	adminTokens.DELETE("/:id", tokenHandler.DeleteToken)        // 删除代币
			// 	adminTokens.POST("/:id/publish", tokenHandler.PublishToken) // 发布代币
			// }
		}

		// ========== 公开路由（无需认证）==========
		// 内容查询（公开）
		api.GET("/contents", contentHandler.List)
		api.GET("/contents/:id", contentHandler.Get)
		api.GET("/contents/slug/:slug", contentHandler.GetBySlug) // 通过 slug 获取

		// 标签查询（公开）
		api.GET("/tags", tagHandler.List)

		// 统计数据
		api.GET("/stats", contentHandler.Stats)

		// 公开 API（供网站使用）
		api.GET("/public/contents", contentHandler.PublicList)

		// 认证 API
		auth := api.Group("/auth")
		{
			auth.POST("/google", authHandler.GoogleLogin)                                         // Google 登录（直接传用户信息）
			auth.POST("/twitter", authHandler.TwitterLogin)                                       // Twitter 登录（直接传用户信息）
			auth.POST("/wallet", authHandler.WalletLogin)                                         // 钱包登录
			auth.GET("/nonce", authHandler.GetNonce)                                              // 获取签名 nonce
			auth.GET("/me", handlers.AuthMiddleware(authService), authHandler.GetMe)              // 获取当前用户
			auth.PUT("/profile", handlers.AuthMiddleware(authService), authHandler.UpdateProfile) // 更新资料

			// OAuth 流程
			auth.GET("/google/url", oauthHandler.GoogleAuthURL)         // 获取 Google OAuth URL
			auth.GET("/google/callback", oauthHandler.GoogleCallback)   // Google OAuth 回调
			auth.GET("/twitter/url", oauthHandler.TwitterAuthURL)       // 获取 Twitter OAuth URL
			auth.GET("/twitter/callback", oauthHandler.TwitterCallback) // Twitter OAuth 回调
		}

		// 评论 API
		comments := api.Group("/comments")
		{
			comments.GET("/content/:contentId", commentHandler.ListByContent)                      // 获取内容的评论
			comments.GET("/count/:contentId", commentHandler.GetCount)                             // 获取评论数量
			comments.GET("/user", handlers.AuthMiddleware(authService), commentHandler.ListByUser) // 获取用户的评论
			comments.POST("", handlers.AuthMiddleware(authService), commentHandler.Create)         // 创建评论
			comments.DELETE("/:id", handlers.AuthMiddleware(authService), commentHandler.Delete)   // 删除评论
		}

		// 收藏 API
		favorites := api.Group("/favorites")
		{
			favorites.GET("", handlers.AuthMiddleware(authService), favoriteHandler.List)                 // 获取收藏列表
			favorites.POST("", handlers.AuthMiddleware(authService), favoriteHandler.Add)                 // 添加收藏
			favorites.DELETE("/:contentId", handlers.AuthMiddleware(authService), favoriteHandler.Remove) // 取消收藏
			favorites.GET("/check/:contentId", favoriteHandler.Check)                                     // 检查是否已收藏
			favorites.GET("/count/:contentId", favoriteHandler.Count)                                     // 获取收藏数
		}

		// 统计 API
		stats := api.Group("/stats")
		{
			stats.GET("/overview", statsHandler.Overview)                // 统计概览
			stats.GET("/content-trend", statsHandler.ContentTrend)       // 内容趋势
			stats.GET("/tag-distribution", statsHandler.TagDistribution) // 标签分布
			stats.GET("/top-contents", statsHandler.TopContents)         // 热门内容
			stats.GET("/active-users", statsHandler.ActiveUsers)         // 活跃用户
		}

		// 通知 API
		notifications := api.Group("/notifications")
		{
			notifications.GET("", handlers.AuthMiddleware(authService), notificationHandler.List)                       // 获取通知列表
			notifications.GET("/unread", handlers.OptionalAuthMiddleware(authService), notificationHandler.UnreadCount) // 获取未读数量
			notifications.PUT("/read/:id", handlers.AuthMiddleware(authService), notificationHandler.MarkRead)          // 标记已读
			notifications.PUT("/read-all", handlers.AuthMiddleware(authService), notificationHandler.MarkAllRead)       // 标记全部已读
			notifications.DELETE("/:id", handlers.AuthMiddleware(authService), notificationHandler.Delete)              // 删除通知
		}

		// 浏览历史 API
		history := api.Group("/history")
		{
			history.POST("/view/:contentId", handlers.OptionalAuthMiddleware(authService), historyHandler.RecordView) // 记录浏览
			history.GET("", handlers.AuthMiddleware(authService), historyHandler.GetHistory)                          // 获取历史
			history.DELETE("", handlers.AuthMiddleware(authService), historyHandler.ClearHistory)                     // 清空历史
			history.DELETE("/:id", handlers.AuthMiddleware(authService), historyHandler.DeleteHistoryItem)            // 删除单条
		}

		// 订阅 API
		subscriptions := api.Group("/subscriptions")
		{
			subscriptions.GET("", handlers.AuthMiddleware(authService), subscriptionHandler.ListSubscriptions)                    // 获取订阅列表
			subscriptions.POST("/:tag", handlers.AuthMiddleware(authService), subscriptionHandler.Subscribe)                      // 订阅标签
			subscriptions.DELETE("/:tag", handlers.AuthMiddleware(authService), subscriptionHandler.Unsubscribe)                  // 取消订阅
			subscriptions.GET("/check/:tag", handlers.OptionalAuthMiddleware(authService), subscriptionHandler.CheckSubscription) // 检查订阅
			subscriptions.GET("/feed", handlers.AuthMiddleware(authService), subscriptionHandler.GetSubscribedContents)           // 订阅内容
			subscriptions.GET("/popular-tags", subscriptionHandler.GetPopularTags)                                                // 热门标签
		}

		// 排行榜 API
		ranking := api.Group("/ranking")
		{
			ranking.GET("/hot", rankingHandler.GetHotContents)            // 热门内容（综合）
			ranking.GET("/favorites", rankingHandler.GetMostFavorited)    // 收藏榜
			ranking.GET("/comments", rankingHandler.GetMostCommented)     // 评论榜
			ranking.GET("/views", rankingHandler.GetMostViewed)           // 浏览榜
			ranking.GET("/trending-tags", rankingHandler.GetTrendingTags) // 热门标签趋势
		}

		// 徽章和积分 API
		badges := api.Group("/badges")
		{
			badges.GET("", badgeHandler.ListBadges)                                                     // 获取所有徽章
			badges.GET("/user", handlers.AuthMiddleware(authService), badgeHandler.GetUserBadges)       // 获取我的徽章
			badges.GET("/user/:user_id", badgeHandler.GetUserBadges)                                    // 获取用户徽章
			badges.GET("/points", handlers.AuthMiddleware(authService), badgeHandler.GetUserPoints)     // 获取我的积分
			badges.GET("/points/:user_id", badgeHandler.GetUserPoints)                                  // 获取用户积分
			badges.GET("/history", handlers.AuthMiddleware(authService), badgeHandler.GetPointsHistory) // 积分历史
			badges.POST("/check", handlers.AuthMiddleware(authService), badgeHandler.CheckBadges)       // 检查新徽章
			badges.GET("/leaderboard", badgeHandler.GetLeaderboard)                                     // 积分排行榜
		}

		// 相关内容 API
		api.GET("/contents/:id/related", contentHandler.GetRelated) // 获取相关内容

		// 代币 API（公开）
		tokens := api.Group("/tokens")
		{
			tokens.GET("", tokenHandler.GetPublishedTokens) // 获取已发布的代币
			tokens.GET("/:id", tokenHandler.GetTokenByID)   // 获取代币详情
		}

		// 代币管理 API（临时公开，开发测试用）
		// TODO: 生产环境需要移回 admin 路由组
		adminTokensPublic := api.Group("/admin/tokens")
		{
			adminTokensPublic.GET("", tokenHandler.AdminGetAllTokens)         // 获取所有代币
			adminTokensPublic.GET("/:id", tokenHandler.AdminGetTokenByID)     // 获取代币详情
			adminTokensPublic.POST("", tokenHandler.CreateToken)              // 创建代币
			adminTokensPublic.PATCH("/:id", tokenHandler.UpdateToken)         // 更新代币
			adminTokensPublic.DELETE("/:id", tokenHandler.DeleteToken)        // 删除代币
			adminTokensPublic.POST("/:id/publish", tokenHandler.PublishToken) // 发布代币
			adminTokensPublic.POST("/upload", tokenHandler.UploadTokenLogo)   // 上传代币图标
		}
	}

	// 静态文件服务（上传的文件）
	r.Static("/uploads", "./uploads")

	// 启动服务
	log.Printf("Server starting on port %s...", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
