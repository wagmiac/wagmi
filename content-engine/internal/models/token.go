package models

import (
	"time"
)

// Token 代币模型
type Token struct {
	ID              string     `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name            string     `json:"name" gorm:"type:varchar(255);not null"`                  // 代币全称
	Symbol          string     `json:"symbol" gorm:"type:varchar(50);not null;index"`           // 代币简称 (大写)
	Logo            string     `json:"logo" gorm:"type:text;not null"`                          // 图标URL
	Description     string     `json:"description" gorm:"type:text;not null"`                   // 描述
	Website         *string    `json:"website" gorm:"type:varchar(500)"`                        // 网站
	Twitter         *string    `json:"twitter" gorm:"type:varchar(500)"`                        // Twitter
	Telegram        *string    `json:"telegram" gorm:"type:varchar(500)"`                       // Telegram
	ContractAddress *string    `json:"contract_address" gorm:"type:varchar(255);uniqueIndex"`   // 合约地址
	Chain           string     `json:"chain" gorm:"type:varchar(50);not null;default:''"`       // 公链
	Status          string     `json:"status" gorm:"type:varchar(20);not null;default:'draft'"` // draft/published
	MarketCap       *string    `json:"market_cap" gorm:"type:varchar(50)"`                      // 市值
	Price           *string    `json:"price" gorm:"type:varchar(50)"`                           // 价格
	Volume24h       *string    `json:"volume_24h" gorm:"type:varchar(50)"`                      // 24小时交易量
	Holders         *int       `json:"holders"`                                                 // 持有人数
	CreatedAt       time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt       time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	PublishedAt     *time.Time `json:"published_at"` // 发布时间
}

func (Token) TableName() string {
	return "tokens"
}

// TokenStats 代币统计历史
type TokenStats struct {
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	TokenID   string    `json:"token_id" gorm:"type:uuid;not null;index"`
	Price     string    `json:"price" gorm:"type:varchar(50)"`
	MarketCap string    `json:"market_cap" gorm:"type:varchar(50)"`
	Volume24h string    `json:"volume_24h" gorm:"type:varchar(50)"`
	Holders   int       `json:"holders"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;index:idx_token_time"`
}

func (TokenStats) TableName() string {
	return "token_stats"
}
