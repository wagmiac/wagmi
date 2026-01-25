package models

import (
	"content-engine/internal/config"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Content 内容模型
type Content struct {
	ID         string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Slug       string    `json:"slug" gorm:"type:varchar(200);uniqueIndex"`    // URL 友好的 slug
	Source     string    `json:"source" gorm:"type:varchar(50);not null"`      // twitter, indie_hackers, manual
	SourceURL  string    `json:"source_url" gorm:"type:text"`                  // 原始链接 (用于去重)
	Author     string    `json:"author" gorm:"type:varchar(100)"`              // 原作者
	RawContent string    `json:"raw_content" gorm:"type:text;not null"`        // 原始内容
	ContentZh  string    `json:"content_zh" gorm:"type:text"`                  // 中文加工内容
	ContentEn  string    `json:"content_en" gorm:"type:text"`                  // 英文加工内容
	Tags       JSONArray `json:"tags" gorm:"type:jsonb;default:'[]'"`          // 标签数组
	Revenue    string    `json:"revenue" gorm:"type:text"`                     // 收入数据 (原始)
	Status     string    `json:"status" gorm:"type:varchar(20);default:'raw'"` // raw -> published (全自动)

	// AI提炼结构化数据 (中英文双版本)
	CoreIdea      string    `json:"core_idea" gorm:"type:text"`                   // 核心创意 (兼容旧数据)
	CoreIdeaZh    string    `json:"core_idea_zh" gorm:"type:text"`                // 核心创意-中文
	CoreIdeaEn    string    `json:"core_idea_en" gorm:"type:text"`                // 核心创意-英文
	RevenueData   string    `json:"revenue_data" gorm:"type:text"`                // 收入数据 (结构化-兼容)
	RevenueDataZh string    `json:"revenue_data_zh" gorm:"type:text"`             // 收入数据-中文
	RevenueDataEn string    `json:"revenue_data_en" gorm:"type:text"`             // 收入数据-英文
	KeyPoints     JSONArray `json:"key_points" gorm:"type:jsonb;default:'[]'"`    // 关键点 (兼容旧数据)
	KeyPointsZh   JSONArray `json:"key_points_zh" gorm:"type:jsonb;default:'[]'"` // 关键点-中文
	KeyPointsEn   JSONArray `json:"key_points_en" gorm:"type:jsonb;default:'[]'"` // 关键点-英文
	TargetUsers   string    `json:"target_users" gorm:"type:text"`                // 目标受众 (兼容旧数据)
	TargetUsersZh string    `json:"target_users_zh" gorm:"type:text"`             // 目标受众-中文
	TargetUsersEn string    `json:"target_users_en" gorm:"type:text"`             // 目标受众-英文
	OriginalLang  string    `json:"original_lang" gorm:"type:varchar(10)"`        // 原文语言 (zh/en)

	// 时间字段
	CreatedAt   time.Time  `json:"created_at" gorm:"autoCreateTime"`
	ProcessedAt *time.Time `json:"processed_at"`
	PublishedAt *time.Time `json:"published_at"`
	UpdatedAt   time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (Content) TableName() string {
	return "contents"
}

// Tag 标签模型
type Tag struct {
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	Name      string    `json:"name" gorm:"type:varchar(50);not null;unique"`    // 中文名
	NameEn    string    `json:"name_en" gorm:"type:varchar(50)"`                 // 英文名
	Color     string    `json:"color" gorm:"type:varchar(20);default:'#6366f1'"` // 显示颜色
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (Tag) TableName() string {
	return "tags"
}

// Setting 系统配置模型
type Setting struct {
	Key         string    `json:"key" gorm:"type:varchar(100);primaryKey"`
	Value       string    `json:"value" gorm:"type:text;not null"`
	Description string    `json:"description" gorm:"type:text"`
	UpdatedAt   time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (Setting) TableName() string {
	return "settings"
}

// SearchConfig 搜索配置模型
type SearchConfig struct {
	ID         uint       `json:"id" gorm:"primaryKey;autoIncrement"`
	Keyword    string     `json:"keyword" gorm:"type:varchar(200);not null"`  // 搜索关键词
	CronExpr   string     `json:"cron_expr" gorm:"type:varchar(50);not null"` // cron 表达式
	Enabled    bool       `json:"enabled" gorm:"default:true"`                // 是否启用
	Tags       JSONArray  `json:"tags" gorm:"type:jsonb;default:'[]'"`        // 自动添加的标签
	LastRunAt  *time.Time `json:"last_run_at"`                                // 上次执行时间
	LastResult string     `json:"last_result" gorm:"type:text"`               // 上次执行结果
	CreatedAt  time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt  time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (SearchConfig) TableName() string {
	return "search_configs"
}

// SkippedContent 被跳过的内容记录（无收入等原因）
type SkippedContent struct {
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	SourceURL string    `json:"source_url" gorm:"type:text;uniqueIndex"` // 原始链接 (用于去重)
	Reason    string    `json:"reason" gorm:"type:varchar(50)"`          // 跳过原因: no_revenue, duplicate, invalid
	RawTitle  string    `json:"raw_title" gorm:"type:text"`              // 原始标题（用于调试）
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (SkippedContent) TableName() string {
	return "skipped_contents"
}

// User 用户模型
type User struct {
	ID string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`

	// 登录方式 (可多种并存)
	Email         string `json:"email" gorm:"type:varchar(200);uniqueIndex"`          // Google 登录
	GoogleID      string `json:"google_id" gorm:"type:varchar(100);uniqueIndex"`      // Google ID
	TwitterID     string `json:"twitter_id" gorm:"type:varchar(100);uniqueIndex"`     // X 登录
	TwitterHandle string `json:"twitter_handle" gorm:"type:varchar(100)"`             // @username
	WalletAddress string `json:"wallet_address" gorm:"type:varchar(100);uniqueIndex"` // Web3 钱包
	WalletType    string `json:"wallet_type" gorm:"type:varchar(50)"`                 // phantom/metamask/okx/walletconnect/coinbase
	ChainType     string `json:"chain_type" gorm:"type:varchar(20)"`                  // evm/solana

	// 用户信息
	Nickname string `json:"nickname" gorm:"type:varchar(100)"`
	Avatar   string `json:"avatar" gorm:"type:text"`
	Role     string `json:"role" gorm:"type:varchar(20);default:'user'"` // user/admin

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// IsAdmin 检查是否管理员
func (u *User) IsAdmin() bool {
	return u.Role == "admin"
}

func (User) TableName() string {
	return "users"
}

// Comment 评论模型
type Comment struct {
	ID        string  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ContentID string  `json:"content_id" gorm:"type:uuid;not null;index"` // 关联内容
	UserID    string  `json:"user_id" gorm:"type:uuid;not null;index"`    // 关联用户
	Content   string  `json:"content" gorm:"type:text;not null"`          // 评论内容
	ParentID  *string `json:"parent_id" gorm:"type:uuid;index"`           // 父评论ID (支持回复)

	// 关联
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (Comment) TableName() string {
	return "comments"
}

// Favorite 收藏模型
type Favorite struct {
	ID        string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    string `json:"user_id" gorm:"type:uuid;not null;index"`    // 用户ID
	ContentID string `json:"content_id" gorm:"type:uuid;not null;index"` // 内容ID
	Note      string `json:"note" gorm:"type:text"`                      // 收藏备注

	// 关联
	User    *User    `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Content *Content `json:"content,omitempty" gorm:"foreignKey:ContentID"`

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (Favorite) TableName() string {
	return "favorites"
}

// Notification 通知模型
type Notification struct {
	ID      string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID  string `json:"user_id" gorm:"type:uuid;not null;index"` // 接收者
	Type    string `json:"type" gorm:"type:varchar(50);not null"`   // comment_reply/new_favorite/system/broadcast
	Title   string `json:"title" gorm:"type:varchar(200)"`          // 标题
	Message string `json:"message" gorm:"type:text"`                // 消息内容
	Link    string `json:"link" gorm:"type:text"`                   // 跳转链接
	Read    bool   `json:"read" gorm:"default:false"`               // 是否已读

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (Notification) TableName() string {
	return "notifications"
}

// ViewHistory 浏览历史
type ViewHistory struct {
	ID        string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    string    `json:"user_id" gorm:"type:uuid;not null;index"`
	ContentID string    `json:"content_id" gorm:"type:uuid;not null;index"`
	ViewedAt  time.Time `json:"viewed_at" gorm:"autoCreateTime"`

	// 关联
	Content Content `json:"content,omitempty" gorm:"foreignKey:ContentID"`
}

func (ViewHistory) TableName() string {
	return "view_histories"
}

// Subscription 标签订阅
type Subscription struct {
	ID        string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    string    `json:"user_id" gorm:"type:uuid;not null;index"`
	Tag       string    `json:"tag" gorm:"type:varchar(100);not null;index"` // 订阅的标签
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (Subscription) TableName() string {
	return "subscriptions"
}

// Badge 徽章定义
type Badge struct {
	ID          string `json:"id" gorm:"type:varchar(50);primaryKey"` // 徽章唯一ID
	Name        string `json:"name" gorm:"type:varchar(100);not null"`
	NameEn      string `json:"name_en" gorm:"type:varchar(100)"`
	Description string `json:"description" gorm:"type:text"`
	Icon        string `json:"icon" gorm:"type:varchar(50)"`     // emoji 或图标类名
	Color       string `json:"color" gorm:"type:varchar(20)"`    // 徽章颜色
	Category    string `json:"category" gorm:"type:varchar(50)"` // 类别: engagement/contribution/milestone/special
	Threshold   int    `json:"threshold" gorm:"default:1"`       // 解锁阈值
	Points      int    `json:"points" gorm:"default:10"`         // 获得积分

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (Badge) TableName() string {
	return "badges"
}

// UserBadge 用户已获得的徽章
type UserBadge struct {
	ID       string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID   string    `json:"user_id" gorm:"type:uuid;not null;index"`
	BadgeID  string    `json:"badge_id" gorm:"type:varchar(50);not null;index"`
	EarnedAt time.Time `json:"earned_at" gorm:"autoCreateTime"`

	// 关联
	Badge Badge `json:"badge,omitempty" gorm:"foreignKey:BadgeID"`
}

func (UserBadge) TableName() string {
	return "user_badges"
}

// UserPoints 用户积分记录
type UserPoints struct {
	ID        string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    string    `json:"user_id" gorm:"type:uuid;not null;index"`
	Points    int       `json:"points" gorm:"not null"`
	Reason    string    `json:"reason" gorm:"type:varchar(200)"`  // 获得原因
	RefType   string    `json:"ref_type" gorm:"type:varchar(50)"` // 关联类型: badge/comment/favorite
	RefID     string    `json:"ref_id" gorm:"type:varchar(100)"`  // 关联ID
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (UserPoints) TableName() string {
	return "user_points"
}

// InitDB 初始化数据库连接
func InitDB(cfg *config.Config) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(cfg.GetDSN()), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// 配置连接池
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return db, nil
}

// AutoMigrate 自动迁移数据库
func AutoMigrate(db *gorm.DB) error {
	// 自动创建表
	if err := db.AutoMigrate(&Content{}, &Tag{}, &Setting{}, &SearchConfig{}, &SkippedContent{}, &User{}, &Comment{}, &Favorite{}, &Notification{}, &ViewHistory{}, &Subscription{}, &Badge{}, &UserBadge{}, &UserPoints{}, &Token{}, &TokenStats{}); err != nil {
		return err
	}

	// 初始化默认标签
	initDefaultTags(db)

	// 初始化默认配置
	initDefaultSettings(db)

	// 初始化默认搜索配置
	initDefaultSearchConfigs(db)

	// 初始化默认徽章
	initDefaultBadges(db)

	return nil
}

func initDefaultTags(db *gorm.DB) {
	defaultTags := []Tag{
		{Name: "AI工具", NameEn: "AI Tools", Color: "#8b5cf6"},
		{Name: "SaaS", NameEn: "SaaS", Color: "#06b6d4"},
		{Name: "独立开发", NameEn: "Indie Dev", Color: "#10b981"},
		{Name: "变现", NameEn: "Monetization", Color: "#f59e0b"},
		{Name: "案例", NameEn: "Case Study", Color: "#ef4444"},
	}

	for _, tag := range defaultTags {
		db.FirstOrCreate(&tag, Tag{Name: tag.Name})
	}
}

func initDefaultSettings(db *gorm.DB) {
	defaultSettings := []Setting{
		{
			Key:         "ai_model",
			Value:       "GPT-4",
			Description: "POE 使用的 AI 模型",
		},
		{
			Key:         "ai_temperature",
			Value:       "0.7",
			Description: "AI 生成温度",
		},
		{
			Key: "prompt_rewrite_zh",
			Value: `你是 WAGMI 的内容编辑，专注于"AI时代超级个体变现"话题。

原始素材：
{{content}}

请改写成一条 Twitter 帖子，要求：
1. 中文，口语化，有态度
2. 突出关键数据（收入、用时、成本）
3. 提炼可复制的方法论
4. 结尾引发互动（提问或观点）
5. 控制在 280 字以内
6. 适当加入 emoji
7. 不要直接翻译，要"洗"成自己的内容
8. 不要 @ 原作者`,
			Description: "中文洗稿 Prompt",
		},
		{
			Key: "prompt_rewrite_en",
			Value: `You are a content editor for WAGMI, focusing on "How super individuals monetize in the AI era".

Original content:
{{content}}

Please rewrite this into a Twitter post:
1. English, conversational, with attitude
2. Highlight key data (revenue, time, cost)
3. Extract replicable methodology
4. End with engagement (question or opinion)
5. Keep within 280 characters
6. Add appropriate emojis
7. Don't translate directly, make it your own
8. Don't @ the original author`,
			Description: "英文洗稿 Prompt",
		},
	}

	for _, setting := range defaultSettings {
		db.FirstOrCreate(&setting, Setting{Key: setting.Key})
	}
}

func initDefaultSearchConfigs(db *gorm.DB) {
	defaultConfigs := []SearchConfig{
		{
			Keyword:  "AI创业者 月入过万 独立开发",
			CronExpr: "0 0 */6 * * *", // 每6小时 (秒 分 时 日 月 周)
			Enabled:  true,
			Tags:     JSONArray{"AI工具", "独立开发", "变现"},
		},
		{
			Keyword:  "solo entrepreneur AI income",
			CronExpr: "0 0 */6 * * *", // 每6小时
			Enabled:  true,
			Tags:     JSONArray{"AI工具", "独立开发", "变现"},
		},
		{
			Keyword:  "indie hacker revenue AI tools",
			CronExpr: "0 0 */12 * * *", // 每12小时
			Enabled:  true,
			Tags:     JSONArray{"AI工具", "SaaS", "案例"},
		},
	}

	for _, cfg := range defaultConfigs {
		db.FirstOrCreate(&cfg, SearchConfig{Keyword: cfg.Keyword})
	}
}

func initDefaultBadges(db *gorm.DB) {
	defaultBadges := []Badge{
		// 参与类徽章
		{ID: "first_comment", Name: "初次发言", NameEn: "First Comment", Description: "发表第一条评论", Icon: "💬", Color: "#10b981", Category: "engagement", Threshold: 1, Points: 10},
		{ID: "active_commenter", Name: "活跃评论者", NameEn: "Active Commenter", Description: "发表10条评论", Icon: "🗣️", Color: "#06b6d4", Category: "engagement", Threshold: 10, Points: 50},
		{ID: "discussion_master", Name: "讨论达人", NameEn: "Discussion Master", Description: "发表50条评论", Icon: "🎙️", Color: "#8b5cf6", Category: "engagement", Threshold: 50, Points: 200},

		// 收藏类徽章
		{ID: "first_favorite", Name: "收藏入门", NameEn: "First Favorite", Description: "收藏第一篇内容", Icon: "⭐", Color: "#f59e0b", Category: "engagement", Threshold: 1, Points: 5},
		{ID: "collector", Name: "收藏家", NameEn: "Collector", Description: "收藏20篇内容", Icon: "📚", Color: "#eab308", Category: "engagement", Threshold: 20, Points: 30},
		{ID: "curator", Name: "策展人", NameEn: "Curator", Description: "收藏100篇内容", Icon: "🏛️", Color: "#f97316", Category: "engagement", Threshold: 100, Points: 100},

		// 订阅类徽章
		{ID: "first_subscribe", Name: "关注开始", NameEn: "First Subscribe", Description: "订阅第一个标签", Icon: "🔔", Color: "#3b82f6", Category: "engagement", Threshold: 1, Points: 5},
		{ID: "trend_watcher", Name: "趋势观察者", NameEn: "Trend Watcher", Description: "订阅5个标签", Icon: "👀", Color: "#6366f1", Category: "engagement", Threshold: 5, Points: 25},

		// 里程碑类徽章
		{ID: "early_bird", Name: "早期用户", NameEn: "Early Bird", Description: "在平台早期注册", Icon: "🐦", Color: "#ec4899", Category: "milestone", Threshold: 1, Points: 50},
		{ID: "one_week", Name: "一周达人", NameEn: "One Week", Description: "连续7天访问", Icon: "📅", Color: "#14b8a6", Category: "milestone", Threshold: 7, Points: 30},
		{ID: "one_month", Name: "月度会员", NameEn: "Monthly Member", Description: "注册满30天", Icon: "🗓️", Color: "#0ea5e9", Category: "milestone", Threshold: 30, Points: 50},

		// 特殊类徽章
		{ID: "web3_pioneer", Name: "Web3先锋", NameEn: "Web3 Pioneer", Description: "使用钱包登录", Icon: "🔗", Color: "#a855f7", Category: "special", Threshold: 1, Points: 20},
		{ID: "social_connector", Name: "社交达人", NameEn: "Social Connector", Description: "绑定社交账号", Icon: "🌐", Color: "#22c55e", Category: "special", Threshold: 1, Points: 15},
		{ID: "explorer", Name: "探索者", NameEn: "Explorer", Description: "浏览50篇内容", Icon: "🧭", Color: "#0891b2", Category: "engagement", Threshold: 50, Points: 40},
		{ID: "knowledge_seeker", Name: "知识追寻者", NameEn: "Knowledge Seeker", Description: "浏览200篇内容", Icon: "📖", Color: "#7c3aed", Category: "engagement", Threshold: 200, Points: 100},
	}

	for _, badge := range defaultBadges {
		db.FirstOrCreate(&badge, Badge{ID: badge.ID})
	}
}
