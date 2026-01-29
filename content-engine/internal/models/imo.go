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
	LaunchpadFourMeme  Launchpad = "four.meme"
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
	Telegram    string        `json:"telegram" gorm:"type:text"`                           // Telegram 链接
	Github      string        `json:"github" gorm:"type:text"`                             // GitHub 链接
	ProductHunt string        `json:"product_hunt" gorm:"type:text"`                       // Product Hunt 链接
	Discord     string        `json:"discord" gorm:"type:text"`                            // Discord 链接
	Reddit      string        `json:"reddit" gorm:"type:text"`                             // Reddit 链接
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
	CurrentBidderID   *string    `json:"current_bidder_id" gorm:"type:uuid"`
	CurrentBidder     string     `json:"current_bidder" gorm:"type:varchar(255)"` // 当前最高出价者钱包
	BidCount          int        `json:"bid_count" gorm:"default:0"`
	AuctionStartedAt  *time.Time `json:"auction_started_at"`
	AuctionEndsAt     *time.Time `json:"auction_ends_at"`
	AuctionExtensions int        `json:"auction_extensions" gorm:"default:0"` // 累计延长次数

	// 发射信息
	TokenAddress     string `json:"token_address" gorm:"type:varchar(255)"`      // 代币合约地址
	DevWalletAddress string `json:"dev_wallet_address" gorm:"type:varchar(255)"` // Dev 钱包地址 (deprecated, 保留兼容)
	DevWalletKey     string `json:"-" gorm:"type:text"`                          // Dev 钱包私钥（加密存储, deprecated）

	// 多发射台钱包支持 - 每个发射台一个独立钱包
	// 格式: {"pump.fun": "地址", "four.meme": "地址", ...}
	LaunchpadWallets JSONMap `json:"launchpad_wallets" gorm:"type:text"` // 各发射台的 Dev 钱包地址
	LaunchpadKeys    JSONMap `json:"-" gorm:"type:text"`                 // 各发射台的 Dev 钱包私钥（加密存储）

	// 多发射台支持 - 存储各发射台的代币地址
	LaunchedPads   JSONArray `json:"launched_pads" gorm:"type:text"`   // 已发射的发射台列表 ["pump.fun", "four.meme"]
	TokenAddresses JSONMap   `json:"token_addresses" gorm:"type:text"` // 各发射台代币地址 {"pump.fun": "xxx", "four.meme": "xxx"}

	LaunchedAt   *time.Time `json:"launched_at"`
	LaunchTxHash string     `json:"launch_tx_hash" gorm:"type:varchar(255)"`

	// 创作者认领
	CreatorID      *string    `json:"creator_id" gorm:"type:uuid"`
	CreatorWallet  string     `json:"creator_wallet" gorm:"type:varchar(255)"`
	ClaimedAt      *time.Time `json:"claimed_at"`
	VerifyTwitter  bool       `json:"verify_twitter" gorm:"default:false"`
	VerifyGithub   bool       `json:"verify_github" gorm:"default:false"`
	VerifyWebsite  bool       `json:"verify_website" gorm:"default:false"`
	VerifyOfficial bool       `json:"verify_official" gorm:"default:false"`

	// 评估状态
	IsEvaluating bool `json:"is_evaluating" gorm:"default:false"` // 是否正在评估中

	// AI 评估缓存
	EvalOverallGrade string `json:"eval_overall_grade" gorm:"type:varchar(5)"` // 综合评级缓存 S/A/B/C/D
	EvalSummary      string `json:"eval_summary" gorm:"type:text"`             // 评估摘要缓存

	// GitHub 热度数据（缓存）
	GithubStars        int        `json:"github_stars" gorm:"default:0"`
	GithubForks        int        `json:"github_forks" gorm:"default:0"`
	GithubContributors int        `json:"github_contributors" gorm:"default:0"`
	GithubHotLevel     string     `json:"github_hot_level" gorm:"type:varchar(20)"` // explosive/hot/warm/normal/cold
	GithubHotReason    string     `json:"github_hot_reason" gorm:"type:text"`       // 热度原因
	GithubStarsPerDay  float64    `json:"github_stars_per_day" gorm:"type:decimal(10,4);default:0"`
	GithubDaysCreated  int        `json:"github_days_created" gorm:"default:0"` // 创建至今天数
	GithubLastCommit   int        `json:"github_last_commit" gorm:"default:0"`  // 最后提交距今天数
	GithubUpdatedAt    *time.Time `json:"github_updated_at"`                    // GitHub数据更新时间

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

// ProjectComment 项目讨论/评论
type ProjectComment struct {
	ID        string  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID string  `json:"project_id" gorm:"type:uuid;not null;index"` // 关联项目
	UserID    string  `json:"user_id" gorm:"type:uuid;not null;index"`    // 关联 IMOUser.ID
	Wallet    string  `json:"wallet" gorm:"type:varchar(255)"`            // 用户钱包地址（冗余，方便显示）
	Nickname  string  `json:"nickname" gorm:"type:varchar(100)"`          // 用户昵称
	Content   string  `json:"content" gorm:"type:text;not null"`          // 评论内容
	ParentID  *string `json:"parent_id" gorm:"type:uuid;index"`           // 父评论ID (支持回复)

	// 统计
	LikeCount int `json:"like_count" gorm:"default:0"` // 点赞数

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (ProjectComment) TableName() string {
	return "imo_project_comments"
}

// LaunchOrderStatus 发射订单状态
type LaunchOrderStatus string

const (
	LaunchOrderStatusPending   LaunchOrderStatus = "pending"   // 等待支付
	LaunchOrderStatusPaid      LaunchOrderStatus = "paid"      // 已支付
	LaunchOrderStatusLaunching LaunchOrderStatus = "launching" // 发射中
	LaunchOrderStatusSuccess   LaunchOrderStatus = "success"   // 发射成功
	LaunchOrderStatusFailed    LaunchOrderStatus = "failed"    // 发射失败
	LaunchOrderStatusRefunded  LaunchOrderStatus = "refunded"  // 已退款
)

// LaunchOrder 发射订单
type LaunchOrder struct {
	ID         string  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID  string  `json:"project_id" gorm:"type:uuid;index;not null"`
	UserID     *string `json:"user_id" gorm:"type:uuid;index"`                // 发起发射的用户（可选）
	UserWallet string  `json:"user_wallet" gorm:"type:varchar(255);not null"` // 用户钱包地址（用于接收代币）

	// 发射配置
	Chain     Chain     `json:"chain" gorm:"type:varchar(20);not null"`
	Launchpad Launchpad `json:"launchpad" gorm:"type:varchar(50);not null"`
	TaxRate   int       `json:"tax_rate" gorm:"type:int;default:0"` // flap.sh 税率（基点，0=无税，100=1%，300=3%）

	// 首单购买金额
	FirstBuyAmount float64 `json:"first_buy_amount" gorm:"type:decimal(20,8);not null"` // 首单购买金额
	GasFee         float64 `json:"gas_fee" gorm:"type:decimal(20,8);default:0"`         // 预留 gas 费

	// 支付钱包（系统生成，用于接收用户付款）
	PaymentWalletAddress string `json:"payment_wallet_address" gorm:"type:varchar(255)"`
	PaymentWalletKey     string `json:"-" gorm:"type:text"` // 加密存储

	// 支付信息
	PaymentAmount      float64    `json:"payment_amount" gorm:"type:decimal(20,8);default:0"` // 实际收到的金额
	PaymentTxHash      string     `json:"payment_tx_hash" gorm:"type:varchar(255)"`           // 支付交易哈希
	PaymentConfirmedAt *time.Time `json:"payment_confirmed_at"`                               // 支付确认时间

	// 发射结果
	TokenAddress    string  `json:"token_address" gorm:"type:varchar(255)"`     // 代币合约地址
	LaunchTxHash    string  `json:"launch_tx_hash" gorm:"type:varchar(255)"`    // 发射交易哈希
	TokenTransferTx string  `json:"token_transfer_tx" gorm:"type:varchar(255)"` // 代币转账交易哈希
	TokensReceived  float64 `json:"tokens_received" gorm:"type:decimal(30,8)"`  // 用户收到的代币数量

	// 状态
	Status   LaunchOrderStatus `json:"status" gorm:"type:varchar(20);default:'pending'"`
	ErrorMsg string            `json:"error_msg" gorm:"type:text"`

	// 时间
	CreatedAt  time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt  time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	ExpiresAt  *time.Time `json:"expires_at"`  // 支付过期时间
	LaunchedAt *time.Time `json:"launched_at"` // 发射完成时间
}

func (LaunchOrder) TableName() string {
	return "imo_launch_orders"
}
