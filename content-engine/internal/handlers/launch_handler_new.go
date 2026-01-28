package handlers

import (
	"content-engine/internal/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// ========== 新的发射流程 API ==========

// CreateLaunchOrderRequest 创建发射订单请求
type CreateLaunchOrderRequest struct {
	Chain          string  `json:"chain" binding:"required"`          // solana 或 bsc
	Launchpad      string  `json:"launchpad" binding:"required"`      // pump.fun, trends.fun, bags.fm, flap.sh
	FirstBuyAmount float64 `json:"firstBuyAmount" binding:"required"` // 首单购买金额
	UserWallet     string  `json:"userWallet" binding:"required"`     // 用户钱包地址（接收代币）
}

// CreateLaunchOrder 创建发射订单（步骤1：选择配置并创建支付钱包）
func (h *LaunchHandler) CreateLaunchOrder(c *gin.Context) {
	projectID := c.Param("id")

	var req CreateLaunchOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid request: " + err.Error()})
		return
	}

	// 通过钱包地址查找用户（如果存在）
	var userID *string
	var imoUser models.IMOUser
	if err := h.db.Where("wallet = ?", req.UserWallet).First(&imoUser).Error; err == nil {
		userID = &imoUser.ID
	}

	// 验证公链
	chain := models.Chain(req.Chain)
	if chain != models.ChainSolana && chain != models.ChainBSC {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid chain, must be 'solana' or 'bsc'"})
		return
	}

	// 验证发射台
	launchpad := models.Launchpad(req.Launchpad)
	validLaunchpads := map[models.Launchpad]models.Chain{
		models.LaunchpadPumpFun:   models.ChainSolana,
		models.LaunchpadTrendsFun: models.ChainSolana,
		models.LaunchpadBagsFM:    models.ChainSolana,
		models.LaunchpadFlapSH:    models.ChainBSC,
		models.LaunchpadFourMeme:  models.ChainBSC,
	}
	expectedChain, ok := validLaunchpads[launchpad]
	if !ok || expectedChain != chain {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid launchpad for the selected chain"})
		return
	}

	// 验证首单金额
	minAmount := 0.1 // SOL
	if chain == models.ChainBSC {
		minAmount = 0.01 // BNB
	}
	if req.FirstBuyAmount < minAmount {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "First buy amount is too low"})
		return
	}

	// 获取项目
	var project models.Project
	if err := h.db.First(&project, "id = ?", projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	// 检查项目状态：只有 discovering 或 launching 状态可以发射
	if project.Status != models.ProjectStatusDiscovering && project.Status != models.ProjectStatusLaunching {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Project cannot be launched in current status"})
		return
	}

	// 检查是否已有进行中的订单
	var existingOrder models.LaunchOrder
	if err := h.db.Where("project_id = ? AND status IN ?", projectID, []string{"pending", "paid", "launching"}).First(&existingOrder).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "There is already an active launch order for this project", "data": existingOrder})
		return
	}

	// 计算 gas 费（预留）
	gasFee := 0.005 // SOL
	if chain == models.ChainBSC {
		gasFee = 0.001 // BNB
	}

	// 生成支付钱包
	wallet, err := h.service.GeneratePaymentWallet(chain)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to generate payment wallet: " + err.Error()})
		return
	}

	// 设置过期时间（30分钟）
	expiresAt := time.Now().Add(30 * time.Minute)

	// 创建发射订单
	order := models.LaunchOrder{
		ProjectID:            projectID,
		UserID:               userID,
		UserWallet:           req.UserWallet,
		Chain:                chain,
		Launchpad:            launchpad,
		FirstBuyAmount:       req.FirstBuyAmount,
		GasFee:               gasFee,
		PaymentWalletAddress: wallet.Address,
		PaymentWalletKey:     wallet.EncryptedKey,
		Status:               models.LaunchOrderStatusPending,
		ExpiresAt:            &expiresAt,
	}

	if err := h.db.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to create launch order: " + err.Error()})
		return
	}

	// 返回支付信息
	currency := "SOL"
	if chain == models.ChainBSC {
		currency = "BNB"
	}
	totalAmount := req.FirstBuyAmount + gasFee

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"orderId":        order.ID,
			"paymentAddress": wallet.Address,
			"amount":         totalAmount,
			"currency":       currency,
			"firstBuyAmount": req.FirstBuyAmount,
			"gasFee":         gasFee,
			"expiresAt":      expiresAt,
			"chain":          chain,
			"launchpad":      launchpad,
		},
	})
}

// GetLaunchOrder 获取发射订单状态
func (h *LaunchHandler) GetLaunchOrder(c *gin.Context) {
	orderID := c.Param("orderId")

	var order models.LaunchOrder
	if err := h.db.First(&order, "id = ?", orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Order not found"})
		return
	}

	// 获取关联的项目信息
	var project models.Project
	h.db.First(&project, "id = ?", order.ProjectID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"order":   order,
			"project": project,
		},
	})
}

// CheckPayment 检查支付状态
func (h *LaunchHandler) CheckPayment(c *gin.Context) {
	orderID := c.Param("orderId")

	var order models.LaunchOrder
	if err := h.db.First(&order, "id = ?", orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Order not found"})
		return
	}

	// 如果已经确认支付，直接返回
	if order.Status != models.LaunchOrderStatusPending {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"status":        order.Status,
				"paymentAmount": order.PaymentAmount,
				"paymentTxHash": order.PaymentTxHash,
			},
		})
		return
	}

	// 检查是否过期
	if order.ExpiresAt != nil && time.Now().After(*order.ExpiresAt) {
		order.Status = models.LaunchOrderStatusFailed
		order.ErrorMsg = "Payment expired"
		h.db.Save(&order)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"status":  order.Status,
				"error":   "Payment expired",
				"expired": true,
			},
		})
		return
	}

	// 检查链上余额
	balance, txHash, err := h.service.CheckWalletBalance(order.PaymentWalletAddress, order.Chain)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to check balance: " + err.Error()})
		return
	}

	expectedAmount := order.FirstBuyAmount + order.GasFee

	if balance >= expectedAmount {
		// 支付已确认
		now := time.Now()
		order.Status = models.LaunchOrderStatusPaid
		order.PaymentAmount = balance
		order.PaymentTxHash = txHash
		order.PaymentConfirmedAt = &now
		h.db.Save(&order)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"status":        models.LaunchOrderStatusPaid,
				"paymentAmount": balance,
				"paymentTxHash": txHash,
				"confirmed":     true,
			},
		})
		return
	}

	// 支付未完成
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"status":         models.LaunchOrderStatusPending,
			"currentBalance": balance,
			"expectedAmount": expectedAmount,
			"confirmed":      false,
		},
	})
}

// ExecuteLaunch 执行发射（支付确认后调用）
func (h *LaunchHandler) ExecuteLaunch(c *gin.Context) {
	orderID := c.Param("orderId")

	var order models.LaunchOrder
	if err := h.db.First(&order, "id = ?", orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Order not found"})
		return
	}

	// 检查订单状态
	if order.Status != models.LaunchOrderStatusPaid {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Order is not in paid status"})
		return
	}

	// 获取项目
	var project models.Project
	if err := h.db.First(&project, "id = ?", order.ProjectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	// 更新订单状态为发射中
	order.Status = models.LaunchOrderStatusLaunching
	h.db.Save(&order)

	// 执行发射
	result, err := h.service.ExecuteLaunchOrder(&order, &project)
	if err != nil {
		order.Status = models.LaunchOrderStatusFailed
		order.ErrorMsg = err.Error()
		h.db.Save(&order)

		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 更新订单结果
	now := time.Now()
	order.Status = models.LaunchOrderStatusSuccess
	order.TokenAddress = result.TokenAddress
	order.LaunchTxHash = result.LaunchTxHash
	order.TokenTransferTx = result.TokenTransferTx
	order.TokensReceived = result.TokensReceived
	order.LaunchedAt = &now
	h.db.Save(&order)

	// 更新项目状态
	project.Status = models.ProjectStatusLaunched
	project.TokenAddress = result.TokenAddress
	project.LaunchTxHash = result.LaunchTxHash
	project.LaunchedAt = &now
	project.Chain = order.Chain
	project.Launchpad = order.Launchpad
	h.db.Save(&project)

	// 创建时间线事件
	event := models.TimelineEvent{
		ProjectID: project.ID,
		Type:      models.TimelineEventLaunched,
		Actor:     order.UserWallet,
		Data: models.JSONMap{
			"tokenAddress":    result.TokenAddress,
			"launchTxHash":    result.LaunchTxHash,
			"tokenTransferTx": result.TokenTransferTx,
			"tokensReceived":  result.TokensReceived,
			"launchpad":       order.Launchpad,
			"chain":           order.Chain,
		},
	}
	h.db.Create(&event)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"tokenAddress":    result.TokenAddress,
			"launchTxHash":    result.LaunchTxHash,
			"tokenTransferTx": result.TokenTransferTx,
			"tokensReceived":  result.TokensReceived,
		},
	})
}

// CancelLaunchOrder 取消发射订单（退款）
func (h *LaunchHandler) CancelLaunchOrder(c *gin.Context) {
	orderID := c.Param("orderId")

	var order models.LaunchOrder
	if err := h.db.First(&order, "id = ?", orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Order not found"})
		return
	}

	// 只有 pending 或 paid 状态可以取消
	if order.Status != models.LaunchOrderStatusPending && order.Status != models.LaunchOrderStatusPaid {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Order cannot be cancelled in current status"})
		return
	}

	// 如果已支付，需要退款
	if order.Status == models.LaunchOrderStatusPaid && order.PaymentAmount > 0 {
		refundTx, err := h.service.RefundPayment(&order)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to refund: " + err.Error()})
			return
		}
		order.TokenTransferTx = refundTx // 复用字段存储退款交易
	}

	order.Status = models.LaunchOrderStatusRefunded
	h.db.Save(&order)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Order cancelled"})
}

// GetProjectLaunchOrders 获取项目的发射订单列表
func (h *LaunchHandler) GetProjectLaunchOrders(c *gin.Context) {
	projectID := c.Param("id")

	var orders []models.LaunchOrder
	if err := h.db.Where("project_id = ?", projectID).Order("created_at desc").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": orders})
}

// LaunchWithPaymentRequest 带支付哈希的直接发射请求
type LaunchWithPaymentRequest struct {
	Chain          string  `json:"chain" binding:"required"`          // solana 或 bsc
	Launchpad      string  `json:"launchpad" binding:"required"`      // pump.fun, trends.fun, bags.fm, flap.sh
	FirstBuyAmount float64 `json:"firstBuyAmount" binding:"required"` // 首单购买金额
	UserWallet     string  `json:"userWallet" binding:"required"`     // 用户钱包地址
	PaymentTxHash  string  `json:"paymentTxHash" binding:"required"`  // 支付交易哈希
}

// LaunchWithPayment 带支付哈希的直接发射（用户已通过钱包支付）
func (h *LaunchHandler) LaunchWithPayment(c *gin.Context) {
	projectID := c.Param("id")

	var req LaunchWithPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid request: " + err.Error()})
		return
	}

	// 通过钱包地址查找用户（如果存在）
	var userID *string
	var imoUser models.IMOUser
	if err := h.db.Where("wallet = ?", req.UserWallet).First(&imoUser).Error; err == nil {
		userID = &imoUser.ID
	}

	// 验证公链
	chain := models.Chain(req.Chain)
	if chain != models.ChainSolana && chain != models.ChainBSC {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid chain, must be 'solana' or 'bsc'"})
		return
	}

	// 验证发射台
	launchpad := models.Launchpad(req.Launchpad)
	validLaunchpads := map[models.Launchpad]models.Chain{
		models.LaunchpadPumpFun:   models.ChainSolana,
		models.LaunchpadTrendsFun: models.ChainSolana,
		models.LaunchpadBagsFM:    models.ChainSolana,
		models.LaunchpadFlapSH:    models.ChainBSC,
		models.LaunchpadFourMeme:  models.ChainBSC,
	}
	expectedChain, ok := validLaunchpads[launchpad]
	if !ok || expectedChain != chain {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid launchpad for the selected chain"})
		return
	}

	// 验证首单金额
	minAmount := 0.1 // SOL
	if chain == models.ChainBSC {
		minAmount = 0.01 // BNB
	}
	if req.FirstBuyAmount < minAmount {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "First buy amount is too low"})
		return
	}

	// 获取项目
	var project models.Project
	if err := h.db.First(&project, "id = ?", projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	// 检查项目状态
	if project.Status != models.ProjectStatusDiscovering && project.Status != models.ProjectStatusLaunching && project.Status != models.ProjectStatusLaunched {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Project cannot be launched in current status"})
		return
	}

	// 检查该发射台是否已发射过
	if project.LaunchedPads != nil {
		for _, pad := range project.LaunchedPads {
			if pad == req.Launchpad {
				c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Already launched on this launchpad"})
				return
			}
		}
	}
	// 兼容旧数据：检查单一 launchpad 字段
	if project.Launchpad != "" && string(project.Launchpad) == req.Launchpad {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Already launched on this launchpad"})
		return
	}

	// 获取该发射台的 dev 钱包
	var devWalletAddress, devWalletKey string
	if project.LaunchpadWallets != nil {
		if addr, ok := project.LaunchpadWallets[req.Launchpad].(string); ok {
			devWalletAddress = addr
		}
	}
	if project.LaunchpadKeys != nil {
		if key, ok := project.LaunchpadKeys[req.Launchpad].(string); ok {
			devWalletKey = key
		}
	}
	// 兼容旧数据
	if devWalletAddress == "" {
		devWalletAddress = project.DevWalletAddress
		devWalletKey = project.DevWalletKey
	}

	if devWalletAddress == "" || devWalletKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Dev wallet not found for this launchpad"})
		return
	}

	// 计算 gas 费
	gasFee := 0.005 // SOL
	if chain == models.ChainBSC {
		gasFee = 0.001 // BNB
	}

	now := time.Now()

	// 创建发射订单（使用项目的 dev 钱包）
	order := models.LaunchOrder{
		ProjectID:            projectID,
		UserID:               userID,
		UserWallet:           req.UserWallet,
		Chain:                chain,
		Launchpad:            launchpad,
		FirstBuyAmount:       req.FirstBuyAmount,
		GasFee:               gasFee,
		PaymentAmount:        req.FirstBuyAmount,
		PaymentWalletAddress: devWalletAddress,
		PaymentWalletKey:     devWalletKey,
		PaymentTxHash:        req.PaymentTxHash,
		PaymentConfirmedAt:   &now,
		Status:               models.LaunchOrderStatusLaunching,
	}

	if err := h.db.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to create launch order: " + err.Error()})
		return
	}

	// 执行发射
	result, err := h.service.ExecuteLaunchOrder(&order, &project)
	if err != nil {
		order.Status = models.LaunchOrderStatusFailed
		order.ErrorMsg = err.Error()
		h.db.Save(&order)

		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 更新订单结果
	order.Status = models.LaunchOrderStatusSuccess
	order.TokenAddress = result.TokenAddress
	order.LaunchTxHash = result.LaunchTxHash
	order.TokenTransferTx = result.TokenTransferTx
	order.TokensReceived = result.TokensReceived
	order.LaunchedAt = &now
	h.db.Save(&order)

	// 更新项目状态（支持多发射台）
	project.Status = models.ProjectStatusLaunched

	// 添加到已发射列表
	if project.LaunchedPads == nil {
		project.LaunchedPads = models.JSONArray{}
	}
	project.LaunchedPads = append(project.LaunchedPads, req.Launchpad)

	// 保存该发射台的代币地址
	if project.TokenAddresses == nil {
		project.TokenAddresses = models.JSONMap{}
	}
	project.TokenAddresses[req.Launchpad] = result.TokenAddress

	// 兼容旧字段：第一次发射时设置
	if project.TokenAddress == "" {
		project.TokenAddress = result.TokenAddress
		project.LaunchTxHash = result.LaunchTxHash
		project.Chain = order.Chain
		project.Launchpad = order.Launchpad
	}

	if project.LaunchedAt == nil {
		project.LaunchedAt = &now
	}

	h.db.Save(&project)

	// 创建时间线事件
	event := models.TimelineEvent{
		ProjectID: project.ID,
		Type:      models.TimelineEventLaunched,
		Actor:     order.UserWallet,
		Data: models.JSONMap{
			"tokenAddress":    result.TokenAddress,
			"launchTxHash":    result.LaunchTxHash,
			"tokenTransferTx": result.TokenTransferTx,
			"tokensReceived":  result.TokensReceived,
			"launchpad":       order.Launchpad,
			"chain":           order.Chain,
		},
	}
	h.db.Create(&event)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"tokenAddress":    result.TokenAddress,
			"launchTxHash":    result.LaunchTxHash,
			"tokenTransferTx": result.TokenTransferTx,
			"tokensReceived":  result.TokensReceived,
		},
	})
}
