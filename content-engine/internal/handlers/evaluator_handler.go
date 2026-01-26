package handlers

import (
	"content-engine/internal/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// EvaluatorHandler 评估处理器
type EvaluatorHandler struct {
	evaluatorService *services.EvaluatorService
	paymentService   *services.PaymentService
	phService        *services.PHService
}

// NewEvaluatorHandler 创建评估处理器
func NewEvaluatorHandler(evaluatorService *services.EvaluatorService, paymentService *services.PaymentService, phService *services.PHService) *EvaluatorHandler {
	return &EvaluatorHandler{
		evaluatorService: evaluatorService,
		paymentService:   paymentService,
		phService:        phService,
	}
}

// FetchProduct 获取产品信息（不需要登录）
// @Summary 获取 Product Hunt 产品信息
// @Description 通过 PH URL 获取产品信息
// @Tags Evaluator
// @Accept json
// @Produce json
// @Param url query string true "Product Hunt URL"
// @Success 200 {object} models.PHProduct
// @Router /api/evaluator/fetch [get]
func (h *EvaluatorHandler) FetchProduct(c *gin.Context) {
	url := c.Query("url")
	if url == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url is required"})
		return
	}

	product, err := h.phService.FetchProduct(url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, product)
}

// GetProduct 获取产品详情（包含缓存的）
// @Summary 获取产品详情
// @Tags Evaluator
// @Param id path string true "Product ID"
// @Success 200 {object} models.PHProduct
// @Router /api/evaluator/products/{id} [get]
func (h *EvaluatorHandler) GetProduct(c *gin.Context) {
	id := c.Param("id")

	product, err := h.phService.GetProductByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	c.JSON(http.StatusOK, product)
}

// Evaluate 执行评估（需要积分）
// @Summary 执行 AI 评估
// @Description 使用积分执行 AI 评估，返回评估报告
// @Tags Evaluator
// @Accept json
// @Produce json
// @Param body body object true "Product Hunt URL" example({"url": "https://producthunt.com/posts/example"})
// @Success 200 {object} models.PHEvaluation
// @Router /api/evaluator/evaluate [post]
func (h *EvaluatorHandler) Evaluate(c *gin.Context) {
	// 获取用户 ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userIDStr := userID.(string)

	var req struct {
		URL string `json:"url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url is required"})
		return
	}

	// 检查积分
	credits, err := h.paymentService.GetUserCredits(userIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get credits"})
		return
	}

	if credits.Credits <= 0 {
		c.JSON(http.StatusPaymentRequired, gin.H{
			"error":   "insufficient credits",
			"credits": credits.Credits,
		})
		return
	}

	// 获取产品
	product, err := h.phService.FetchProduct(req.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 检查是否已有评估
	existing, _ := h.evaluatorService.GetEvaluationByProductID(product.ID)
	if existing != nil {
		// 已有评估，直接返回（不扣积分）
		c.JSON(http.StatusOK, gin.H{
			"evaluation": existing,
			"cached":     true,
		})
		return
	}

	// 扣除积分
	if err := h.paymentService.UseCredit(userIDStr); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to use credit"})
		return
	}

	// 执行评估
	evaluation, err := h.evaluatorService.EvaluateProduct(product.ID)
	if err != nil {
		// 评估失败，退还积分
		_ = h.paymentService.RefundCredits(userIDStr, 1, "评估失败退款")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 更新评估的请求者
	evaluation.RequestedBy = &userIDStr
	h.evaluatorService.UpdateEvaluation(evaluation)

	c.JSON(http.StatusOK, gin.H{
		"evaluation": evaluation,
		"cached":     false,
	})
}

// GetEvaluation 获取评估报告
// @Summary 获取评估报告
// @Tags Evaluator
// @Param id path string true "Evaluation ID"
// @Success 200 {object} models.PHEvaluation
// @Router /api/evaluator/evaluations/{id} [get]
func (h *EvaluatorHandler) GetEvaluation(c *gin.Context) {
	id := c.Param("id")

	evaluation, err := h.evaluatorService.GetEvaluationByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "evaluation not found"})
		return
	}

	c.JSON(http.StatusOK, evaluation)
}

// ListEvaluations 获取评估列表（公开）
// @Summary 获取评估列表
// @Tags Evaluator
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(10)
// @Success 200 {object} object
// @Router /api/evaluator/evaluations [get]
func (h *EvaluatorHandler) ListEvaluations(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}

	evaluations, total, err := h.evaluatorService.ListEvaluations(page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"evaluations": evaluations,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
	})
}

// GetMyCredits 获取用户积分
// @Summary 获取当前用户积分
// @Tags Evaluator
// @Success 200 {object} models.UserCredit
// @Router /api/evaluator/credits [get]
func (h *EvaluatorHandler) GetMyCredits(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userIDStr := userID.(string)

	credits, err := h.paymentService.GetUserCredits(userIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, credits)
}

// GetMyTransactions 获取积分交易记录
// @Summary 获取积分交易记录
// @Tags Evaluator
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(10)
// @Success 200 {object} object
// @Router /api/evaluator/credits/transactions [get]
func (h *EvaluatorHandler) GetMyTransactions(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userIDStr := userID.(string)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	transactions, total, err := h.paymentService.GetCreditTransactions(userIDStr, page, pageSize)
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

// CreateOrder 创建支付订单
// @Summary 创建支付订单
// @Tags Evaluator
// @Accept json
// @Produce json
// @Param body body object true "Order info"
// @Success 200 {object} models.PaymentOrder
// @Router /api/evaluator/orders [post]
func (h *EvaluatorHandler) CreateOrder(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userIDStr := userID.(string)

	var req struct {
		CreditsCount int    `json:"credits_count" binding:"required,min=1"`
		PromoCode    string `json:"promo_code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	order, err := h.paymentService.CreatePaymentOrder(userIDStr, req.CreditsCount, req.PromoCode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, order)
}

// GetOrder 获取订单详情
// @Summary 获取订单详情
// @Tags Evaluator
// @Param id path string true "Order ID"
// @Success 200 {object} models.PaymentOrder
// @Router /api/evaluator/orders/{id} [get]
func (h *EvaluatorHandler) GetOrder(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userIDStr := userID.(string)

	orderID := c.Param("id")
	order, err := h.paymentService.GetOrderByID(orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	// 验证订单所有权
	if order.UserID != userIDStr {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	c.JSON(http.StatusOK, order)
}

// GetMyOrders 获取用户订单列表
// @Summary 获取用户订单列表
// @Tags Evaluator
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(10)
// @Success 200 {object} object
// @Router /api/evaluator/orders [get]
func (h *EvaluatorHandler) GetMyOrders(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userIDStr := userID.(string)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	orders, total, err := h.paymentService.GetUserOrders(userIDStr, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"orders":    orders,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// ValidatePromoCode 验证优惠码
// @Summary 验证优惠码
// @Tags Evaluator
// @Param code query string true "Promo code"
// @Success 200 {object} object
// @Router /api/evaluator/promo/validate [get]
func (h *EvaluatorHandler) ValidatePromoCode(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
		return
	}

	finalPrice, description, err := h.paymentService.ApplyPromoCode(code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":          true,
		"original_price": services.EvaluationPrice,
		"final_price":    finalPrice,
		"description":    description,
	})
}

// ConfirmOrder 用户手动确认支付
// @Summary 用户确认支付
// @Tags Evaluator
// @Accept json
// @Produce json
// @Param id path string true "Order ID"
// @Router /api/evaluator/orders/{id}/confirm [post]
func (h *EvaluatorHandler) ConfirmOrder(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userIDStr := userID.(string)

	orderID := c.Param("id")

	var req struct {
		TxHash string `json:"tx_hash"`
		Chain  string `json:"chain"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取订单
	order, err := h.paymentService.GetOrderByID(orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	// 验证订单所有权
	if order.UserID != userIDStr {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	// 验证订单状态
	if order.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "order is not pending"})
		return
	}

	// 更新订单信息（交易哈希和链）
	if req.TxHash != "" {
		_ = h.paymentService.UpdateOrderTx(orderID, req.TxHash, req.Chain)
	}

	// 注意：实际生产环境需要验证链上交易
	// 这里为了演示，直接完成订单（测试模式）
	if err := h.paymentService.CompleteOrder(orderID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 返回更新后的订单
	updatedOrder, _ := h.paymentService.GetOrderByID(orderID)
	c.JSON(http.StatusOK, updatedOrder)
}

// GetPaymentAddresses 获取支付地址
// @Summary 获取各链的支付地址
// @Tags Evaluator
// @Success 200 {object} object
// @Router /api/evaluator/payment-addresses [get]
func (h *EvaluatorHandler) GetPaymentAddresses(c *gin.Context) {
	// 实际生产环境应从配置或数据库读取
	addresses := map[string]string{
		"solana":   "WagmiPay111111111111111111111111111111111",
		"ethereum": "0x1234567890abcdef1234567890abcdef12345678",
		"bsc":      "0x1234567890abcdef1234567890abcdef12345678",
	}

	c.JSON(http.StatusOK, gin.H{
		"addresses": addresses,
		"currency":  "USDT",
	})
}

// GetPrice 获取当前价格
// @Summary 获取评估价格
// @Tags Evaluator
// @Success 200 {object} object
// @Router /api/evaluator/price [get]
func (h *EvaluatorHandler) GetPrice(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"price":    services.EvaluationPrice,
		"currency": "USDT",
	})
}

// ==================== 支付回调 ====================

// PaymentWebhook 支付回调（第三方支付网关调用）
// @Summary 支付回调
// @Tags Evaluator
// @Accept json
// @Produce json
// @Router /api/evaluator/webhook/payment [post]
func (h *EvaluatorHandler) PaymentWebhook(c *gin.Context) {
	// 这里需要根据实际使用的支付网关来实现
	// 示例：Coinbase Commerce 风格的回调

	var req struct {
		Event struct {
			Type string `json:"type"`
			Data struct {
				ID       string `json:"id"`
				Metadata struct {
					OrderID string `json:"order_id"`
				} `json:"metadata"`
				Payments []struct {
					Status   string `json:"status"`
					Chain    string `json:"chain"`
					TxHash   string `json:"transaction_id"`
					ValueUSD string `json:"value_usd"`
				} `json:"payments"`
			} `json:"data"`
		} `json:"event"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证事件类型
	if req.Event.Type != "charge:confirmed" {
		c.JSON(http.StatusOK, gin.H{"message": "ignored"})
		return
	}

	orderID := req.Event.Data.Metadata.OrderID
	if orderID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "order_id not found"})
		return
	}

	// 完成订单
	if err := h.paymentService.CompleteOrder(orderID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 更新交易信息
	if len(req.Event.Data.Payments) > 0 {
		payment := req.Event.Data.Payments[0]
		_ = h.paymentService.UpdateOrderStatus(orderID, "completed", payment.TxHash, payment.Chain)
	}

	c.JSON(http.StatusOK, gin.H{"message": "success"})
}
