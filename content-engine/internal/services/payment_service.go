package services

import (
	"content-engine/internal/config"
	"content-engine/internal/models"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// PaymentService 支付服务
type PaymentService struct {
	cfg *config.Config
	db  *gorm.DB
}

// NewPaymentService 创建支付服务
func NewPaymentService(cfg *config.Config, db *gorm.DB) *PaymentService {
	return &PaymentService{
		cfg: cfg,
		db:  db,
	}
}

// 常量
const (
	EvaluationPrice = 99.0 // USDT 价格
)

// ==================== 优惠码管理 ====================

// CreatePromoCode 创建优惠码
func (s *PaymentService) CreatePromoCode(codeType string, value float64, expiresAt *time.Time) (*models.PromoCode, error) {
	// 验证类型
	validTypes := map[string]models.PromoCodeType{
		"discount_percent": models.PromoCodeTypeDiscountPercent,
		"discount_amount":  models.PromoCodeTypeDiscountAmount,
		"free":             models.PromoCodeTypeFree,
	}
	promoCodeType, ok := validTypes[codeType]
	if !ok {
		return nil, errors.New("invalid promo code type")
	}

	// 验证值
	if codeType == "discount_percent" && (value < 1 || value > 100) {
		return nil, errors.New("discount percent must be between 1 and 100")
	}
	if codeType == "discount_amount" && value <= 0 {
		return nil, errors.New("discount amount must be positive")
	}

	// 生成唯一码
	code, err := generatePromoCode()
	if err != nil {
		return nil, err
	}

	promoCode := &models.PromoCode{
		Code:  code,
		Type:  promoCodeType,
		Value: value,
		Used:  false,
	}

	if expiresAt != nil {
		promoCode.ExpiresAt = *expiresAt
	} else {
		// 默认 30 天过期
		promoCode.ExpiresAt = time.Now().Add(30 * 24 * time.Hour)
	}

	if err := s.db.Create(promoCode).Error; err != nil {
		return nil, err
	}

	return promoCode, nil
}

// ValidatePromoCode 验证优惠码
func (s *PaymentService) ValidatePromoCode(code string) (*models.PromoCode, error) {
	var promoCode models.PromoCode
	if err := s.db.Where("code = ?", code).First(&promoCode).Error; err != nil {
		return nil, errors.New("promo code not found")
	}

	if promoCode.Used {
		return nil, errors.New("promo code already used")
	}

	if promoCode.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("promo code expired")
	}

	return &promoCode, nil
}

// ApplyPromoCode 应用优惠码并计算最终价格
func (s *PaymentService) ApplyPromoCode(code string) (float64, string, error) {
	promoCode, err := s.ValidatePromoCode(code)
	if err != nil {
		return EvaluationPrice, "", err
	}

	var finalPrice float64
	var description string

	switch promoCode.Type {
	case models.PromoCodeTypeDiscountPercent:
		discount := EvaluationPrice * promoCode.Value / 100
		finalPrice = EvaluationPrice - discount
		description = fmt.Sprintf("%.0f%% 折扣", promoCode.Value)
	case models.PromoCodeTypeDiscountAmount:
		finalPrice = EvaluationPrice - promoCode.Value
		if finalPrice < 0 {
			finalPrice = 0
		}
		description = fmt.Sprintf("减免 $%.2f", promoCode.Value)
	case models.PromoCodeTypeFree:
		finalPrice = 0
		description = "免费评估"
	}

	return finalPrice, description, nil
}

// UsePromoCode 使用优惠码
func (s *PaymentService) UsePromoCode(code, userID string) error {
	promoCode, err := s.ValidatePromoCode(code)
	if err != nil {
		return err
	}

	promoCode.Used = true
	promoCode.UsedBy = &userID
	now := time.Now()
	promoCode.UsedAt = &now

	return s.db.Save(promoCode).Error
}

// ListPromoCodes 获取优惠码列表
func (s *PaymentService) ListPromoCodes(page, pageSize int, showUsed bool) ([]models.PromoCode, int64, error) {
	var codes []models.PromoCode
	var total int64

	query := s.db.Model(&models.PromoCode{})
	if !showUsed {
		query = query.Where("used = ?", false)
	}

	query.Count(&total)

	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&codes).Error; err != nil {
		return nil, 0, err
	}

	return codes, total, nil
}

// DeletePromoCode 删除优惠码
func (s *PaymentService) DeletePromoCode(id string) error {
	return s.db.Delete(&models.PromoCode{}, "id = ?", id).Error
}

// ==================== 积分管理 ====================

// GetUserCredits 获取用户积分
func (s *PaymentService) GetUserCredits(userID string) (*models.UserCredit, error) {
	var credit models.UserCredit
	if err := s.db.Where("user_id = ?", userID).First(&credit).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 创建新记录
			credit = models.UserCredit{
				UserID:  userID,
				Credits: 0,
			}
			s.db.Create(&credit)
			return &credit, nil
		}
		return nil, err
	}
	return &credit, nil
}

// AddCredits 增加积分
func (s *PaymentService) AddCredits(userID string, amount int, transactionType models.CreditTransactionType, note string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 获取或创建用户积分
		var credit models.UserCredit
		if err := tx.Where("user_id = ?", userID).First(&credit).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				credit = models.UserCredit{
					UserID:  userID,
					Credits: 0,
				}
				tx.Create(&credit)
			} else {
				return err
			}
		}

		// 更新积分
		credit.Credits += amount
		balanceAfter := credit.Credits
		if err := tx.Save(&credit).Error; err != nil {
			return err
		}

		// 记录交易
		transaction := &models.CreditTransaction{
			UserID:       userID,
			Amount:       amount,
			Type:         transactionType,
			BalanceAfter: balanceAfter,
			Note:         note,
		}
		return tx.Create(transaction).Error
	})
}

// UseCredit 使用一次评估积分
func (s *PaymentService) UseCredit(userID string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var credit models.UserCredit
		if err := tx.Where("user_id = ?", userID).First(&credit).Error; err != nil {
			return errors.New("no credits found")
		}

		if credit.Credits <= 0 {
			return errors.New("insufficient credits")
		}

		credit.Credits--
		balanceAfter := credit.Credits
		if err := tx.Save(&credit).Error; err != nil {
			return err
		}

		// 记录交易
		transaction := &models.CreditTransaction{
			UserID:       userID,
			Amount:       -1,
			Type:         models.CreditTransactionTypeUse,
			BalanceAfter: balanceAfter,
			Note:         "使用评估积分",
		}
		return tx.Create(transaction).Error
	})
}

// GetCreditTransactions 获取用户积分交易记录
func (s *PaymentService) GetCreditTransactions(userID string, page, pageSize int) ([]models.CreditTransaction, int64, error) {
	var transactions []models.CreditTransaction
	var total int64

	s.db.Model(&models.CreditTransaction{}).Where("user_id = ?", userID).Count(&total)

	offset := (page - 1) * pageSize
	if err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&transactions).Error; err != nil {
		return nil, 0, err
	}

	return transactions, total, nil
}

// ==================== 订单管理 ====================

// CreatePaymentOrder 创建支付订单
func (s *PaymentService) CreatePaymentOrder(userID string, creditsCount int, promoCodeStr string) (*models.PaymentOrder, error) {
	originalAmount := EvaluationPrice * float64(creditsCount)
	finalAmount := originalAmount
	var usedPromoCode string

	// 应用优惠码
	if promoCodeStr != "" {
		promo, err := s.ValidatePromoCode(promoCodeStr)
		if err != nil {
			return nil, err
		}

		switch promo.Type {
		case models.PromoCodeTypeDiscountPercent:
			finalAmount = originalAmount * (100 - promo.Value) / 100
		case models.PromoCodeTypeDiscountAmount:
			finalAmount = originalAmount - promo.Value
			if finalAmount < 0 {
				finalAmount = 0
			}
		case models.PromoCodeTypeFree:
			finalAmount = 0
		}

		usedPromoCode = promo.Code
	}

	order := &models.PaymentOrder{
		UserID:      userID,
		Amount:      originalAmount,
		FinalAmount: finalAmount,
		Currency:    "USDT",
		Credits:     creditsCount,
		Status:      models.PaymentStatusPending,
		PromoCode:   usedPromoCode,
		ExpiresAt:   time.Now().Add(30 * time.Minute), // 30 分钟有效期
	}

	if err := s.db.Create(order).Error; err != nil {
		return nil, err
	}

	return order, nil
}

// UpdateOrderStatus 更新订单状态
func (s *PaymentService) UpdateOrderStatus(orderID, status, txHash, chainType string) error {
	updates := map[string]interface{}{
		"status": models.PaymentStatus(status),
	}
	if txHash != "" {
		updates["payment_tx"] = txHash
	}
	if chainType != "" {
		updates["chain"] = chainType
	}
	if status == "completed" {
		now := time.Now()
		updates["completed_at"] = now
	}

	return s.db.Model(&models.PaymentOrder{}).Where("id = ?", orderID).Updates(updates).Error
}

// CompleteOrder 完成订单并添加积分
func (s *PaymentService) CompleteOrder(orderID string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var order models.PaymentOrder
		if err := tx.Where("id = ?", orderID).First(&order).Error; err != nil {
			return err
		}

		if order.Status != models.PaymentStatusPending {
			return errors.New("order already processed")
		}

		// 更新订单状态
		now := time.Now()
		order.Status = models.PaymentStatusCompleted
		order.CompletedAt = &now
		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// 使用优惠码
		if order.PromoCode != "" {
			var promoCode models.PromoCode
			if err := tx.Where("code = ?", order.PromoCode).First(&promoCode).Error; err == nil {
				promoCode.Used = true
				promoCode.UsedBy = &order.UserID
				promoCode.UsedAt = &now
				tx.Save(&promoCode)
			}
		}

		// 添加积分
		var credit models.UserCredit
		if err := tx.Where("user_id = ?", order.UserID).First(&credit).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				credit = models.UserCredit{
					UserID:  order.UserID,
					Credits: order.Credits,
				}
				tx.Create(&credit)
			} else {
				return err
			}
		} else {
			credit.Credits += order.Credits
			tx.Save(&credit)
		}

		// 记录交易
		transaction := &models.CreditTransaction{
			UserID:       order.UserID,
			Amount:       order.Credits,
			Type:         models.CreditTransactionTypePurchase,
			BalanceAfter: credit.Credits,
			PromoCode:    order.PromoCode,
			PricePaid:    order.FinalAmount,
			Note:         fmt.Sprintf("购买 %d 次评估", order.Credits),
		}
		return tx.Create(transaction).Error
	})
}

// GetOrderByID 获取订单
func (s *PaymentService) GetOrderByID(orderID string) (*models.PaymentOrder, error) {
	var order models.PaymentOrder
	if err := s.db.Where("id = ?", orderID).First(&order).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

// UpdateOrderTx 更新订单交易信息
func (s *PaymentService) UpdateOrderTx(orderID, txHash, chain string) error {
	return s.db.Model(&models.PaymentOrder{}).
		Where("id = ?", orderID).
		Updates(map[string]interface{}{
			"payment_tx": txHash,
			"chain":      chain,
		}).Error
}

// GetUserOrders 获取用户订单列表
func (s *PaymentService) GetUserOrders(userID string, page, pageSize int) ([]models.PaymentOrder, int64, error) {
	var orders []models.PaymentOrder
	var total int64

	s.db.Model(&models.PaymentOrder{}).Where("user_id = ?", userID).Count(&total)

	offset := (page - 1) * pageSize
	if err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&orders).Error; err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

// ==================== 辅助函数 ====================

// generatePromoCode 生成优惠码
func generatePromoCode() (string, error) {
	bytes := make([]byte, 6)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "WAGMI-" + hex.EncodeToString(bytes)[:8], nil
}

// GiftCredits 管理员赠送积分
func (s *PaymentService) GiftCredits(userID string, amount int, reason string) error {
	return s.AddCredits(userID, amount, models.CreditTransactionTypeGift, reason)
}

// RefundCredits 退还积分
func (s *PaymentService) RefundCredits(userID string, amount int, reason string) error {
	return s.AddCredits(userID, amount, models.CreditTransactionTypeRefund, reason)
}
