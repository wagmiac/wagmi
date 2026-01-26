package models

import (
	"time"
)

// ==================== Product Hunt 评估相关模型 ====================

// PHProduct Product Hunt 产品数据
type PHProduct struct {
	ID          string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	PHID        string    `json:"ph_id" gorm:"type:varchar(100);uniqueIndex"` // Product Hunt 原始 ID
	Slug        string    `json:"slug" gorm:"type:varchar(200);index"`        // URL slug
	Name        string    `json:"name" gorm:"type:varchar(200);not null"`     // 产品名称
	Tagline     string    `json:"tagline" gorm:"type:text"`                   // 一句话介绍
	Description string    `json:"description" gorm:"type:text"`               // 详细描述
	URL         string    `json:"url" gorm:"type:text"`                       // 官网链接
	Thumbnail   string    `json:"thumbnail" gorm:"type:text"`                 // 产品图片
	Topics      JSONArray `json:"topics" gorm:"type:jsonb;default:'[]'"`      // 标签

	// 社交数据
	Upvotes        int `json:"upvotes" gorm:"default:0"`         // 投票数
	CommentsCount  int `json:"comments_count" gorm:"default:0"`  // 评论数
	ReviewsCount   int `json:"reviews_count" gorm:"default:0"`   // 评价数
	FollowersCount int `json:"followers_count" gorm:"default:0"` // 关注数

	// Maker 信息
	MakerName          string `json:"maker_name" gorm:"type:varchar(200)"`    // Maker 名称
	MakerHeadline      string `json:"maker_headline" gorm:"type:text"`        // Maker 简介
	MakerTwitter       string `json:"maker_twitter" gorm:"type:varchar(100)"` // Maker Twitter
	MakerProductsCount int    `json:"maker_products_count" gorm:"default:0"`  // Maker 产品数量

	// 发布信息
	FeaturedAt *time.Time `json:"featured_at"`                  // 上榜时间
	LaunchRank int        `json:"launch_rank" gorm:"default:0"` // 发布排名

	// 原始数据
	RawData string `json:"raw_data" gorm:"type:text"` // 完整 API 响应 JSON

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (PHProduct) TableName() string {
	return "ph_products"
}

// PHEvaluation 评估报告
type PHEvaluation struct {
	ID        string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProductID string `json:"product_id" gorm:"type:uuid;not null;index"` // 关联产品

	// 评分（1-10）
	ScoreProduct   int `json:"score_product" gorm:"default:0"`   // 产品力
	ScoreCommunity int `json:"score_community" gorm:"default:0"` // 社区热度
	ScoreAIGC      int `json:"score_aigc" gorm:"default:0"`      // AIGC 相关性
	ScoreMaker     int `json:"score_maker" gorm:"default:0"`     // Maker 信誉
	ScoreMeme      int `json:"score_meme" gorm:"default:0"`      // Meme 潜力
	ScoreTotal     int `json:"score_total" gorm:"default:0"`     // 综合评分（0-100）

	// 报告内容
	ProductAnalysis   string `json:"product_analysis" gorm:"type:text"`   // 产品分析
	AIGCAnalysis      string `json:"aigc_analysis" gorm:"type:text"`      // AIGC 判定
	MakerAnalysis     string `json:"maker_analysis" gorm:"type:text"`     // Maker 背景
	CommunityFeedback string `json:"community_feedback" gorm:"type:text"` // 社区反馈摘要
	MemeAnalysis      string `json:"meme_analysis" gorm:"type:text"`      // Meme 潜力分析
	RiskWarning       string `json:"risk_warning" gorm:"type:text"`       // 风险提示
	TokenSuggestion   string `json:"token_suggestion" gorm:"type:text"`   // 代币化建议
	RecommendLevel    int    `json:"recommend_level" gorm:"default:0"`    // 推荐等级（1-5星）

	// 完整报告
	FullReport string `json:"full_report" gorm:"type:text"` // 完整 Markdown 报告

	// 请求者
	RequestedBy *string `json:"requested_by" gorm:"type:uuid"` // 请求评估的用户 ID

	// 关联
	Product PHProduct `json:"product,omitempty" gorm:"foreignKey:ProductID"`

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (PHEvaluation) TableName() string {
	return "ph_evaluations"
}

// ==================== 优惠码相关模型 ====================

// PromoCodeType 优惠码类型
type PromoCodeType string

const (
	PromoCodeTypeDiscountPercent PromoCodeType = "discount_percent" // 折扣百分比（如 20 表示 8 折）
	PromoCodeTypeDiscountAmount  PromoCodeType = "discount_amount"  // 固定减免金额
	PromoCodeTypeFree            PromoCodeType = "free"             // 完全免单
)

// PromoCode 优惠码
type PromoCode struct {
	ID        string        `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Code      string        `json:"code" gorm:"type:varchar(50);uniqueIndex;not null"` // 优惠码
	Type      PromoCodeType `json:"type" gorm:"type:varchar(30);not null"`             // 类型
	Value     float64       `json:"value" gorm:"default:0"`                            // 值（折扣比例或金额）
	ExpiresAt time.Time     `json:"expires_at"`                                        // 过期时间
	Used      bool          `json:"used" gorm:"default:false"`                         // 是否已使用
	UsedBy    *string       `json:"used_by" gorm:"type:uuid"`                          // 使用者用户 ID
	UsedAt    *time.Time    `json:"used_at"`                                           // 使用时间
	CreatedBy string        `json:"created_by" gorm:"type:uuid"`                       // 创建者（管理员）
	Note      string        `json:"note" gorm:"type:text"`                             // 备注

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (PromoCode) TableName() string {
	return "promo_codes"
}

// IsValid 检查优惠码是否有效
func (p *PromoCode) IsValid() bool {
	if p.Used {
		return false
	}
	if time.Now().After(p.ExpiresAt) {
		return false
	}
	return true
}

// CalculateDiscount 计算优惠后价格
func (p *PromoCode) CalculateDiscount(originalPrice float64) float64 {
	switch p.Type {
	case PromoCodeTypeFree:
		return 0
	case PromoCodeTypeDiscountPercent:
		// Value 表示折扣比例，如 20 表示打 8 折
		return originalPrice * (100 - p.Value) / 100
	case PromoCodeTypeDiscountAmount:
		// Value 表示减免金额
		result := originalPrice - p.Value
		if result < 0 {
			return 0
		}
		return result
	default:
		return originalPrice
	}
}

// ==================== 用户额度相关模型 ====================

// UserCredit 用户评估额度
type UserCredit struct {
	ID        string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    string    `json:"user_id" gorm:"type:uuid;uniqueIndex;not null"` // 用户 ID
	Credits   int       `json:"credits" gorm:"default:0"`                      // 剩余评估次数
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (UserCredit) TableName() string {
	return "user_credits"
}

// CreditTransactionType 额度交易类型
type CreditTransactionType string

const (
	CreditTransactionTypePurchase CreditTransactionType = "purchase" // 购买
	CreditTransactionTypeUse      CreditTransactionType = "use"      // 使用
	CreditTransactionTypeRefund   CreditTransactionType = "refund"   // 退款
	CreditTransactionTypeGift     CreditTransactionType = "gift"     // 赠送
)

// CreditTransaction 额度交易记录
type CreditTransaction struct {
	ID           string                `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID       string                `json:"user_id" gorm:"type:uuid;not null;index"` // 用户 ID
	Type         CreditTransactionType `json:"type" gorm:"type:varchar(30);not null"`   // 交易类型
	Amount       int                   `json:"amount" gorm:"not null"`                  // 变动数量（正/负）
	BalanceAfter int                   `json:"balance_after" gorm:"default:0"`          // 交易后余额
	PaymentTx    string                `json:"payment_tx" gorm:"type:varchar(200)"`     // 链上交易哈希
	PromoCode    string                `json:"promo_code" gorm:"type:varchar(50)"`      // 使用的优惠码
	PricePaid    float64               `json:"price_paid" gorm:"default:0"`             // 实际支付金额（USDT）
	ProductID    string                `json:"product_id" gorm:"type:uuid"`             // 关联产品（使用时）
	Note         string                `json:"note" gorm:"type:text"`                   // 备注

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (CreditTransaction) TableName() string {
	return "credit_transactions"
}

// ==================== 支付相关模型 ====================

// PaymentStatus 支付状态
type PaymentStatus string

const (
	PaymentStatusPending   PaymentStatus = "pending"   // 待支付
	PaymentStatusCompleted PaymentStatus = "completed" // 已完成
	PaymentStatusFailed    PaymentStatus = "failed"    // 失败
	PaymentStatusExpired   PaymentStatus = "expired"   // 已过期
)

// PaymentOrder 支付订单
type PaymentOrder struct {
	ID            string        `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID        string        `json:"user_id" gorm:"type:uuid;not null;index"`          // 用户 ID
	Amount        float64       `json:"amount" gorm:"not null"`                           // 原始金额
	FinalAmount   float64       `json:"final_amount" gorm:"not null"`                     // 实际金额（优惠后）
	Currency      string        `json:"currency" gorm:"type:varchar(20);default:'USDT'"`  // 支付币种
	Chain         string        `json:"chain" gorm:"type:varchar(20);default:'solana'"`   // 支付链
	Status        PaymentStatus `json:"status" gorm:"type:varchar(20);default:'pending'"` // 支付状态
	PromoCode     string        `json:"promo_code" gorm:"type:varchar(50)"`               // 优惠码
	Credits       int           `json:"credits" gorm:"default:1"`                         // 购买额度数
	PaymentTx     string        `json:"payment_tx" gorm:"type:varchar(200)"`              // 链上交易哈希
	PaymentMethod string        `json:"payment_method" gorm:"type:varchar(50)"`           // 支付方式
	ExternalID    string        `json:"external_id" gorm:"type:varchar(200)"`             // 第三方订单 ID
	ExpiresAt     time.Time     `json:"expires_at"`                                       // 订单过期时间

	CreatedAt   time.Time  `json:"created_at" gorm:"autoCreateTime"`
	CompletedAt *time.Time `json:"completed_at"` // 完成时间
	UpdatedAt   time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (PaymentOrder) TableName() string {
	return "payment_orders"
}
