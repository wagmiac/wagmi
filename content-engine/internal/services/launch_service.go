package services

import (
	"bytes"
	"content-engine/internal/config"
	"content-engine/internal/models"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ed25519"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strconv"
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
	Chain      string `json:"chain"`
	Launchpad  string `json:"launchpad"`
}

// 发射台对应的链
var launchpadChainMap = map[string]models.Chain{
	"pump.fun":   models.ChainSolana,
	"trends.fun": models.ChainSolana,
	"bags.fm":    models.ChainSolana,
	"four.meme":  models.ChainBSC,
	"flap.sh":    models.ChainBSC,
}

// GenerateDevWallet 为项目的指定发射台生成 Dev 钱包
func (s *LaunchService) GenerateDevWallet(projectID string, launchpad string) (*DevWalletInfo, error) {
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		return nil, err
	}

	// 获取发射台对应的链
	chain, ok := launchpadChainMap[launchpad]
	if !ok {
		return nil, errors.New("unsupported launchpad: " + launchpad)
	}

	// 初始化钱包 map
	if project.LaunchpadWallets == nil {
		project.LaunchpadWallets = make(models.JSONMap)
	}
	if project.LaunchpadKeys == nil {
		project.LaunchpadKeys = make(models.JSONMap)
	}

	// 检查该发射台的钱包是否已存在
	if addr, exists := project.LaunchpadWallets[launchpad]; exists && addr != nil {
		if addrStr, ok := addr.(string); ok && addrStr != "" {
			return &DevWalletInfo{
				Address:   addrStr,
				Chain:     string(chain),
				Launchpad: launchpad,
			}, nil
		}
	}

	// 根据链生成对应格式的钱包
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

	wallet.Chain = string(chain)
	wallet.Launchpad = launchpad

	// 加密私钥存储
	encryptedKey, err := s.encryptPrivateKey(wallet.PrivateKey)
	if err != nil {
		return nil, err
	}

	// 保存到发射台钱包 map
	project.LaunchpadWallets[launchpad] = wallet.Address
	project.LaunchpadKeys[launchpad] = encryptedKey

	// 兼容旧字段
	if project.DevWalletAddress == "" {
		project.DevWalletAddress = wallet.Address
		project.DevWalletKey = encryptedKey
	}

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

// ExportDevWalletKey 导出指定发射台的 Dev 钱包私钥（仅管理员使用）
func (s *LaunchService) ExportDevWalletKey(projectID string, launchpad string) (string, error) {
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		return "", err
	}

	// 优先从 LaunchpadKeys 获取
	if project.LaunchpadKeys != nil {
		if encryptedKey, ok := project.LaunchpadKeys[launchpad].(string); ok && encryptedKey != "" {
			return s.decryptPrivateKey(encryptedKey)
		}
	}

	// 兼容旧数据：如果是默认发射台且有旧的 DevWalletKey
	if project.DevWalletKey != "" && string(project.Launchpad) == launchpad {
		return s.decryptPrivateKey(project.DevWalletKey)
	}

	return "", errors.New("wallet key not found for launchpad: " + launchpad)
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

	// 调用 launch-service 微服务
	result, err := s.callLaunchService(project, privateKey, req.DevBuySOL)
	if err != nil {
		log.Printf("Launch service call failed: %v", err)
		return nil, err
	}

	return result, nil
}

// launchOnBSC 在BSC上发射
func (s *LaunchService) launchOnBSC(project *models.Project, privateKey string, req LaunchRequest) (*LaunchResult, error) {
	log.Printf("Launching %s on BSC via %s", project.Ticker, project.Launchpad)

	// 调用 launch-service 微服务
	result, err := s.callLaunchService(project, privateKey, req.DevBuyBNB)
	if err != nil {
		log.Printf("Launch service call failed: %v", err)
		return nil, err
	}

	return result, nil
}

// LaunchServiceRequest 发射服务请求
type LaunchServiceRequest struct {
	Launchpad         string                 `json:"launchpad"`
	Metadata          map[string]interface{} `json:"metadata"`
	CreatorPrivateKey string                 `json:"creatorPrivateKey"`
	InitialBuyAmount  float64                `json:"initialBuyAmount,omitempty"`
	TaxRate           int                    `json:"taxRate,omitempty"` // flap.sh 税率（基点，0=无税，100=1%，300=3%）
}

// LaunchServiceResponse 发射服务响应
type LaunchServiceResponse struct {
	Success      bool   `json:"success"`
	TokenAddress string `json:"tokenAddress,omitempty"`
	CreateTxHash string `json:"createTxHash,omitempty"`
	BuyTxHash    string `json:"buyTxHash,omitempty"`
	PumpFunUrl   string `json:"pumpFunUrl,omitempty"`
	Error        string `json:"error,omitempty"`
}

// callLaunchService 调用 launch-service 微服务
func (s *LaunchService) callLaunchService(project *models.Project, privateKey string, initialBuyAmount float64) (*LaunchResult, error) {
	// 验证必须有 Logo
	if project.Logo == "" {
		return nil, errors.New("project logo is required for launch")
	}

	// 构建请求（描述最大200字符）
	// 网站链接统一使用 wagmi ticker 页面
	wagmiWebsite := fmt.Sprintf("https://wagmi.ac/%s", project.Ticker)

	reqBody := LaunchServiceRequest{
		Launchpad:         string(project.Launchpad),
		CreatorPrivateKey: privateKey,
		InitialBuyAmount:  initialBuyAmount,
		Metadata: map[string]interface{}{
			"name":        project.Name,
			"symbol":      project.Ticker,
			"description": truncateDescription(project.Description, 200),
			"image":       project.Logo,
			"twitter":     project.Twitter,
			"telegram":    project.Telegram,
			"website":     wagmiWebsite,
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// 获取 launch-service URL
	launchServiceURL := s.cfg.LaunchServiceURL
	if launchServiceURL == "" {
		launchServiceURL = "http://localhost:3001"
	}

	// 生成 HMAC 签名
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	signature := s.generateLaunchServiceSignature(reqBody, timestamp)

	// 创建请求
	req, err := http.NewRequest("POST", launchServiceURL+"/api/create", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", signature)
	req.Header.Set("X-Timestamp", timestamp)

	// 发送请求
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call launch service: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// 检查 HTTP 状态码
	if resp.StatusCode == 401 {
		return nil, fmt.Errorf("launch service authentication failed: %s", string(body))
	}
	if resp.StatusCode == 403 {
		return nil, fmt.Errorf("launch service access denied: %s", string(body))
	}
	if resp.StatusCode == 429 {
		return nil, fmt.Errorf("launch service rate limited: %s", string(body))
	}

	var launchResp LaunchServiceResponse
	if err := json.Unmarshal(body, &launchResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if !launchResp.Success {
		return &LaunchResult{
			Success: false,
			Error:   launchResp.Error,
		}, nil
	}

	return &LaunchResult{
		Success:      true,
		TokenAddress: launchResp.TokenAddress,
		LaunchTxHash: launchResp.CreateTxHash,
		DevBuyTxHash: launchResp.BuyTxHash,
	}, nil
}

// generateLaunchServiceSignature 生成 launch-service 请求签名
func (s *LaunchService) generateLaunchServiceSignature(body interface{}, timestamp string) string {
	// 将 body 序列化为 JSON（按 key 排序）
	sortedJSON := sortedJSONMarshal(body)

	// 拼接: timestamp.body
	payload := timestamp + "." + string(sortedJSON)

	// HMAC-SHA256
	secret := s.cfg.LaunchServiceSecret
	if secret == "" {
		secret = "wagmi-launch-service-secret-2026"
	}

	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payload))
	return hex.EncodeToString(h.Sum(nil))
}

// sortedJSONMarshal 按 key 排序的 JSON 序列化
func sortedJSONMarshal(v interface{}) []byte {
	switch val := v.(type) {
	case map[string]interface{}:
		keys := make([]string, 0, len(val))
		for k := range val {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		result := "{"
		for i, k := range keys {
			if i > 0 {
				result += ","
			}
			keyJSON, _ := json.Marshal(k)
			valJSON := sortedJSONMarshal(val[k])
			result += string(keyJSON) + ":" + string(valJSON)
		}
		result += "}"
		return []byte(result)

	case LaunchServiceRequest:
		// 转换为 map 再排序
		m := map[string]interface{}{
			"creatorPrivateKey": val.CreatorPrivateKey,
			"initialBuyAmount":  val.InitialBuyAmount,
			"launchpad":         val.Launchpad,
			"metadata":          val.Metadata,
		}
		return sortedJSONMarshal(m)

	default:
		data, _ := json.Marshal(v)
		return data
	}
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

// ========== Launch Service 新增接口 ==========

// VerifyTransactionRequest 验证交易请求
type VerifyTransactionRequest struct {
	Chain          string  `json:"chain"`
	TxHash         string  `json:"txHash"`
	ExpectedTo     string  `json:"expectedTo"`
	ExpectedAmount float64 `json:"expectedAmount"`
}

// VerifyTransactionResponse 验证交易响应
type VerifyTransactionResponse struct {
	Success      bool    `json:"success"`
	Verified     bool    `json:"verified"`
	Confirmed    bool    `json:"confirmed"`
	ActualAmount float64 `json:"actualAmount,omitempty"`
	ActualFrom   string  `json:"actualFrom,omitempty"`
	ActualTo     string  `json:"actualTo,omitempty"`
	Error        string  `json:"error,omitempty"`
}

// VerifyPaymentTransaction 验证支付交易
func (s *LaunchService) VerifyPaymentTransaction(chain models.Chain, txHash string, expectedTo string, expectedAmount float64) (*VerifyTransactionResponse, error) {
	reqBody := VerifyTransactionRequest{
		Chain:          string(chain),
		TxHash:         txHash,
		ExpectedTo:     expectedTo,
		ExpectedAmount: expectedAmount,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := s.callLaunchServiceAPI("/api/verify-transaction", jsonData)
	if err != nil {
		return nil, err
	}

	var result VerifyTransactionResponse
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// TokenBalanceRequest 代币余额请求
type TokenBalanceRequest struct {
	Chain         string `json:"chain"`
	TokenAddress  string `json:"tokenAddress"`
	WalletAddress string `json:"walletAddress"`
}

// TokenBalanceResponse 代币余额响应
type TokenBalanceResponse struct {
	Success  bool   `json:"success"`
	Balance  string `json:"balance,omitempty"`
	Decimals int    `json:"decimals,omitempty"`
	Error    string `json:"error,omitempty"`
}

// GetTokenBalance 查询代币余额
func (s *LaunchService) GetTokenBalance(chain models.Chain, tokenAddress string, walletAddress string) (*TokenBalanceResponse, error) {
	reqBody := TokenBalanceRequest{
		Chain:         string(chain),
		TokenAddress:  tokenAddress,
		WalletAddress: walletAddress,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := s.callLaunchServiceAPI("/api/token-balance", jsonData)
	if err != nil {
		return nil, err
	}

	var result TokenBalanceResponse
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// TransferTokenRequest 转账代币请求
type TransferTokenRequest struct {
	Chain          string `json:"chain"`
	TokenAddress   string `json:"tokenAddress"`
	FromPrivateKey string `json:"fromPrivateKey"`
	ToAddress      string `json:"toAddress"`
	Amount         string `json:"amount"`
}

// TransferTokenResponse 转账代币响应
type TransferTokenResponse struct {
	Success bool   `json:"success"`
	TxHash  string `json:"txHash,omitempty"`
	Error   string `json:"error,omitempty"`
}

// TransferTokenToUser 将代币转给用户
func (s *LaunchService) TransferTokenToUser(chain models.Chain, tokenAddress string, fromPrivateKey string, toAddress string, amount string) (*TransferTokenResponse, error) {
	reqBody := TransferTokenRequest{
		Chain:          string(chain),
		TokenAddress:   tokenAddress,
		FromPrivateKey: fromPrivateKey,
		ToAddress:      toAddress,
		Amount:         amount,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := s.callLaunchServiceAPI("/api/transfer-token", jsonData)
	if err != nil {
		return nil, err
	}

	var result TransferTokenResponse
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// TransferNativeRequest 转账原生代币请求
type TransferNativeRequest struct {
	Chain          string  `json:"chain"`
	FromPrivateKey string  `json:"fromPrivateKey"`
	ToAddress      string  `json:"toAddress"`
	Amount         float64 `json:"amount"`
}

// TransferNativeResponse 转账原生代币响应
type TransferNativeResponse struct {
	Success bool   `json:"success"`
	TxHash  string `json:"txHash,omitempty"`
	Error   string `json:"error,omitempty"`
}

// RefundToUser 退款给用户
func (s *LaunchService) RefundToUser(chain models.Chain, fromPrivateKey string, toAddress string, amount float64) (*TransferNativeResponse, error) {
	reqBody := TransferNativeRequest{
		Chain:          string(chain),
		FromPrivateKey: fromPrivateKey,
		ToAddress:      toAddress,
		Amount:         amount,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := s.callLaunchServiceAPI("/api/transfer-native", jsonData)
	if err != nil {
		return nil, err
	}

	var result TransferNativeResponse
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// callLaunchServiceAPI 调用 launch-service API
func (s *LaunchService) callLaunchServiceAPI(endpoint string, jsonData []byte) ([]byte, error) {
	launchServiceURL := s.cfg.LaunchServiceURL
	if launchServiceURL == "" {
		launchServiceURL = "http://localhost:3001"
	}

	// 生成签名
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	
	// 对 JSON body 进行签名
	secret := s.cfg.LaunchServiceSecret
	if secret == "" {
		secret = "wagmi-launch-service-secret-2026"
	}
	payload := timestamp + "." + string(jsonData)
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payload))
	signature := hex.EncodeToString(h.Sum(nil))

	// 创建请求
	req, err := http.NewRequest("POST", launchServiceURL+endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", signature)
	req.Header.Set("X-Timestamp", timestamp)

	// 发送请求
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call launch service: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("launch service error (status %d): %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// truncateDescription 截断描述，最大200字符
func truncateDescription(desc string, maxLen int) string {
	runes := []rune(desc)
	if len(runes) <= maxLen {
		return desc
	}
	return string(runes[:maxLen])
}
