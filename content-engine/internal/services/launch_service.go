package services

import (
	"content-engine/internal/config"
	"content-engine/internal/models"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"time"

	"gorm.io/gorm"
)

// LaunchService 发射服务
type LaunchService struct {
	cfg *config.Config
	db  *gorm.DB
}

// NewLaunchService 创建发射服务
func NewLaunchService(cfg *config.Config, db *gorm.DB) *LaunchService {
	return &LaunchService{cfg: cfg, db: db}
}

// DevWalletInfo Dev钱包信息
type DevWalletInfo struct {
	Address    string `json:"address"`
	PublicKey  string `json:"publicKey"`
	PrivateKey string `json:"-"` // 不返回给前端
}

// GenerateDevWallet 为项目生成Dev钱包
func (s *LaunchService) GenerateDevWallet(projectID string, chain models.Chain) (*DevWalletInfo, error) {
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		return nil, err
	}

	// 如果已有Dev钱包，返回错误
	if project.DevWalletAddress != "" {
		return nil, errors.New("dev wallet already exists")
	}

	var wallet *DevWalletInfo
	var err error

	switch chain {
	case models.ChainSolana:
		wallet, err = s.generateSolanaWallet()
	case models.ChainBSC:
		wallet, err = s.generateEVMWallet()
	default:
		return nil, errors.New("unsupported chain")
	}

	if err != nil {
		return nil, err
	}

	// 加密私钥存储
	encryptedKey, err := s.encryptPrivateKey(wallet.PrivateKey)
	if err != nil {
		return nil, err
	}

	// 更新项目
	project.DevWalletAddress = wallet.Address
	project.DevWalletKey = encryptedKey

	if err := s.db.Save(&project).Error; err != nil {
		return nil, err
	}

	return wallet, nil
}

// generateSolanaWallet 生成Solana钱包
func (s *LaunchService) generateSolanaWallet() (*DevWalletInfo, error) {
	// 生成 ed25519 密钥对
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}

	// Solana 地址是 base58 编码的公钥
	address := base58Encode(publicKey)

	return &DevWalletInfo{
		Address:    address,
		PublicKey:  hex.EncodeToString(publicKey),
		PrivateKey: hex.EncodeToString(privateKey),
	}, nil
}

// generateEVMWallet 生成EVM钱包（BSC）
func (s *LaunchService) generateEVMWallet() (*DevWalletInfo, error) {
	// 生成32字节随机私钥
	privateKeyBytes := make([]byte, 32)
	if _, err := rand.Read(privateKeyBytes); err != nil {
		return nil, err
	}

	// TODO: 实际实现需要使用 go-ethereum 库
	// 这里简化处理，生产环境需要完整实现
	privateKeyHex := hex.EncodeToString(privateKeyBytes)

	// 模拟地址生成（实际需要从私钥推导）
	addressBytes := make([]byte, 20)
	rand.Read(addressBytes)
	address := "0x" + hex.EncodeToString(addressBytes)

	return &DevWalletInfo{
		Address:    address,
		PublicKey:  "", // EVM 公钥需要从私钥推导
		PrivateKey: privateKeyHex,
	}, nil
}

// encryptPrivateKey 加密私钥
func (s *LaunchService) encryptPrivateKey(privateKey string) (string, error) {
	// 使用 AES-256-GCM 加密
	key := s.getEncryptionKey()

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(privateKey), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// decryptPrivateKey 解密私钥
func (s *LaunchService) decryptPrivateKey(encryptedKey string) (string, error) {
	key := s.getEncryptionKey()

	ciphertext, err := base64.StdEncoding.DecodeString(encryptedKey)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// getEncryptionKey 获取加密密钥
func (s *LaunchService) getEncryptionKey() []byte {
	// 从配置或环境变量获取，这里使用默认值
	// 生产环境必须使用安全的密钥管理
	keyStr := s.cfg.WalletEncryptionKey
	if keyStr == "" {
		keyStr = "wagmi-dev-key-32bytes-long-key!" // 32 bytes for AES-256
	}

	key := []byte(keyStr)
	if len(key) < 32 {
		// 填充到32字节
		padded := make([]byte, 32)
		copy(padded, key)
		return padded
	}
	return key[:32]
}

// LaunchRequest 发射请求
type LaunchRequest struct {
	ProjectID string  `json:"projectId"`
	DevBuySOL float64 `json:"devBuySOL"` // Dev买入金额（SOL）
	DevBuyBNB float64 `json:"devBuyBNB"` // Dev买入金额（BNB）
}

// LaunchResult 发射结果
type LaunchResult struct {
	Success      bool   `json:"success"`
	TokenAddress string `json:"tokenAddress"`
	LaunchTxHash string `json:"launchTxHash"`
	DevBuyTxHash string `json:"devBuyTxHash"`
	Error        string `json:"error,omitempty"`
}

// LaunchToken 发射代币
func (s *LaunchService) LaunchToken(req LaunchRequest) (*LaunchResult, error) {
	var project models.Project
	if err := s.db.First(&project, "id = ?", req.ProjectID).Error; err != nil {
		return nil, err
	}

	// 检查状态
	if project.Status != models.ProjectStatusLaunching {
		return nil, errors.New("project is not in launching status")
	}

	// 检查Dev钱包
	if project.DevWalletAddress == "" {
		return nil, errors.New("dev wallet not generated")
	}

	// 解密私钥
	privateKey, err := s.decryptPrivateKey(project.DevWalletKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt dev wallet key: %w", err)
	}

	var result *LaunchResult

	switch project.Chain {
	case models.ChainSolana:
		result, err = s.launchOnSolana(&project, privateKey, req)
	case models.ChainBSC:
		result, err = s.launchOnBSC(&project, privateKey, req)
	default:
		return nil, errors.New("unsupported chain")
	}

	if err != nil {
		return nil, err
	}

	// 更新项目状态
	if result.Success {
		now := time.Now()
		project.Status = models.ProjectStatusLaunched
		project.TokenAddress = result.TokenAddress
		project.LaunchTxHash = result.LaunchTxHash
		project.LaunchedAt = &now

		if err := s.db.Save(&project).Error; err != nil {
			log.Printf("Failed to update project after launch: %v", err)
		}

		// 创建时间线事件
		event := models.TimelineEvent{
			ProjectID: project.ID,
			Type:      models.TimelineEventLaunched,
			Actor:     "system",
			Data: models.JSONMap{
				"tokenAddress": result.TokenAddress,
				"launchTxHash": result.LaunchTxHash,
				"devBuyTxHash": result.DevBuyTxHash,
			},
		}
		s.db.Create(&event)
	}

	return result, nil
}

// launchOnSolana 在Solana上发射
func (s *LaunchService) launchOnSolana(project *models.Project, privateKey string, req LaunchRequest) (*LaunchResult, error) {
	log.Printf("Launching %s on Solana via %s", project.Ticker, project.Launchpad)

	// TODO: 实际实现需要：
	// 1. 连接到 Solana RPC
	// 2. 根据 launchpad 调用不同的发射逻辑
	// 3. 使用 Jito Bundle 发送交易

	// 模拟发射结果（开发测试用）
	result := &LaunchResult{
		Success:      true,
		TokenAddress: fmt.Sprintf("So%s...%s", project.Ticker[:3], randomHex(6)),
		LaunchTxHash: randomHex(64),
	}

	// 模拟 Dev 买入
	if req.DevBuySOL > 0 {
		result.DevBuyTxHash = randomHex(64)
		log.Printf("Dev buy %.4f SOL, tx: %s", req.DevBuySOL, result.DevBuyTxHash)
	}

	return result, nil
}

// launchOnBSC 在BSC上发射
func (s *LaunchService) launchOnBSC(project *models.Project, privateKey string, req LaunchRequest) (*LaunchResult, error) {
	log.Printf("Launching %s on BSC via %s", project.Ticker, project.Launchpad)

	// TODO: 实际实现需要：
	// 1. 连接到 BSC RPC
	// 2. 调用 flap.sh 合约
	// 3. 发送交易

	// 模拟发射结果（开发测试用）
	result := &LaunchResult{
		Success:      true,
		TokenAddress: "0x" + randomHex(40),
		LaunchTxHash: "0x" + randomHex(64),
	}

	// 模拟 Dev 买入
	if req.DevBuyBNB > 0 {
		result.DevBuyTxHash = "0x" + randomHex(64)
		log.Printf("Dev buy %.4f BNB, tx: %s", req.DevBuyBNB, result.DevBuyTxHash)
	}

	return result, nil
}

// DistributeRevenue 分发收益
func (s *LaunchService) DistributeRevenue(projectID string) error {
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		return err
	}

	if project.Status != models.ProjectStatusLaunched {
		return errors.New("project is not launched")
	}

	// 获取竞拍金额
	amount := project.CurrentBidAmount
	currency := "SOL"
	if project.Chain == models.ChainBSC {
		currency = "BNB"
	}

	// 分成比例：Creator 70%, Scout 10%, Platform 20%
	creatorShare := amount * 0.70
	scoutShare := amount * 0.10
	platformShare := amount * 0.20

	// 创建分成记录
	records := []models.RevenueRecord{
		{
			ProjectID:     project.ID,
			Amount:        creatorShare,
			Currency:      currency,
			FromWallet:    project.DevWalletAddress,
			ToWallet:      project.CreatorWallet,
			RecipientType: "creator",
		},
		{
			ProjectID:     project.ID,
			Amount:        scoutShare,
			Currency:      currency,
			FromWallet:    project.DevWalletAddress,
			ToWallet:      project.ScoutWallet,
			RecipientType: "scout",
		},
		{
			ProjectID:     project.ID,
			Amount:        platformShare,
			Currency:      currency,
			FromWallet:    project.DevWalletAddress,
			ToWallet:      s.cfg.PlatformWallet,
			RecipientType: "platform",
		},
	}

	for _, record := range records {
		if record.ToWallet == "" {
			continue // 跳过空地址
		}

		// TODO: 实际转账
		// 这里只记录，实际转账需要调用链上合约

		record.TxHash = randomHex(64)
		if err := s.db.Create(&record).Error; err != nil {
			log.Printf("Failed to create revenue record: %v", err)
		}
	}

	return nil
}

// 辅助函数

func randomHex(n int) string {
	bytes := make([]byte, n/2)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// Base58 编码（简化版）
var base58Alphabet = []byte("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")

func base58Encode(input []byte) string {
	result := make([]byte, 0, len(input)*2)

	x := make([]byte, len(input))
	copy(x, input)

	for len(x) > 0 {
		var carry int
		var newX []byte
		for _, b := range x {
			carry = carry*256 + int(b)
			if len(newX) > 0 || carry/58 > 0 {
				newX = append(newX, byte(carry/58))
			}
			carry %= 58
		}
		result = append([]byte{base58Alphabet[carry]}, result...)
		x = newX
	}

	// 处理前导零
	for _, b := range input {
		if b != 0 {
			break
		}
		result = append([]byte{base58Alphabet[0]}, result...)
	}

	return string(result)
}
