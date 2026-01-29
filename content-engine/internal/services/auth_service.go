package services

import (
	"content-engine/internal/config"
	"content-engine/internal/models"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/golang-jwt/jwt/v5"
	"github.com/mr-tron/base58"
	"gorm.io/gorm"
)

// AuthService 认证服务
type AuthService struct {
	db        *gorm.DB
	cfg       *config.Config
	jwtSecret []byte
}

// NewAuthService 创建认证服务
func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	secret := cfg.JWTSecret
	if secret == "" {
		secret = "wagmi-jwt-secret-key-2026" // 默认密钥
	}
	return &AuthService{
		db:        db,
		cfg:       cfg,
		jwtSecret: []byte(secret),
	}
}

// JWTClaims JWT 声明
type JWTClaims struct {
	UserID   string `json:"user_id"`
	Nickname string `json:"nickname"`
	jwt.RegisteredClaims
}

// GenerateToken 生成 JWT Token
func (s *AuthService) GenerateToken(user *models.User) (string, error) {
	claims := JWTClaims{
		UserID:   user.ID,
		Nickname: user.Nickname,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)), // 30天过期
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "wagmi",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// ValidateToken 验证 JWT Token
func (s *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// GetUserByID 根据ID获取用户
func (s *AuthService) GetUserByID(id string) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// FindOrCreateByGoogle Google 登录
func (s *AuthService) FindOrCreateByGoogle(googleID, email, name, avatar string) (*models.User, error) {
	var user models.User

	// 先尝试通过 GoogleID 查找
	err := s.db.Where("google_id = ?", googleID).First(&user).Error
	if err == nil {
		// 更新信息
		user.Email = email
		user.Nickname = name
		user.Avatar = avatar
		s.db.Save(&user)
		return &user, nil
	}

	// 再尝试通过 Email 查找
	err = s.db.Where("email = ?", email).First(&user).Error
	if err == nil {
		// 绑定 GoogleID
		user.GoogleID = googleID
		user.Nickname = name
		user.Avatar = avatar
		s.db.Save(&user)
		return &user, nil
	}

	// 创建新用户
	user = models.User{
		GoogleID: googleID,
		Email:    email,
		Nickname: name,
		Avatar:   avatar,
	}
	if err := s.db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

// FindOrCreateByTwitter Twitter 登录
func (s *AuthService) FindOrCreateByTwitter(twitterID, handle, name, avatar string) (*models.User, error) {
	var user models.User

	err := s.db.Where("twitter_id = ?", twitterID).First(&user).Error
	if err == nil {
		// 更新信息
		user.TwitterHandle = handle
		user.Nickname = name
		user.Avatar = avatar
		s.db.Save(&user)
		return &user, nil
	}

	// 创建新用户
	user = models.User{
		TwitterID:     twitterID,
		TwitterHandle: handle,
		Nickname:      name,
		Avatar:        avatar,
	}
	if err := s.db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

// FindOrCreateByWallet Web3 钱包登录
func (s *AuthService) FindOrCreateByWallet(address, walletType, chainType string) (*models.User, error) {
	var user models.User

	err := s.db.Where("wallet_address = ?", address).First(&user).Error
	if err == nil {
		// 更新钱包类型
		user.WalletType = walletType
		user.ChainType = chainType
		s.db.Save(&user)
		return &user, nil
	}

	// 创建新用户
	// 生成默认昵称
	shortAddr := address[:6] + "..." + address[len(address)-4:]
	user = models.User{
		WalletAddress: address,
		WalletType:    walletType,
		ChainType:     chainType,
		Nickname:      shortAddr,
	}
	if err := s.db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

// GenerateNonce 生成用于钱包签名的 nonce
func (s *AuthService) GenerateNonce() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// VerifyEVMSignature 验证 EVM 链钱包签名 (MetaMask, OKX, WalletConnect 等)
func (s *AuthService) VerifyEVMSignature(address, message, signature string) (bool, error) {
	// 移除 0x 前缀
	sig := strings.TrimPrefix(signature, "0x")

	// 解码签名
	sigBytes, err := hex.DecodeString(sig)
	if err != nil {
		return false, fmt.Errorf("invalid signature format: %v", err)
	}

	// 签名长度必须是 65 字节
	if len(sigBytes) != 65 {
		return false, fmt.Errorf("invalid signature length: %d", len(sigBytes))
	}

	// 调整 v 值 (以太坊签名的特殊处理)
	if sigBytes[64] >= 27 {
		sigBytes[64] -= 27
	}

	// 构造以太坊签名消息格式
	prefixedMessage := fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message)
	msgHash := crypto.Keccak256Hash([]byte(prefixedMessage))

	// 恢复公钥
	pubKey, err := crypto.SigToPub(msgHash.Bytes(), sigBytes)
	if err != nil {
		return false, fmt.Errorf("failed to recover public key: %v", err)
	}

	// 从公钥获取地址
	recoveredAddr := crypto.PubkeyToAddress(*pubKey)

	// 比较地址 (忽略大小写)
	expectedAddr := common.HexToAddress(address)

	return recoveredAddr == expectedAddr, nil
}

// VerifySolanaSignature 验证 Solana 钱包签名 (Phantom 等)
// 使用 ed25519 签名验证
func (s *AuthService) VerifySolanaSignature(address, message, signature string) (bool, error) {
	// Solana 地址是 base58 编码的 ed25519 公钥
	pubKeyBytes, err := base58.Decode(address)
	if err != nil {
		return false, fmt.Errorf("invalid solana address: %v", err)
	}

	if len(pubKeyBytes) != ed25519.PublicKeySize {
		return false, fmt.Errorf("invalid public key size: %d", len(pubKeyBytes))
	}

	// 解码签名（可能是 hex 或 base64）
	var sigBytes []byte

	// 先尝试 hex 解码
	sigBytes, err = hex.DecodeString(signature)
	if err != nil {
		// 尝试 base64 解码
		sigBytes, err = base64.StdEncoding.DecodeString(signature)
		if err != nil {
			// 尝试 base58 解码
			sigBytes, err = base58.Decode(signature)
			if err != nil {
				return false, fmt.Errorf("invalid signature format: %v", err)
			}
		}
	}

	if len(sigBytes) != ed25519.SignatureSize {
		return false, fmt.Errorf("invalid signature size: %d", len(sigBytes))
	}

	// 使用 ed25519 验证签名
	pubKey := ed25519.PublicKey(pubKeyBytes)
	valid := ed25519.Verify(pubKey, []byte(message), sigBytes)

	return valid, nil
}

// VerifyWalletSignature 统一的钱包签名验证接口
func (s *AuthService) VerifyWalletSignature(address, message, signature, chainType string) (bool, error) {
	switch chainType {
	case "evm", "ethereum":
		return s.VerifyEVMSignature(address, message, signature)
	case "solana":
		return s.VerifySolanaSignature(address, message, signature)
	default:
		return false, fmt.Errorf("unsupported chain type: %s", chainType)
	}
}

// UpdateProfile 更新用户资料
func (s *AuthService) UpdateProfile(userID, nickname, avatar string) error {
	updates := map[string]interface{}{}
	if nickname != "" {
		updates["nickname"] = nickname
	}
	if avatar != "" {
		updates["avatar"] = avatar
	}

	return s.db.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error
}
