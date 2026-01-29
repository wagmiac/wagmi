package handlers

import (
	"content-engine/internal/models"
	"content-engine/internal/services"
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type IMOHandler struct {
	db                *gorm.DB
	paymentService    *services.PaymentService
	evaluationService *services.IMOEvaluationService
	githubService     *services.GitHubService
}

func NewIMOHandler(db *gorm.DB, paymentService *services.PaymentService, evaluationService *services.IMOEvaluationService, githubService *services.GitHubService) *IMOHandler {
	return &IMOHandler{
		db:                db,
		paymentService:    paymentService,
		evaluationService: evaluationService,
		githubService:     githubService,
	}
}

// ========== 项目相关 ==========

// ListProjects 获取项目列表
func (h *IMOHandler) ListProjects(c *gin.Context) {
	var projects []models.Project

	query := h.db.Model(&models.Project{})

	// 状态筛选
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// 链筛选
	if chain := c.Query("chain"); chain != "" {
		query = query.Where("chain = ?", chain)
	}

	// 发射台筛选
	if launchpad := c.Query("launchpad"); launchpad != "" {
		query = query.Where("launchpad = ?", launchpad)
	}

	// 分页
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	// 获取总数
	var total int64
	query.Count(&total)

	// 排序：竞拍中的按结束时间升序，其他按创建时间降序
	orderBy := c.DefaultQuery("order", "created_at desc")
	if c.Query("status") == "auctioning" {
		orderBy = "auction_ends_at asc"
	}

	if err := query.Order(orderBy).Offset(offset).Limit(limit).Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 调试：打印每个项目的 scout_wallet
	for _, p := range projects {
		log.Printf("Project: ticker=%s, scout_wallet=%s, status=%s", p.Ticker, p.ScoutWallet, p.Status)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    projects,
		"meta": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetProject 获取单个项目
func (h *IMOHandler) GetProject(c *gin.Context) {
	ticker := strings.ToUpper(c.Param("ticker"))

	var project models.Project
	if err := h.db.Where("ticker = ?", ticker).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": project})
}

// GetProjectByID 通过ID获取项目
func (h *IMOHandler) GetProjectByID(c *gin.Context) {
	id := c.Param("id")

	var project models.Project
	if err := h.db.First(&project, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": project})
}

// GetProjectGitHubStats 获取项目的GitHub热度数据
func (h *IMOHandler) GetProjectGitHubStats(c *gin.Context) {
	id := c.Param("id")

	var project models.Project
	if err := h.db.First(&project, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	if project.Github == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    nil,
			"message": "No GitHub URL provided",
		})
		return
	}

	// 如果数据库中已有 GitHub 数据，直接返回
	if project.GithubUpdatedAt != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"stars":               project.GithubStars,
				"forks":               project.GithubForks,
				"contributors":        project.GithubContributors,
				"hot_level":           project.GithubHotLevel,
				"hot_reason":          project.GithubHotReason,
				"stars_per_day":       project.GithubStarsPerDay,
				"days_since_creation": project.GithubDaysCreated,
				"last_commit_days":    project.GithubLastCommit,
			},
		})
		return
	}

	// 否则调用 GitHub API 获取数据
	stats, err := h.githubService.GetRepoStats(project.Github)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"error":   err.Error(),
			"data":    nil,
		})
		return
	}

	// 保存到数据库
	now := time.Now()
	h.db.Model(&project).Updates(map[string]interface{}{
		"github_stars":         stats.Stars,
		"github_forks":         stats.Forks,
		"github_contributors":  stats.Contributors,
		"github_hot_level":     stats.HotLevel,
		"github_hot_reason":    stats.HotReason,
		"github_stars_per_day": stats.StarsPerDay,
		"github_days_created":  stats.DaysSinceCreated,
		"github_last_commit":   stats.DaysSincePushed,
		"github_updated_at":    now,
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"stars":               stats.Stars,
			"forks":               stats.Forks,
			"contributors":        stats.Contributors,
			"hot_level":           stats.HotLevel,
			"hot_reason":          stats.HotReason,
			"stars_per_day":       stats.StarsPerDay,
			"days_since_creation": stats.DaysSinceCreated,
			"last_commit_days":    stats.DaysSincePushed,
		},
	})
}

// RefreshProjectGitHubStats 刷新项目的GitHub热度数据（强制从API获取）
func (h *IMOHandler) RefreshProjectGitHubStats(c *gin.Context) {
	id := c.Param("id")

	var project models.Project
	if err := h.db.First(&project, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	if project.Github == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    nil,
			"message": "No GitHub URL provided",
		})
		return
	}

	// 强制调用 GitHub API 获取数据
	stats, err := h.githubService.GetRepoStats(project.Github)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"error":   err.Error(),
			"data":    nil,
		})
		return
	}

	// 保存到数据库
	now := time.Now()
	h.db.Model(&project).Updates(map[string]interface{}{
		"github_stars":         stats.Stars,
		"github_forks":         stats.Forks,
		"github_contributors":  stats.Contributors,
		"github_hot_level":     stats.HotLevel,
		"github_hot_reason":    stats.HotReason,
		"github_stars_per_day": stats.StarsPerDay,
		"github_days_created":  stats.DaysSinceCreated,
		"github_last_commit":   stats.DaysSincePushed,
		"github_updated_at":    now,
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"stars":               stats.Stars,
			"forks":               stats.Forks,
			"contributors":        stats.Contributors,
			"hot_level":           stats.HotLevel,
			"hot_reason":          stats.HotReason,
			"stars_per_day":       stats.StarsPerDay,
			"days_since_creation": stats.DaysSinceCreated,
			"last_commit_days":    stats.DaysSincePushed,
		},
	})
}

// CreateProjectRequest 创建项目请求
type CreateProjectRequest struct {
	Name        string `json:"name" binding:"required"`
	Ticker      string `json:"ticker" binding:"required"`
	Chain       string `json:"chain"`     // 可选，发掘时不需要选链
	Launchpad   string `json:"launchpad"` // 可选，发掘时不需要选发射台
	Logo        string `json:"logo"`
	Description string `json:"description"`
	Twitter     string `json:"twitter"`
	Telegram    string `json:"telegram"` // Telegram 链接
	Github      string `json:"github"`
	Website     string `json:"website"`
	ProductHunt string `json:"productHunt"` // Product Hunt 链接
	Discord     string `json:"discord"`     // Discord 链接
	Reddit      string `json:"reddit"`      // Reddit 链接
	// 支付信息（二选一：支付交易哈希 或 免单码）
	PaymentTxHash string `json:"paymentTxHash"`
	PayerAddress  string `json:"payerAddress"`
	PromoCode     string `json:"promoCode"` // 免单码
}

// CreateProject 创建项目（发掘）
func (h *IMOHandler) CreateProject(c *gin.Context) {
	// 获取当前用户钱包
	wallet, exists := c.Get("wallet")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Unauthorized"})
		return
	}

	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 验证支付方式：必须提供交易哈希或免单码
	usedPromoCode := false
	if req.PromoCode != "" {
		// 使用免单码
		if h.paymentService == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Payment service not available"})
			return
		}
		promoCode, err := h.paymentService.ValidatePromoCode(req.PromoCode)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "免单码无效: " + err.Error()})
			return
		}
		// 检查是否是免单类型
		if promoCode.Type != models.PromoCodeTypeFree {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "此优惠码不是免单码"})
			return
		}
		usedPromoCode = true
	} else if req.PaymentTxHash == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请提供支付交易哈希或免单码"})
		return
	}

	// 如果使用交易哈希，检查是否已被使用
	if req.PaymentTxHash != "" {
		var existingProject models.Project
		if err := h.db.Where("discover_tx_hash = ?", req.PaymentTxHash).First(&existingProject).Error; err == nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Payment transaction already used"})
			return
		}
	}

	// 检查 ticker 是否已存在
	ticker := strings.ToUpper(req.Ticker)
	var count int64
	h.db.Model(&models.Project{}).Where("ticker = ?", ticker).Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Ticker already exists"})
		return
	}

	// 获取用户ID
	var user models.IMOUser
	if err := h.db.Where("wallet = ?", wallet).First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "User not found"})
		return
	}

	// 创建项目
	project := models.Project{
		Name:           req.Name,
		Ticker:         ticker,
		Chain:          models.Chain(req.Chain),         // 可能为空，后续首单时选择
		Launchpad:      models.Launchpad(req.Launchpad), // 可能为空，后续首单时选择
		Status:         models.ProjectStatusDiscovering,
		ScoutID:        user.ID,
		ScoutWallet:    wallet.(string),
		Logo:           req.Logo,
		Description:    req.Description,
		Twitter:        req.Twitter,
		Telegram:       req.Telegram,
		Github:         req.Github,
		Website:        req.Website,
		ProductHunt:    req.ProductHunt,
		Discord:        req.Discord,
		Reddit:         req.Reddit,
		DiscoverTxHash: req.PaymentTxHash, // 发掘支付交易哈希
	}

	// 如果使用免单码，标记为免单
	if usedPromoCode {
		project.DiscoverTxHash = "PROMO:" + req.PromoCode
	}

	if err := h.db.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 如果使用了免单码，标记为已使用
	if usedPromoCode {
		if err := h.paymentService.UsePromoCode(req.PromoCode, user.ID); err != nil {
			// 记录错误但不影响项目创建
			// TODO: 可以考虑回滚项目创建
		}
	}

	// 更新用户统计
	h.db.Model(&user).Update("projects_discovered", gorm.Expr("projects_discovered + 1"))

	// 创建时间线事件
	eventData := models.JSONMap{"ticker": ticker}
	if req.Chain != "" {
		eventData["chain"] = req.Chain
	}
	event := models.TimelineEvent{
		ProjectID: project.ID,
		Type:      models.TimelineEventDiscovered,
		Actor:     wallet.(string),
		Data:      eventData,
	}
	h.db.Create(&event)

	// 自动触发AI评估（异步执行，不阻塞返回）
	if h.evaluationService != nil {
		go func(projectID string, scoutID string) {
			_, err := h.evaluationService.EvaluateProject(projectID, "system", &scoutID)
			if err != nil {
				// 记录错误但不影响项目创建
				// TODO: 添加日志记录
			}
		}(project.ID, user.ID)
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": project})
}

// UpdateProjectRequest 更新项目请求
type UpdateProjectRequest struct {
	Name        *string `json:"name"`
	Logo        *string `json:"logo"`
	Description *string `json:"description"`
	Twitter     *string `json:"twitter"`
	Telegram    *string `json:"telegram"`
	Github      *string `json:"github"`
	Website     *string `json:"website"`
	ProductHunt *string `json:"productHunt"`
	Discord     *string `json:"discord"`
	Reddit      *string `json:"reddit"`
}

// UpdateProject 更新项目信息（伯乐/创作者/管理员）
// @Summary 更新项目信息
// @Tags IMO
// @Param id path string true "Project ID"
// @Param body body UpdateProjectRequest true "Project data"
// @Success 200 {object} object
// @Router /api/imo/projects/:id [put]
func (h *IMOHandler) UpdateProject(c *gin.Context) {
	// 获取当前用户钱包
	wallet, exists := c.Get("wallet")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Unauthorized"})
		return
	}

	projectID := c.Param("id")

	// 获取项目
	var project models.Project
	if err := h.db.First(&project, "id = ?", projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	// 权限验证：伯乐、创作者或管理员可以编辑
	walletStr := wallet.(string)
	isScout := project.ScoutWallet == walletStr
	isCreator := project.CreatorWallet == walletStr
	isAdmin := isAdminWallet(walletStr)

	if !isScout && !isCreator && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "您没有权限编辑此项目"})
		return
	}

	var req UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 更新字段（只更新非空字段）
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Logo != nil {
		updates["logo"] = *req.Logo
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Twitter != nil {
		updates["twitter"] = *req.Twitter
	}
	if req.Telegram != nil {
		updates["telegram"] = *req.Telegram
	}
	if req.Github != nil {
		updates["github"] = *req.Github
	}
	if req.Website != nil {
		updates["website"] = *req.Website
	}
	if req.ProductHunt != nil {
		updates["product_hunt"] = *req.ProductHunt
	}
	if req.Discord != nil {
		updates["discord"] = *req.Discord
	}
	if req.Reddit != nil {
		updates["reddit"] = *req.Reddit
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "No fields to update"})
		return
	}

	if err := h.db.Model(&project).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 重新加载项目
	h.db.First(&project, "id = ?", projectID)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": project})
}

// isAdminWallet 检查是否为管理员钱包
func isAdminWallet(wallet string) bool {
	adminWallets := os.Getenv("ADMIN_WALLETS")
	if adminWallets == "" {
		return false
	}
	for _, w := range strings.Split(adminWallets, ",") {
		if strings.TrimSpace(w) == wallet {
			return true
		}
	}
	return false
}

// ValidatePromoCode 验证免单码
// @Summary 验证免单码
// @Tags IMO
// @Param code query string true "Promo code"
// @Success 200 {object} object
// @Router /api/imo/promo/validate [get]
func (h *IMOHandler) ValidatePromoCode(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "code is required"})
		return
	}

	if h.paymentService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Payment service not available"})
		return
	}

	promoCode, err := h.paymentService.ValidatePromoCode(code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 只接受免单类型的码
	if promoCode.Type != models.PromoCodeTypeFree {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "此优惠码不是免单码"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"valid":       true,
		"code":        promoCode.Code,
		"description": "免费发掘",
		"expires_at":  promoCode.ExpiresAt,
	})
}

// StartAuction 开始竞拍
func (h *IMOHandler) StartAuction(c *gin.Context) {
	id := c.Param("id")

	var project models.Project
	if err := h.db.First(&project, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	if project.Status != models.ProjectStatusDiscovering {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Project is not in discovering status"})
		return
	}

	now := time.Now()
	endTime := now.Add(1 * time.Hour) // 初始1小时倒计时

	project.Status = models.ProjectStatusAuctioning
	project.AuctionStartedAt = &now
	project.AuctionEndsAt = &endTime
	project.AuctionExtensions = 0

	if err := h.db.Save(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": project})
}

// ========== 竞拍相关 ==========

// PlaceBidRequest 出价请求
type PlaceBidRequest struct {
	Amount   float64 `json:"amount" binding:"required,gt=0"`
	TxHash   string  `json:"txHash" binding:"required"`
	Currency string  `json:"currency" binding:"required,oneof=SOL BNB"`
}

// PlaceBid 出价
func (h *IMOHandler) PlaceBid(c *gin.Context) {
	projectID := c.Param("id")

	// 获取当前用户钱包
	wallet, exists := c.Get("wallet")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Unauthorized"})
		return
	}

	var req PlaceBidRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 获取项目
	var project models.Project
	if err := h.db.First(&project, "id = ?", projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	// 检查状态
	if project.Status != models.ProjectStatusAuctioning {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Project is not in auction"})
		return
	}

	// 检查竞拍是否已结束
	if project.AuctionEndsAt != nil && time.Now().After(*project.AuctionEndsAt) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Auction has ended"})
		return
	}

	// 检查出价是否高于当前价
	if req.Amount <= project.CurrentBidAmount {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Bid must be higher than current bid"})
		return
	}

	// 获取用户
	var user models.IMOUser
	if err := h.db.Where("wallet = ?", wallet).First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "User not found"})
		return
	}

	// 开始事务
	tx := h.db.Begin()

	// 创建出价记录
	bid := models.Bid{
		ProjectID: project.ID,
		UserID:    user.ID,
		Bidder:    wallet.(string),
		Amount:    req.Amount,
		Currency:  req.Currency,
		TxHash:    req.TxHash,
	}

	if err := tx.Create(&bid).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 更新项目当前出价
	project.CurrentBidAmount = req.Amount
	project.CurrentBidderID = &user.ID
	project.CurrentBidder = wallet.(string)
	project.BidCount++

	// 检查是否需要延时（最后5分钟内出价）
	if project.AuctionEndsAt != nil {
		timeLeft := time.Until(*project.AuctionEndsAt)
		if timeLeft <= 5*time.Minute && project.AuctionExtensions < 6 { // 最多延长6次=30分钟
			// 延长5分钟
			newEndTime := project.AuctionEndsAt.Add(5 * time.Minute)
			project.AuctionEndsAt = &newEndTime
			project.AuctionExtensions++
		}
	}

	if err := tx.Save(&project).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 更新用户统计
	tx.Model(&user).Update("bids_placed", gorm.Expr("bids_placed + 1"))

	// 创建时间线事件
	event := models.TimelineEvent{
		ProjectID: project.ID,
		Type:      models.TimelineEventBid,
		Actor:     wallet.(string),
		Data:      models.JSONMap{"amount": req.Amount, "currency": req.Currency},
	}
	tx.Create(&event)

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"bid":     bid,
			"project": project,
		},
	})
}

// GetBids 获取项目的出价历史
func (h *IMOHandler) GetBids(c *gin.Context) {
	projectID := c.Param("id")

	var bids []models.Bid
	if err := h.db.Where("project_id = ?", projectID).Order("created_at desc").Find(&bids).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": bids})
}

// ========== 时间线相关 ==========

// GetTimeline 获取项目时间线
func (h *IMOHandler) GetTimeline(c *gin.Context) {
	projectID := c.Param("id")

	var events []models.TimelineEvent
	if err := h.db.Where("project_id = ?", projectID).Order("created_at asc").Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": events})
}

// ========== 用户相关 ==========

// GetUserByWallet 通过钱包地址获取用户
func (h *IMOHandler) GetUserByWallet(c *gin.Context) {
	wallet := c.Param("wallet")

	var user models.IMOUser
	if err := h.db.Where("wallet = ?", wallet).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": user})
}

// GetUserProjects 获取用户的项目
func (h *IMOHandler) GetUserProjects(c *gin.Context) {
	userID := c.Param("userId")

	var projects []models.Project
	query := h.db.Model(&models.Project{})

	// 判断是 UUID 还是钱包地址
	// UUID 格式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36字符，含连字符)
	// Solana 地址: 32-44 字符的 base58
	// EVM 地址: 0x + 40 hex 字符
	isUUID := len(userID) == 36 && strings.Count(userID, "-") == 4

	// 类型筛选
	projectType := c.Query("type")

	// 多钱包地址支持：如果传入了 wallets 参数，用所有地址查询
	walletsParam := c.Query("wallets")
	var walletList []string
	if walletsParam != "" {
		walletList = strings.Split(walletsParam, ",")
		// 转换为小写用于匹配
		for i, w := range walletList {
			walletList[i] = strings.ToLower(strings.TrimSpace(w))
		}
	}

	// 日志调试
	log.Printf("GetUserProjects: userID=%s, isUUID=%v, type=%s, wallets=%v", userID, isUUID, projectType, walletList)

	// 类型筛选：scouted（发掘的）或 won（赢得的）或 launched（发射的）
	if projectType == "scouted" {
		if len(walletList) > 0 {
			// 多钱包查询：匹配任意一个钱包地址
			query = query.Where("LOWER(scout_wallet) IN ?", walletList)
		} else if isUUID {
			query = query.Where("scout_id = ?", userID)
		} else {
			// 单钱包地址查询
			query = query.Where("LOWER(scout_wallet) = LOWER(?)", userID)
		}
	} else if projectType == "won" {
		if len(walletList) > 0 {
			query = query.Where("LOWER(current_bidder) IN ? AND status IN ?", walletList, []string{"launching", "launched"})
		} else if isUUID {
			query = query.Where("current_bidder_id = ? AND status IN ?", userID, []string{"launching", "launched"})
		} else {
			query = query.Where("LOWER(current_bidder) = LOWER(?) AND status IN ?", userID, []string{"launching", "launched"})
		}
	} else if projectType == "launched" {
		if len(walletList) > 0 {
			query = query.Where("(LOWER(scout_wallet) IN ? OR LOWER(current_bidder) IN ?) AND status = ?", walletList, walletList, "launched")
		} else if isUUID {
			query = query.Where("(scout_id = ? OR current_bidder_id = ?) AND status = ?", userID, userID, "launched")
		} else {
			query = query.Where("(LOWER(scout_wallet) = LOWER(?) OR LOWER(current_bidder) = LOWER(?)) AND status = ?", userID, userID, "launched")
		}
	}

	if err := query.Order("created_at desc").Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	log.Printf("GetUserProjects: found %d projects", len(projects))
	c.JSON(http.StatusOK, gin.H{"success": true, "data": projects})
}

// GetUserBids 获取用户的出价记录
func (h *IMOHandler) GetUserBids(c *gin.Context) {
	userID := c.Param("userId")

	var bids []models.Bid
	if err := h.db.Where("user_id = ?", userID).Order("created_at desc").Find(&bids).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": bids})
}

// ========== 钱包认证相关 ==========

// 存储 nonce（生产环境应使用 Redis）
var nonceStore = make(map[string]string)

// IMO JWT Secret
func getIMOJWTSecret() []byte {
	secret := os.Getenv("IMO_JWT_SECRET")
	if secret == "" {
		secret = "imo-jwt-secret-change-in-production"
	}
	return []byte(secret)
}

// generateIMOToken 生成 IMO JWT token
func generateIMOToken(wallet string, userID string) (string, error) {
	claims := jwt.MapClaims{
		"wallet":  wallet,
		"user_id": userID,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(), // 7天过期
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getIMOJWTSecret())
}

// IMOWalletAuthMiddleware IMO 钱包认证中间件
func IMOWalletAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Unauthorized"})
			c.Abort()
			return
		}

		// 解析 Bearer token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Invalid authorization header"})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// 解析 JWT
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return getIMOJWTSecret(), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Invalid token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Invalid token claims"})
			c.Abort()
			return
		}

		// 设置钱包和用户ID到 context
		c.Set("wallet", claims["wallet"])
		c.Set("imo_user_id", claims["user_id"])
		c.Next()
	}
}

// GetWalletNonce 获取钱包签名用的 nonce
func (h *IMOHandler) GetWalletNonce(c *gin.Context) {
	wallet := c.Query("wallet")
	if wallet == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Wallet address required"})
		return
	}

	// 生成随机 nonce
	nonceBytes := make([]byte, 16)
	rand.Read(nonceBytes)
	nonce := hex.EncodeToString(nonceBytes)

	// 存储 nonce（5分钟有效）
	nonceStore[wallet] = nonce

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"nonce":   nonce,
			"message": "Sign this message to verify your wallet: " + nonce,
		},
	})
}

// VerifyWalletRequest 验证钱包请求
type VerifyWalletRequest struct {
	Wallet    string `json:"wallet" binding:"required"`
	Signature string `json:"signature" binding:"required"`
	Chain     string `json:"chain" binding:"required,oneof=solana bsc"`
}

// VerifyWallet 验证钱包签名
func (h *IMOHandler) VerifyWallet(c *gin.Context) {
	var req VerifyWalletRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 验证 nonce 存在
	_, exists := nonceStore[req.Wallet]
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid or expired nonce"})
		return
	}

	// TODO: 实际验证签名
	// 对于 Solana: 使用 ed25519 验证
	// 对于 BSC/EVM: 使用 ecrecover 验证
	// 这里暂时跳过实际验证，生产环境需要实现

	// 清除已使用的 nonce
	delete(nonceStore, req.Wallet)

	// 查找或创建用户
	var user models.IMOUser
	result := h.db.Where("wallet = ?", req.Wallet).First(&user)

	if result.Error == gorm.ErrRecordNotFound {
		// 创建新用户
		user = models.IMOUser{
			Wallet: req.Wallet,
			Chain:  models.Chain(req.Chain),
		}
		if err := h.db.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			return
		}
	}

	// 生成 JWT token
	token, err := generateIMOToken(user.Wallet, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user":  user,
			"token": token,
		},
	})
}

// ========== 统计相关 ==========

// GetStats 获取 IMO 统计数据
func (h *IMOHandler) GetStats(c *gin.Context) {
	var stats struct {
		TotalProjects    int64   `json:"totalProjects"`
		DiscoveringCount int64   `json:"discoveringCount"`
		AuctioningCount  int64   `json:"auctioningCount"`
		LaunchingCount   int64   `json:"launchingCount"`
		LaunchedCount    int64   `json:"launchedCount"`
		TotalBidVolume   float64 `json:"totalBidVolume"`
		TotalUsers       int64   `json:"totalUsers"`
		TotalRevenueUSD  float64 `json:"totalRevenueUsd"`
	}

	h.db.Model(&models.Project{}).Count(&stats.TotalProjects)
	h.db.Model(&models.Project{}).Where("status = ?", "discovering").Count(&stats.DiscoveringCount)
	h.db.Model(&models.Project{}).Where("status = ?", "auctioning").Count(&stats.AuctioningCount)
	h.db.Model(&models.Project{}).Where("status = ?", "launching").Count(&stats.LaunchingCount)
	h.db.Model(&models.Project{}).Where("status = ?", "launched").Count(&stats.LaunchedCount)
	h.db.Model(&models.IMOUser{}).Count(&stats.TotalUsers)

	// 计算总出价量
	var bidSum struct {
		Total float64
	}
	h.db.Model(&models.Bid{}).Select("COALESCE(SUM(amount), 0) as total").Scan(&bidSum)
	stats.TotalBidVolume = bidSum.Total

	// 计算总收入
	var revenueSum struct {
		Total float64
	}
	h.db.Model(&models.RevenueRecord{}).Select("COALESCE(SUM(amount), 0) as total").Scan(&revenueSum)
	stats.TotalRevenueUSD = revenueSum.Total

	c.JSON(http.StatusOK, gin.H{"success": true, "data": stats})
}

// ========== 管理功能 ==========

// EndAuction 结束竞拍并进入发射阶段
func (h *IMOHandler) EndAuction(c *gin.Context) {
	id := c.Param("id")

	var project models.Project
	if err := h.db.First(&project, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	if project.Status != models.ProjectStatusAuctioning {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Project is not in auction"})
		return
	}

	// 检查是否有出价
	if project.CurrentBidderID == nil || *project.CurrentBidderID == "" {
		// 没有人出价，竞拍失败
		project.Status = models.ProjectStatusFailed
	} else {
		// 有人出价，进入发射阶段
		project.Status = models.ProjectStatusLaunching

		// 创建时间线事件
		event := models.TimelineEvent{
			ProjectID: project.ID,
			Type:      models.TimelineEventAuctionEnd,
			Actor:     "system",
			Data:      models.JSONMap{"winner": project.CurrentBidder, "amount": project.CurrentBidAmount},
		}
		h.db.Create(&event)
	}

	if err := h.db.Save(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": project})
}

// MarkLaunched 标记项目已发射
func (h *IMOHandler) MarkLaunched(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		TokenAddress string `json:"tokenAddress" binding:"required"`
		LaunchTxHash string `json:"launchTxHash"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	var project models.Project
	if err := h.db.First(&project, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	if project.Status != models.ProjectStatusLaunching {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Project is not in launching status"})
		return
	}

	now := time.Now()
	project.Status = models.ProjectStatusLaunched
	project.TokenAddress = req.TokenAddress
	project.LaunchTxHash = req.LaunchTxHash
	project.LaunchedAt = &now

	if err := h.db.Save(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 创建时间线事件
	event := models.TimelineEvent{
		ProjectID: project.ID,
		Type:      models.TimelineEventLaunched,
		Actor:     "system",
		Data:      models.JSONMap{"tokenAddress": req.TokenAddress, "txHash": req.LaunchTxHash},
	}
	h.db.Create(&event)

	// 更新赢家的统计
	if project.CurrentBidderID != nil && *project.CurrentBidderID != "" {
		h.db.Model(&models.IMOUser{}).Where("id = ?", *project.CurrentBidderID).
			Update("auctions_won", gorm.Expr("auctions_won + 1"))
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": project})
}

// ========== 认领功能 ==========

// SubmitClaimRequest 提交认领申请
func (h *IMOHandler) SubmitClaimRequest(c *gin.Context) {
	projectID := c.Param("id")

	wallet, exists := c.Get("wallet")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Unauthorized"})
		return
	}

	var req struct {
		ProofType string `json:"proofType" binding:"required,oneof=twitter github website other"`
		ProofURL  string `json:"proofUrl" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 检查项目是否存在
	var project models.Project
	if err := h.db.First(&project, "id = ?", projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	// 创建认领申请
	claim := models.ClaimRequest{
		ProjectID:       projectID,
		ApplicantWallet: wallet.(string),
		ProofType:       req.ProofType,
		ProofURL:        req.ProofURL,
		Status:          "pending",
	}

	if err := h.db.Create(&claim).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": claim})
}

// GetClaimRequests 获取项目的认领申请
func (h *IMOHandler) GetClaimRequests(c *gin.Context) {
	projectID := c.Param("id")

	var claims []models.ClaimRequest
	if err := h.db.Where("project_id = ?", projectID).Order("created_at desc").Find(&claims).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": claims})
}

// ApproveClaimRequest 批准认领申请
func (h *IMOHandler) ApproveClaimRequest(c *gin.Context) {
	claimID := c.Param("claimId")

	var claim models.ClaimRequest
	if err := h.db.First(&claim, "id = ?", claimID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Claim request not found"})
		return
	}

	if claim.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Claim request is not pending"})
		return
	}

	now := time.Now()

	// 更新认领申请状态
	claim.Status = "approved"
	claim.ReviewedAt = &now
	h.db.Save(&claim)

	// 更新项目创作者信息
	var project models.Project
	h.db.First(&project, "id = ?", claim.ProjectID)
	project.CreatorWallet = claim.ApplicantWallet
	project.ClaimedAt = &now

	// 根据证明类型设置验证状态
	switch claim.ProofType {
	case "twitter":
		project.VerifyTwitter = true
	case "github":
		project.VerifyGithub = true
	case "website":
		project.VerifyWebsite = true
	}

	h.db.Save(&project)

	// 创建时间线事件
	event := models.TimelineEvent{
		ProjectID: project.ID,
		Type:      models.TimelineEventClaimed,
		Actor:     claim.ApplicantWallet,
		Data:      models.JSONMap{"proofType": claim.ProofType},
	}
	h.db.Create(&event)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": claim})
}

// ========== 项目讨论评论 ==========

// ListProjectComments 获取项目评论列表
func (h *IMOHandler) ListProjectComments(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "project_id required"})
		return
	}

	// 验证项目是否存在
	var project models.Project
	if err := h.db.First(&project, "id = ?", projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "project not found"})
		return
	}

	// 分页
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// 获取顶级评论
	var comments []models.ProjectComment
	if err := h.db.Where("project_id = ? AND parent_id IS NULL", projectID).
		Order("created_at desc").
		Offset(offset).
		Limit(limit).
		Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 获取每条评论的回复
	var result []map[string]interface{}
	for _, comment := range comments {
		var replies []models.ProjectComment
		h.db.Where("parent_id = ?", comment.ID).Order("created_at asc").Find(&replies)

		result = append(result, map[string]interface{}{
			"id":         comment.ID,
			"project_id": comment.ProjectID,
			"wallet":     comment.Wallet,
			"nickname":   comment.Nickname,
			"content":    comment.Content,
			"like_count": comment.LikeCount,
			"created_at": comment.CreatedAt,
			"replies":    replies,
		})
	}

	// 获取评论总数
	var total int64
	h.db.Model(&models.ProjectComment{}).Where("project_id = ?", projectID).Count(&total)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": result,
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}

// CreateProjectCommentRequest 创建项目评论请求
type CreateProjectCommentRequest struct {
	Content  string  `json:"content" binding:"required"`
	ParentID *string `json:"parent_id"` // 可选，回复某条评论
	Nickname string  `json:"nickname"`  // 可选昵称
}

// CreateProjectComment 创建项目评论
func (h *IMOHandler) CreateProjectComment(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "project_id required"})
		return
	}

	// 验证项目是否存在
	var project models.Project
	if err := h.db.First(&project, "id = ?", projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "project not found"})
		return
	}

	// 获取用户信息（从 IMO JWT）
	userID, _ := c.Get("imo_user_id")
	wallet, _ := c.Get("wallet")

	var req CreateProjectCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 评论长度限制
	if len(req.Content) > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "comment too long, max 1000 characters"})
		return
	}

	// 如果是回复，验证父评论是否存在
	if req.ParentID != nil && *req.ParentID != "" {
		var parentComment models.ProjectComment
		if err := h.db.First(&parentComment, "id = ?", *req.ParentID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "parent comment not found"})
			return
		}
	}

	// 处理用户ID和钱包
	userIDStr := ""
	walletStr := ""
	if userID != nil {
		userIDStr = userID.(string)
	}
	if wallet != nil {
		walletStr = wallet.(string)
	}

	// 必须有用户ID（从 JWT 获取的 UUID）
	if userIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login or connect wallet"})
		return
	}

	// 昵称处理
	nickname := req.Nickname
	if nickname == "" && walletStr != "" {
		// 默认使用钱包地址缩写作为昵称
		if len(walletStr) > 8 {
			nickname = walletStr[:4] + "..." + walletStr[len(walletStr)-4:]
		} else {
			nickname = walletStr
		}
	}

	comment := models.ProjectComment{
		ProjectID: projectID,
		UserID:    userIDStr,
		Wallet:    walletStr,
		Nickname:  nickname,
		Content:   req.Content,
		ParentID:  req.ParentID,
	}

	if err := h.db.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    comment,
	})
}

// DeleteProjectComment 删除项目评论（只能删除自己的）
func (h *IMOHandler) DeleteProjectComment(c *gin.Context) {
	commentID := c.Param("commentId")
	if commentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "comment_id required"})
		return
	}

	// 获取用户信息（从 IMO JWT）
	userID, _ := c.Get("imo_user_id")

	userIDStr := ""
	if userID != nil {
		userIDStr = userID.(string)
	}

	if userIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "please login first"})
		return
	}

	// 检查评论是否存在且属于当前用户
	var comment models.ProjectComment
	if err := h.db.First(&comment, "id = ? AND user_id = ?", commentID, userIDStr).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "comment not found or not yours"})
		return
	}

	// 删除评论及其所有回复
	h.db.Where("parent_id = ?", commentID).Delete(&models.ProjectComment{})
	h.db.Delete(&comment)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "comment deleted",
	})
}
