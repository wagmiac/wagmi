package handlers

import (
	"content-engine/internal/models"
	"content-engine/internal/services"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// PromoHandler 优惠码处理器
type PromoHandler struct {
	paymentService *services.PaymentService
}

// NewPromoHandler 创建优惠码处理器
func NewPromoHandler(paymentService *services.PaymentService) *PromoHandler {
	return &PromoHandler{
		paymentService: paymentService,
	}
}

// CreatePromoCode 创建优惠码（管理员）
// @Summary 创建优惠码
// @Description 管理员创建优惠码
// @Tags Admin - Promo
// @Accept json
// @Produce json
// @Param body body object true "Promo code info"
// @Success 200 {object} models.PromoCode
// @Router /api/admin/promo [post]
func (h *PromoHandler) CreatePromoCode(c *gin.Context) {
	var req struct {
		Type      string  `json:"type" binding:"required"` // discount_percent, discount_amount, free
		Value     float64 `json:"value"`                   // 折扣值（百分比或金额）
		ExpiresIn int     `json:"expires_in"`              // 过期时间（小时），0 表示永不过期
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var expiresAt *time.Time
	if req.ExpiresIn > 0 {
		t := time.Now().Add(time.Duration(req.ExpiresIn) * time.Hour)
		expiresAt = &t
	}

	promoCode, err := h.paymentService.CreatePromoCode(req.Type, req.Value, expiresAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, promoCode)
}

// BatchCreatePromoCode 批量创建优惠码（管理员）
// @Summary 批量创建优惠码
// @Description 管理员批量创建优惠码
// @Tags Admin - Promo
// @Accept json
// @Produce json
// @Param body body object true "Batch promo code info"
// @Success 200 {object} object
// @Router /api/admin/promo/batch [post]
func (h *PromoHandler) BatchCreatePromoCode(c *gin.Context) {
	var req struct {
		Count     int     `json:"count" binding:"required,min=1,max=100"` // 生成数量
		Type      string  `json:"type" binding:"required"`                // discount_percent, discount_amount, free
		Value     float64 `json:"value"`                                  // 折扣值
		ExpiresIn int     `json:"expires_in"`                             // 过期时间（小时）
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var expiresAt *time.Time
	if req.ExpiresIn > 0 {
		t := time.Now().Add(time.Duration(req.ExpiresIn) * time.Hour)
		expiresAt = &t
	}

	var codes []models.PromoCode
	var failed int
	for i := 0; i < req.Count; i++ {
		promoCode, err := h.paymentService.CreatePromoCode(req.Type, req.Value, expiresAt)
		if err != nil {
			failed++
			continue
		}
		codes = append(codes, *promoCode)
	}

	c.JSON(http.StatusOK, gin.H{
		"codes":   codes,
		"created": len(codes),
		"failed":  failed,
	})
}

// ListPromoCodes 获取优惠码列表（管理员）
// @Summary 获取优惠码列表
// @Description 管理员获取优惠码列表
// @Tags Admin - Promo
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(10)
// @Param show_used query bool false "Show used codes" default(false)
// @Success 200 {object} object
// @Router /api/admin/promo [get]
func (h *PromoHandler) ListPromoCodes(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	showUsed := c.Query("show_used") == "true"

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	codes, total, err := h.paymentService.ListPromoCodes(page, pageSize, showUsed)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"codes":     codes,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// DeletePromoCode 删除优惠码（管理员）
// @Summary 删除优惠码
// @Description 管理员删除优惠码
// @Tags Admin - Promo
// @Param id path string true "Promo code ID"
// @Success 200 {object} object
// @Router /api/admin/promo/{id} [delete]
func (h *PromoHandler) DeletePromoCode(c *gin.Context) {
	id := c.Param("id")

	if err := h.paymentService.DeletePromoCode(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// GiftCredits 赠送积分（管理员）
// @Summary 赠送积分
// @Description 管理员赠送积分给用户
// @Tags Admin - Promo
// @Accept json
// @Produce json
// @Param body body object true "Gift info"
// @Success 200 {object} object
// @Router /api/admin/promo/gift [post]
func (h *PromoHandler) GiftCredits(c *gin.Context) {
	var req struct {
		UserID string `json:"user_id" binding:"required"`
		Amount int    `json:"amount" binding:"required,min=1"`
		Reason string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Reason == "" {
		req.Reason = "管理员赠送"
	}

	if err := h.paymentService.GiftCredits(req.UserID, req.Amount, req.Reason); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"user_id": req.UserID,
		"amount":  req.Amount,
	})
}

// GetUserCredits 获取用户积分（管理员）
// @Summary 获取用户积分
// @Description 管理员查看用户积分
// @Tags Admin - Promo
// @Param user_id path string true "User ID"
// @Success 200 {object} models.UserCredit
// @Router /api/admin/promo/users/{user_id}/credits [get]
func (h *PromoHandler) GetUserCredits(c *gin.Context) {
	userID := c.Param("user_id")

	credits, err := h.paymentService.GetUserCredits(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, credits)
}

// GetUserTransactions 获取用户积分交易记录（管理员）
// @Summary 获取用户积分交易记录
// @Description 管理员查看用户积分交易记录
// @Tags Admin - Promo
// @Param user_id path string true "User ID"
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(10)
// @Success 200 {object} object
// @Router /api/admin/promo/users/{user_id}/transactions [get]
func (h *PromoHandler) GetUserTransactions(c *gin.Context) {
	userID := c.Param("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	transactions, total, err := h.paymentService.GetCreditTransactions(userID, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactions,
		"total":        total,
		"page":         page,
		"page_size":    pageSize,
	})
}
