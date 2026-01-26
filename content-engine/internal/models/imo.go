package models

import (
	"time"
)

// ProjectStatus 项目状态
type ProjectStatus string

const (
	ProjectStatusDiscovering ProjectStatus = "discovering" // 发掘中（等待第一个出价）
	ProjectStatusAuctioning  ProjectStatus = "auctioning"  // 竞拍中
	ProjectStatusLaunching   ProjectStatus = "launching"   // 发射中
	ProjectStatusLaunched    ProjectStatus = "launched"    // 已发射
	ProjectStatusFailed      ProjectStatus = "failed"      // 失败
)

// Chain 支持的区块链
type Chain string

const (
	ChainSolana Chain = "solana"
	ChainBSC    Chain = "bsc"
)

// Launchpad 发射台
type Launchpad string

const (
	LaunchpadPumpFun   Launchpad = "pump.fun"
	LaunchpadTrendsFun Launchpad = "trends.fun"
	LaunchpadBagsFM    Launchpad = "bags.fm"
	LaunchpadFlapSH    Launchpad = "flap.sh"
)

// Project IMO 项目
type Project struct {
	ID          string        `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Ticker      string        `json:"ticker" gorm:"type:varchar(20);uniqueIndex;not null"` // 代币符号，如 $CURSOR
	Name        string        `json:"name" gorm:"type:varchar(100);not null"`              // 项目名称
	Logo        string        `json:"logo" gorm:"type:text"`                               // Logo URL
	Description string        `json:"description" gorm:"type:text"`                        // 项目描述
	Website     string        `json:"website" gorm:"type:text"`                            // 官网链接
	Twitter     string        `json:"twitter" gorm:"type:text"`                            // Twitter 链接
	Github      string        `json:"github" gorm:"type:text"`                             // GitHub 链接
	Status      ProjectStatus `json:"status" gorm:"type:varchar(20);default:'discovering'"`
	Chain       Chain         `json:"chain" gorm:"type:varchar(20);not null"`
	Launchpad   Launchpad     `json:"launchpad" gorm:"type:varchar(50)"`

	// 发掘信息
	ScoutID        string    `json:"scout_id" gorm:"type:uuid;index"`           // 伯乐用户 ID
	ScoutWallet    string    `json:"scout_wallet" gorm:"type:varchar(255)"`     // 伯乐钱包地址
	DiscoveredAt   time.Time `json:"discovered_at" gorm:"autoCreateTime"`       // 发掘时间
	DiscoverTxHash string    `json:"discover_tx_hash" gorm:"type:varchar(255)"` // 发掘支付交易哈希

	// 竞拍信息
	CurrentBidAmount  float64    `json:"current_bid_amount" gorm:"type:decimal(20,8);default:0"`
	CurrentBidderID   string     `json:"current_bidder_id" gorm:"type:uuid"`
	CurrentBidder     string     `json:"current_bidder" gorm:"type:varchar(255)"` // 当前最高出价者钱包
	BidCount          int        `json:"bid_count" gorm:"default:0"`
	AuctionStartedAt  *time.Time `json:"auction_started_at"`
	AuctionEndsAt     *time.Time `json:"auction_ends_at"`
	AuctionExtensions int        `json:"auction_extensions" gorm:"default:0"` // 累计延长次数

	// 发射信息
	TokenAddress     string     `json:"token_address" gorm:"type:varchar(255)"`      // 代币合约地址
	DevWalletAddress string     `json:"dev_wallet_address" gorm:"type:varchar(255)"` // Dev 钱包地址
	DevWalletKey     string     `json:"-" gorm:"type:text"`                          // Dev 钱包私钥（加密存储）
	LaunchedAt       *time.Time `json:"launched_at"`
	LaunchTxHash     string     `json:"launch_tx_hash" gorm:"type:varchar(255)"`

	// 创作者认领
	CreatorID      string     `json:"creator_id" gorm:"type:uuid"`
	CreatorWallet  string     `json:"creator_wallet" gorm:"type:varchar(255)"`
	ClaimedAt      *time.Time `json:"claimed_at"`
	VerifyTwitter  bool       `json:"verify_twitter" gorm:"default:false"`
	VerifyGithub   bool       `json:"verify_github" gorm:"default:false"`
	VerifyWebsite  bool       `json:"verify_website" gorm:"default:false"`
	VerifyOfficial bool       `json:"verify_official" gorm:"default:false"`

	// 元数据
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// 关联
	Bids           []Bid           `json:"bids,omitempty" gorm:"foreignKey:ProjectID"`
	TimelineEvents []TimelineEvent `json:"timeline_events,omitempty" gorm:"foreignKey:ProjectID"`
}

func (Project) TableName() string {
	return "imo_projects"
}

// Bid 竞拍出价
type Bid struct {
	ID        string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID string    `json:"project_id" gorm:"type:uuid;index;not null"`
	UserID    string    `json:"user_id" gorm:"type:uuid;index"`
	Bidder    string    `json:"bidder" gorm:"type:varchar(255);not null"` // 钱包地址
	Amount    float64   `json:"amount" gorm:"type:decimal(20,8);not null"`
	Currency  string    `json:"currency" gorm:"type:varchar(10);not null"` // SOL, BNB
	TxHash    string    `json:"tx_hash" gorm:"type:varchar(255)"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (Bid) TableName() string {
	return "imo_bids"
}

// TimelineEventType 时间线事件类型
type TimelineEventType string

const (
	TimelineEventDiscovered TimelineEventType = "discovered"
	TimelineEventBid        TimelineEventType = "bid"
	TimelineEventAuctionEnd TimelineEventType = "auction_end"
	TimelineEventLaunched   TimelineEventType = "launched"
	TimelineEventClaimed    TimelineEventType = "claimed"
	TimelineEventVerified   TimelineEventType = "verified"
)

// TimelineEvent 项目时间线事件
type TimelineEvent struct {
	ID        string            `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID string            `json:"project_id" gorm:"type:uuid;index;not null"`
	Type      TimelineEventType `json:"type" gorm:"type:varchar(30);not null"`
	Actor     string            `json:"actor" gorm:"type:varchar(255)"`      // 操作者钱包地址
	ActorName string            `json:"actor_name" gorm:"type:varchar(100)"` // 操作者名称
	Data      JSONMap           `json:"data" gorm:"type:jsonb;default:'{}'"` // 事件附加数据
	CreatedAt time.Time         `json:"created_at" gorm:"autoCreateTime"`
}

func (TimelineEvent) TableName() string {
	return "imo_timeline_events"
}

// IMOUser IMO 用户（钱包用户）
type IMOUser struct {
	ID      string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Wallet  string `json:"wallet" gorm:"type:varchar(255);uniqueIndex;not null"` // 主钱包地址
	Chain   Chain  `json:"chain" gorm:"type:varchar(20)"`                        // 主钱包链
	Name    string `json:"name" gorm:"type:varchar(100)"`
	Avatar  string `json:"avatar" gorm:"type:text"`
	Twitter string `json:"twitter" gorm:"type:varchar(100)"`
	Github  string `json:"github" gorm:"type:varchar(100)"`
	Website string `json:"website" gorm:"type:text"`

	// 统计
	ProjectsDiscovered int     `json:"projects_discovered" gorm:"default:0"`
	BidsPlaced         int     `json:"bids_placed" gorm:"default:0"`
	AuctionsWon        int     `json:"auctions_won" gorm:"default:0"`
	TotalRevenue       float64 `json:"total_revenue" gorm:"type:decimal(20,8);default:0"`

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (IMOUser) TableName() string {
	return "imo_users"
}

// RevenueRecord 分成记录
type RevenueRecord struct {
	ID            string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID     string    `json:"project_id" gorm:"type:uuid;index;not null"`
	Amount        float64   `json:"amount" gorm:"type:decimal(20,8);not null"`
	Currency      string    `json:"currency" gorm:"type:varchar(10);not null"` // SOL, BNB
	FromWallet    string    `json:"from_wallet" gorm:"type:varchar(255)"`      // Dev钱包地址
	ToWallet      string    `json:"to_wallet" gorm:"type:varchar(255)"`        // 接收方钱包
	RecipientType string    `json:"recipient_type" gorm:"type:varchar(20)"`    // creator, scout, platform
	TxHash        string    `json:"tx_hash" gorm:"type:varchar(255)"`
	CreatedAt     time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (RevenueRecord) TableName() string {
	return "imo_revenue_records"
}

// ClaimRequest 认领申请
type ClaimRequest struct {
	ID              string     `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID       string     `json:"project_id" gorm:"type:uuid;index;not null"`
	ApplicantWallet string     `json:"applicant_wallet" gorm:"type:varchar(255);not null"`
	ProofType       string     `json:"proof_type" gorm:"type:varchar(20)"` // twitter, github, website, other
	ProofURL        string     `json:"proof_url" gorm:"type:text"`
	Status          string     `json:"status" gorm:"type:varchar(20);default:'pending'"` // pending, approved, rejected
	ReviewedAt      *time.Time `json:"reviewed_at"`
	ReviewNote      string     `json:"review_note" gorm:"type:text"`
	CreatedAt       time.Time  `json:"created_at" gorm:"autoCreateTime"`
}

func (ClaimRequest) TableName() string {
	return "imo_claim_requests"
}
