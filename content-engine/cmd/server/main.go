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

	// 清理卡住的 is_evaluating 状态（服务重启时）
	if result := db.Model(&models.Project{}).Where("is_evaluating = ?", true).Update("is_evaluating", false); result.RowsAffected > 0 {
		log.Printf("🔧 已清理 %d 个卡住的评估状态", result.RowsAffected)
	}

	// 初始化各层
	contentRepo := repository.NewContentRepository(db)
	tagRepo := repository.NewTagRepository(db)
	settingRepo := repository.NewSettingRepository(db)

	aiService := services.NewAIService(cfg, settingRepo)
	contentService := services.NewContentService(contentRepo, aiService)

	// 评估器相关服务
	phService := services.NewPHService(cfg, db)
	evaluatorService := services.NewEvaluatorService(cfg, db, phService, aiService, settingRepo)
	paymentService := services.NewPaymentService(cfg, db)

	// 初始化定时任务调度器
	scheduler := services.NewScheduler(cfg, db, aiService)
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

	// 评估器处理器
	evaluatorHandler := handlers.NewEvaluatorHandler(evaluatorService, paymentService, phService)
	promoHandler := handlers.NewPromoHandler(paymentService)

	// 发射服务
	launchService := services.NewLaunchService(cfg, db)
	launchHandler := handlers.NewLaunchHandler(launchService, db)

	// IMO 评估服务
	imoEvaluationService := services.NewIMOEvaluationService(cfg, db, aiService, settingRepo)

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

			// 优惠码管理（管理员）
			promo := admin.Group("/admin/promo")
			{
				promo.GET("", promoHandler.ListPromoCodes)                                  // 获取优惠码列表
				promo.POST("", promoHandler.CreatePromoCode)                                // 创建优惠码
				promo.POST("/batch", promoHandler.BatchCreatePromoCode)                     // 批量创建优惠码
				promo.DELETE("/:id", promoHandler.DeletePromoCode)                          // 删除优惠码
				promo.POST("/gift", promoHandler.GiftCredits)                               // 赠送积分
				promo.GET("/users/:user_id/credits", promoHandler.GetUserCredits)           // 查看用户积分
				promo.GET("/users/:user_id/transactions", promoHandler.GetUserTransactions) // 查看用户交易
			}
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

		// ========== 评估器 API ==========
		evaluator := api.Group("/evaluator")
		{
			// 公开接口
			evaluator.GET("/fetch", evaluatorHandler.FetchProduct)                    // 获取 PH 产品信息
			evaluator.GET("/products/:id", evaluatorHandler.GetProduct)               // 获取产品详情
			evaluator.GET("/evaluations", evaluatorHandler.ListEvaluations)           // 获取评估列表
			evaluator.GET("/evaluations/:id", evaluatorHandler.GetEvaluation)         // 获取评估详情
			evaluator.GET("/price", evaluatorHandler.GetPrice)                        // 获取价格
			evaluator.GET("/promo/validate", evaluatorHandler.ValidatePromoCode)      // 验证优惠码
			evaluator.GET("/payment-addresses", evaluatorHandler.GetPaymentAddresses) // 获取支付地址

			// 需要登录
			evaluator.POST("/evaluate", handlers.AuthMiddleware(authService), evaluatorHandler.Evaluate)                     // 执行评估
			evaluator.GET("/credits", handlers.AuthMiddleware(authService), evaluatorHandler.GetMyCredits)                   // 获取我的积分
			evaluator.GET("/credits/transactions", handlers.AuthMiddleware(authService), evaluatorHandler.GetMyTransactions) // 积分交易记录
			evaluator.POST("/orders", handlers.AuthMiddleware(authService), evaluatorHandler.CreateOrder)                    // 创建订单
			evaluator.GET("/orders", handlers.AuthMiddleware(authService), evaluatorHandler.GetMyOrders)                     // 我的订单
			evaluator.GET("/orders/:id", handlers.AuthMiddleware(authService), evaluatorHandler.GetOrder)                    // 订单详情
			evaluator.POST("/orders/:id/confirm", handlers.AuthMiddleware(authService), evaluatorHandler.ConfirmOrder)       // 确认支付

			// 支付回调（无需认证，但需要验证签名）
			evaluator.POST("/webhook/payment", evaluatorHandler.PaymentWebhook)
		}

		// ========== IMO API ==========
		githubToken := settingRepo.GetValue("github_token")
		githubService := services.NewGitHubService(githubToken)
		imoHandler := handlers.NewIMOHandler(db, paymentService, imoEvaluationService, githubService)
		imoEvaluationHandler := handlers.NewIMOEvaluationHandler(db, imoEvaluationService)
		imo := api.Group("/imo")
		{
			// 公开接口
			imo.GET("/projects", imoHandler.ListProjects)                                   // 获取项目列表
			imo.GET("/projects/ticker/:ticker", imoHandler.GetProject)                      // 通过ticker获取项目
			imo.GET("/projects/:id", imoHandler.GetProjectByID)                             // 通过ID获取项目
			imo.GET("/projects/:id/bids", imoHandler.GetBids)                               // 获取项目出价历史
			imo.GET("/projects/:id/timeline", imoHandler.GetTimeline)                       // 获取项目时间线
			imo.GET("/projects/:id/github", imoHandler.GetProjectGitHubStats)               // 获取项目GitHub热度数据
			imo.POST("/projects/:id/github/refresh", imoHandler.RefreshProjectGitHubStats)  // 刷新项目GitHub热度数据
			imo.GET("/projects/:id/comments", imoHandler.ListProjectComments)               // 获取项目评论列表
			imo.GET("/projects/:id/evaluation", imoEvaluationHandler.GetProjectEvaluation)  // 获取项目评估
			imo.GET("/projects/:id/evaluations", imoEvaluationHandler.GetEvaluationHistory) // 获取项目评估历史
			imo.GET("/evaluations", imoEvaluationHandler.ListEvaluations)                   // 获取评估列表
			imo.GET("/evaluations/:id", imoEvaluationHandler.GetEvaluationByID)             // 获取评估详情
			imo.GET("/stats", imoHandler.GetStats)                                          // 获取统计数据
			imo.GET("/promo/validate", imoHandler.ValidatePromoCode)                        // 验证免单码

			// 钱包认证
			imo.GET("/wallet/nonce", imoHandler.GetWalletNonce) // 获取签名 nonce
			imo.POST("/wallet/verify", imoHandler.VerifyWallet) // 验证钱包签名

			// 用户相关
			imo.GET("/users/wallet/:wallet", imoHandler.GetUserByWallet)   // 通过钱包获取用户
			imo.GET("/users/:userId/projects", imoHandler.GetUserProjects) // 获取用户的项目
			imo.GET("/users/:userId/bids", imoHandler.GetUserBids)         // 获取用户的出价

			// 需要钱包认证的接口
			imoAuth := imo.Group("")
			imoAuth.Use(handlers.IMOWalletAuthMiddleware())
			{
				imoAuth.POST("/projects", imoHandler.CreateProject)                                  // 创建项目（发掘）
				imoAuth.PUT("/projects/:id", imoHandler.UpdateProject)                               // 更新项目（伯乐/创作者/管理员）
				imoAuth.POST("/projects/:id/bids", imoHandler.PlaceBid)                              // 出价
				imoAuth.POST("/projects/:id/claims", imoHandler.SubmitClaimRequest)                  // 提交认领申请
				imoAuth.POST("/projects/:id/evaluate", imoEvaluationHandler.TriggerEvaluation)       // 伯乐触发重新评估
				imoAuth.POST("/projects/:id/comments", imoHandler.CreateProjectComment)              // 创建项目评论
				imoAuth.DELETE("/projects/:id/comments/:commentId", imoHandler.DeleteProjectComment) // 删除项目评论
			}

			// 管理员接口（TODO: 添加管理员权限验证）
			imoAdmin := imo.Group("/admin")
			{
				imoAdmin.POST("/projects/:id/start-auction", imoHandler.StartAuction)                // 开始竞拍
				imoAdmin.POST("/projects/:id/end-auction", imoHandler.EndAuction)                    // 结束竞拍
				imoAdmin.POST("/projects/:id/launched", imoHandler.MarkLaunched)                     // 标记已发射
				imoAdmin.GET("/projects/:id/claims", imoHandler.GetClaimRequests)                    // 获取认领申请
				imoAdmin.POST("/claims/:claimId/approve", imoHandler.ApproveClaimRequest)            // 批准认领
				imoAdmin.POST("/projects/:id/evaluate", imoEvaluationHandler.AdminTriggerEvaluation) // 管理员触发评估

				// 发射相关
				imoAdmin.GET("/launching", launchHandler.ListLaunchingProjects)                 // 待发射项目
				imoAdmin.POST("/projects/:id/generate-wallet", launchHandler.GenerateDevWallet) // 生成Dev钱包
				imoAdmin.GET("/projects/:id/wallet", launchHandler.GetDevWallet)                // 获取Dev钱包
				imoAdmin.POST("/projects/:id/wallet/export", launchHandler.ExportDevWalletKey)  // 导出Dev钱包私钥
				imoAdmin.POST("/projects/:id/launch", launchHandler.Launch)                     // 执行发射（旧流程）
				imoAdmin.GET("/projects/:id/launch-status", launchHandler.GetLaunchStatus)      // 发射状态
				imoAdmin.POST("/projects/:id/distribute", launchHandler.DistributeRevenue)      // 分发收益
				imoAdmin.GET("/projects/:id/revenues", launchHandler.GetRevenueRecords)         // 分成记录

				// 新发射流程
				imoAdmin.POST("/projects/:id/launch-order", launchHandler.CreateLaunchOrder)        // 创建发射订单
				imoAdmin.POST("/projects/:id/launch-with-payment", launchHandler.LaunchWithPayment) // 带支付哈希的直接发射
				imoAdmin.GET("/projects/:id/launch-orders", launchHandler.GetProjectLaunchOrders)   // 获取项目发射订单列表
				imoAdmin.GET("/launch-orders/:orderId", launchHandler.GetLaunchOrder)               // 获取发射订单详情
				imoAdmin.GET("/launch-orders/:orderId/check-payment", launchHandler.CheckPayment)   // 检查支付状态
				imoAdmin.POST("/launch-orders/:orderId/execute", launchHandler.ExecuteLaunch)       // 执行发射
				imoAdmin.POST("/launch-orders/:orderId/cancel", launchHandler.CancelLaunchOrder)    // 取消订单
			}

			// 用户收益查询
			imo.GET("/revenue/:wallet", launchHandler.GetUserRevenue) // 用户收益
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
