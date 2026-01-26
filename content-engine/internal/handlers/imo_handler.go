package handlers

import (
	"content-engine/internal/models"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type IMOHandler struct {
	db *gorm.DB
}

func NewIMOHandler(db *gorm.DB) *IMOHandler {
	return &IMOHandler{db: db}
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

// CreateProjectRequest 创建项目请求
type CreateProjectRequest struct {
	Name        string `json:"name" binding:"required"`
	Ticker      string `json:"ticker" binding:"required"`
	Chain       string `json:"chain" binding:"required,oneof=solana bsc"`
	Launchpad   string `json:"launchpad" binding:"required"`
	Logo        string `json:"logo"`
	Description string `json:"description"`
	Twitter     string `json:"twitter"`
	Github      string `json:"github"`
	Website     string `json:"website"`
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
		Name:        req.Name,
		Ticker:      ticker,
		Chain:       models.Chain(req.Chain),
		Launchpad:   models.Launchpad(req.Launchpad),
		Status:      models.ProjectStatusDiscovering,
		ScoutID:     user.ID,
		ScoutWallet: wallet.(string),
		Logo:        req.Logo,
		Description: req.Description,
		Twitter:     req.Twitter,
		Github:      req.Github,
		Website:     req.Website,
	}

	if err := h.db.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 更新用户统计
	h.db.Model(&user).Update("projects_discovered", gorm.Expr("projects_discovered + 1"))

	// 创建时间线事件
	event := models.TimelineEvent{
		ProjectID: project.ID,
		Type:      models.TimelineEventDiscovered,
		Actor:     wallet.(string),
		Data:      models.JSONMap{"ticker": ticker, "chain": req.Chain},
	}
	h.db.Create(&event)

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": project})
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
	project.CurrentBidderID = user.ID
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

	// 类型筛选：scouted（发掘的）或 won（赢得的）
	projectType := c.Query("type")
	if projectType == "scouted" {
		query = query.Where("scout_id = ?", userID)
	} else if projectType == "won" {
		query = query.Where("current_bidder_id = ? AND status IN ?", userID, []string{"launching", "launched"})
	}

	if err := query.Order("created_at desc").Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

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

	// 生成 JWT token（这里简化处理，生产环境需要完整实现）
	// token := generateJWT(user)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": user,
			// "token": token,
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
	if project.CurrentBidderID == "" {
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
	if project.CurrentBidderID != "" {
		h.db.Model(&models.IMOUser{}).Where("id = ?", project.CurrentBidderID).
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
