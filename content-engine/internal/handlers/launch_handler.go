package handlers

import (
	"content-engine/internal/models"
	"content-engine/internal/services"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// LaunchHandler 发射处理器
type LaunchHandler struct {
	service *services.LaunchService
	db      *gorm.DB
}

// NewLaunchHandler 创建发射处理器
func NewLaunchHandler(service *services.LaunchService, db *gorm.DB) *LaunchHandler {
	return &LaunchHandler{service: service, db: db}
}

// GenerateDevWallet 为指定发射台生成 Dev 钱包
func (h *LaunchHandler) GenerateDevWallet(c *gin.Context) {
	projectID := c.Param("id")

	// 从请求体或查询参数获取发射台
	var req struct {
		Launchpad string `json:"launchpad"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		// 尝试从查询参数获取
		req.Launchpad = c.Query("launchpad")
	}

	if req.Launchpad == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "launchpad is required"})
		return
	}

	// 生成钱包
	wallet, err := h.service.GenerateDevWallet(projectID, req.Launchpad)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"address":   wallet.Address,
			"publicKey": wallet.PublicKey,
			"chain":     wallet.Chain,
			"launchpad": wallet.Launchpad,
		},
	})
}

// GetDevWallet 获取Dev钱包信息（支持按发射台查询）
func (h *LaunchHandler) GetDevWallet(c *gin.Context) {
	projectID := c.Param("id")
	launchpad := c.Query("launchpad") // 可选参数，指定发射台

	var project models.Project
	if err := h.db.First(&project, "id = ?", projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	// 返回所有发射台的钱包信息
	wallets := gin.H{}

	// 从 LaunchpadWallets 获取各发射台钱包
	if project.LaunchpadWallets != nil {
		for pad, addr := range project.LaunchpadWallets {
			if addrStr, ok := addr.(string); ok && addrStr != "" {
				wallets[pad] = gin.H{
					"address":   addrStr,
					"launchpad": pad,
				}
			}
		}
	}

	// 兼容旧数据
	if len(wallets) == 0 && project.DevWalletAddress != "" {
		if project.Launchpad != "" {
			wallets[string(project.Launchpad)] = gin.H{
				"address":   project.DevWalletAddress,
				"launchpad": project.Launchpad,
			}
		}
	}

	// 如果指定了发射台，只返回该发射台的钱包
	if launchpad != "" {
		if w, ok := wallets[launchpad]; ok {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    w,
			})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Wallet not found for launchpad: " + launchpad})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    wallets,
	})
}

// LaunchRequest 发射请求
type LaunchRequestBody struct {
	DevBuySOL float64 `json:"devBuySOL"` // Dev买入金额（SOL）
	DevBuyBNB float64 `json:"devBuyBNB"` // Dev买入金额（BNB）
}

// Launch 发射代币
func (h *LaunchHandler) Launch(c *gin.Context) {
	projectID := c.Param("id")

	var req LaunchRequestBody
	if err := c.ShouldBindJSON(&req); err != nil {
		// 允许不传参数，使用默认值
		req = LaunchRequestBody{
			DevBuySOL: 0.01,  // 默认 0.01 SOL
			DevBuyBNB: 0.001, // 默认 0.001 BNB
		}
	}

	// 检查项目状态
	var project models.Project
	if err := h.db.First(&project, "id = ?", projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	if project.Status != models.ProjectStatusLaunching {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Project is not in launching status"})
		return
	}

	// 如果没有Dev钱包，先生成（使用项目默认的发射台）
	if project.DevWalletAddress == "" && project.Launchpad != "" {
		_, err := h.service.GenerateDevWallet(projectID, string(project.Launchpad))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to generate dev wallet: " + err.Error()})
			return
		}
	}

	// 执行发射
	result, err := h.service.LaunchToken(services.LaunchRequest{
		ProjectID: projectID,
		DevBuySOL: req.DevBuySOL,
		DevBuyBNB: req.DevBuyBNB,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

// GetLaunchStatus 获取发射状态
func (h *LaunchHandler) GetLaunchStatus(c *gin.Context) {
	projectID := c.Param("id")

	var project models.Project
	if err := h.db.First(&project, "id = ?", projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Project not found"})
		return
	}

	status := gin.H{
		"status":       project.Status,
		"devWallet":    project.DevWalletAddress,
		"tokenAddress": project.TokenAddress,
		"launchTxHash": project.LaunchTxHash,
		"launchedAt":   project.LaunchedAt,
		"chain":        project.Chain,
		"launchpad":    project.Launchpad,
	}

	// 如果已发射，获取分成记录
	if project.Status == models.ProjectStatusLaunched {
		var revenues []models.RevenueRecord
		h.db.Where("project_id = ?", projectID).Find(&revenues)
		status["revenues"] = revenues
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": status})
}

// DistributeRevenue 分发收益
func (h *LaunchHandler) DistributeRevenue(c *gin.Context) {
	projectID := c.Param("id")

	if err := h.service.DistributeRevenue(projectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Revenue distributed"})
}

// GetRevenueRecords 获取分成记录
func (h *LaunchHandler) GetRevenueRecords(c *gin.Context) {
	projectID := c.Param("id")

	var records []models.RevenueRecord
	if err := h.db.Where("project_id = ?", projectID).Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": records})
}

// GetUserRevenue 获取用户的分成收益
func (h *LaunchHandler) GetUserRevenue(c *gin.Context) {
	wallet := c.Param("wallet")

	var records []models.RevenueRecord
	if err := h.db.Where("to_wallet = ?", wallet).Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 计算总收益
	totalSOL := 0.0
	totalBNB := 0.0
	for _, r := range records {
		if r.Currency == "SOL" {
			totalSOL += r.Amount
		} else if r.Currency == "BNB" {
			totalBNB += r.Amount
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"records":  records,
			"totalSOL": totalSOL,
			"totalBNB": totalBNB,
		},
	})
}

// ListLaunchingProjects 获取待发射项目列表
func (h *LaunchHandler) ListLaunchingProjects(c *gin.Context) {
	var projects []models.Project
	if err := h.db.Where("status = ?", models.ProjectStatusLaunching).Order("auction_ends_at asc").Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": projects})
}

// ExportDevWalletKey 导出 Dev 钱包私钥（仅管理员）
// @Summary 导出指定发射台的 Dev 钱包私钥
// @Tags Launch
// @Param id path string true "Project ID"
// @Param body body object true "Request body"
// @Success 200 {object} object
// @Router /api/imo/admin/projects/{id}/wallet/export [post]
func (h *LaunchHandler) ExportDevWalletKey(c *gin.Context) {
	projectID := c.Param("id")

	var req struct {
		Launchpad string `json:"launchpad" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "launchpad is required"})
		return
	}

	// 获取解密后的私钥
	privateKey, err := h.service.ExportDevWalletKey(projectID, req.Launchpad)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"privateKey": privateKey,
			"launchpad":  req.Launchpad,
		},
	})
}
