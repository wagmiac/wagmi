package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	Port    string
	GinMode string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	// POE API
	POEApiKey string
	POEModel  string

	// Product Hunt API
	PHClientID     string
	PHClientSecret string

	// JWT
	JWTSecret string

	// CORS
	AllowedOrigins []string

	// Google OAuth
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string

	// Twitter OAuth
	TwitterClientID     string
	TwitterClientSecret string
	TwitterRedirectURL  string

	// Frontend URL
	FrontendURL string

	// 数据采集开关
	DataCollectionEnabled bool

	// IMO 发射相关
	WalletEncryptionKey string // Dev钱包私钥加密密钥
	PlatformWallet      string // 平台收款钱包
	SolanaRPC           string // Solana RPC 节点
	BSCRPC              string // BSC RPC 节点
	LaunchServiceURL    string // Launch Service 微服务地址
	LaunchServiceSecret string // Launch Service API 密钥
}

func Load() *Config {
	// 加载 .env 文件（忽略错误，允许使用环境变量）
	godotenv.Load()

	return &Config{
		Port:                  getEnv("PORT", "8080"),
		GinMode:               getEnv("GIN_MODE", "debug"),
		DBHost:                getEnv("DB_HOST", "localhost"),
		DBPort:                getEnv("DB_PORT", "5432"),
		DBUser:                getEnv("DB_USER", "postgres"),
		DBPassword:            getEnv("DB_PASSWORD", "wagmi123"),
		DBName:                getEnv("DB_NAME", "content_engine"),
		POEApiKey:             getEnv("POE_API_KEY", ""),
		POEModel:              getEnv("POE_MODEL", "GPT-4"),
		PHClientID:            getEnv("PH_CLIENT_ID", ""),
		PHClientSecret:        getEnv("PH_CLIENT_SECRET", ""),
		JWTSecret:             getEnv("JWT_SECRET", "wagmi-jwt-secret-2026"),
		AllowedOrigins:        strings.Split(getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:3002"), ","),
		GoogleClientID:        getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret:    getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:     getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/auth/google/callback"),
		TwitterClientID:       getEnv("TWITTER_CLIENT_ID", ""),
		TwitterClientSecret:   getEnv("TWITTER_CLIENT_SECRET", ""),
		TwitterRedirectURL:    getEnv("TWITTER_REDIRECT_URL", "http://localhost:8080/api/auth/twitter/callback"),
		FrontendURL:           getEnv("FRONTEND_URL", "http://localhost:3000"),
		DataCollectionEnabled: getEnv("DATA_COLLECTION_ENABLED", "false") == "true",
		WalletEncryptionKey:   getEnv("WALLET_ENCRYPTION_KEY", "wagmi-dev-key-32bytes-long-key!"),
		PlatformWallet:        getEnv("PLATFORM_WALLET", ""),
		SolanaRPC:             getEnv("SOLANA_RPC", "https://api.mainnet-beta.solana.com"),
		BSCRPC:                getEnv("BSC_RPC", "https://bsc-dataseed.binance.org"),
		LaunchServiceURL:      getEnv("LAUNCH_SERVICE_URL", "http://localhost:3001"),
		LaunchServiceSecret:   getEnv("LAUNCH_SERVICE_SECRET", "wagmi-launch-service-secret-2026"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func (c *Config) GetDSN() string {
	return "host=" + c.DBHost +
		" user=" + c.DBUser +
		" password=" + c.DBPassword +
		" dbname=" + c.DBName +
		" port=" + c.DBPort +
		" sslmode=disable TimeZone=Asia/Shanghai"
}
