package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// PaymentVerifier 支付验证服务
type PaymentVerifier struct {
	solanaRPC string
	bscRPC    string
	// 平台收款地址
	solanaWallet string
	bscWallet    string
	// USDT 合约地址
	solanaUSDTMint  string
	bscUSDTContract string
	// 发掘费用
	discoveryFee float64
}

// NewPaymentVerifier 创建支付验证服务
func NewPaymentVerifier() *PaymentVerifier {
	return &PaymentVerifier{
		solanaRPC:       getEnvOrDefault("SOLANA_RPC", "https://api.mainnet-beta.solana.com"),
		bscRPC:          getEnvOrDefault("BSC_RPC", "https://bsc-dataseed.binance.org/"),
		solanaWallet:    os.Getenv("SOLANA_WALLET"),
		bscWallet:       os.Getenv("BSC_WALLET"),
		solanaUSDTMint:  getEnvOrDefault("SOLANA_USDT_MINT", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
		bscUSDTContract: getEnvOrDefault("BSC_USDT_CONTRACT", "0x55d398326f99059fF775485246999027B3197955"),
		discoveryFee:    99.0, // 发掘费用 99 USDT
	}
}

func getEnvOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

// VerifyPayment 验证支付交易
func (v *PaymentVerifier) VerifyPayment(chain, txHash, payerAddress string) error {
	switch chain {
	case "solana":
		return v.verifySolanaPayment(txHash, payerAddress)
	case "bsc":
		return v.verifyBscPayment(txHash, payerAddress)
	default:
		return fmt.Errorf("unsupported chain: %s", chain)
	}
}

// verifySolanaPayment 验证 Solana USDT 转账
func (v *PaymentVerifier) verifySolanaPayment(txHash, payerAddress string) error {
	if v.solanaWallet == "" {
		// 未配置收款地址时跳过验证（开发环境）
		return nil
	}

	// 调用 Solana RPC 获取交易详情
	payload := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "getTransaction",
		"params": []interface{}{
			txHash,
			map[string]interface{}{
				"encoding":                       "jsonParsed",
				"maxSupportedTransactionVersion": 0,
			},
		},
	}

	body, err := v.rpcCall(v.solanaRPC, payload)
	if err != nil {
		return fmt.Errorf("failed to get transaction: %w", err)
	}

	var result struct {
		Result struct {
			Meta struct {
				Err interface{} `json:"err"`
			} `json:"meta"`
		} `json:"result"`
		Error interface{} `json:"error"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	if result.Error != nil {
		return fmt.Errorf("RPC error: %v", result.Error)
	}

	if result.Result.Meta.Err != nil {
		return fmt.Errorf("transaction failed: %v", result.Result.Meta.Err)
	}

	// TODO: 进一步验证转账金额和收款地址
	// 需要解析 innerInstructions 或 postTokenBalances

	return nil
}

// verifyBscPayment 验证 BSC USDT 转账
func (v *PaymentVerifier) verifyBscPayment(txHash, payerAddress string) error {
	if v.bscWallet == "" {
		// 未配置收款地址时跳过验证（开发环境）
		return nil
	}

	// 调用 BSC RPC 获取交易收据
	payload := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "eth_getTransactionReceipt",
		"params":  []string{txHash},
	}

	body, err := v.rpcCall(v.bscRPC, payload)
	if err != nil {
		return fmt.Errorf("failed to get transaction receipt: %w", err)
	}

	var result struct {
		Result struct {
			Status string `json:"status"`
			To     string `json:"to"`
			Logs   []struct {
				Address string   `json:"address"`
				Topics  []string `json:"topics"`
				Data    string   `json:"data"`
			} `json:"logs"`
		} `json:"result"`
		Error interface{} `json:"error"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	if result.Error != nil {
		return fmt.Errorf("RPC error: %v", result.Error)
	}

	// 检查交易状态
	if result.Result.Status != "0x1" {
		return fmt.Errorf("transaction failed")
	}

	// TODO: 进一步验证转账事件
	// 需要解析 logs 中的 Transfer 事件，验证收款地址和金额

	return nil
}

// rpcCall 执行 RPC 调用
func (v *PaymentVerifier) rpcCall(url string, payload interface{}) ([]byte, error) {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 30 * time.Second}

	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Body = io.NopCloser(bytes.NewReader(jsonPayload))

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}
