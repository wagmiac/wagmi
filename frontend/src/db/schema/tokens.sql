-- Tokens table for WAGMI platform
CREATE TABLE IF NOT EXISTS tokens (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    logo TEXT NOT NULL,
    description TEXT NOT NULL,
    website VARCHAR(500),
    twitter VARCHAR(500),
    telegram VARCHAR(500),
    contract_address VARCHAR(255),
    chain VARCHAR(50) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    market_cap VARCHAR(50),
    price VARCHAR(50),
    volume_24h VARCHAR(50),
    holders INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_symbol (symbol),
    INDEX idx_created_at (created_at)
);

-- Token stats table (for tracking price/market data)
CREATE TABLE IF NOT EXISTS token_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_id VARCHAR(255) NOT NULL,
    price VARCHAR(50),
    market_cap VARCHAR(50),
    volume_24h VARCHAR(50),
    holders INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE,
    INDEX idx_token_timestamp (token_id, timestamp)
);
