// IMO (Initial Meme Offering) 核心类型定义

/**
 * 项目状态（简化版：无竞拍）
 */
export type ProjectStatus = 
  | 'launching'    // 发射中
  | 'launched'     // 已发射
  | 'claimed'      // 已认领
  | 'failed';      // 失败

/**
 * 支持的区块链
 */
export type Chain = 'solana' | 'bsc';

/**
 * 支持的发射台
 */
export type Launchpad = 'pump.fun' | 'trends.fun' | 'bags.fm' | 'flap.sh';

/**
 * 验证图标类型
 */
export interface VerificationIcons {
  twitter: boolean;   // 🐦 Twitter/X 已验证
  github: boolean;    // 🐙 GitHub 已验证
  website: boolean;   // 🌐 官网已验证
  official: boolean;  // 🏆 官方认领
}

/**
 * IMO 项目
 */
export interface Project {
  id: string;
  ticker: string;           // 代币符号，如 $CURSOR
  name: string;             // 项目名称
  logo?: string;            // 项目 Logo URL
  description: string;      // 项目描述
  website?: string;         // 官网链接
  twitter?: string;         // Twitter 链接
  github?: string;          // GitHub 链接
  
  // 发掘信息
  scoutId: string;          // 伯乐 ID
  scoutWallet: string;      // 伯乐钱包地址
  discoveredAt: string;     // 发掘时间 ISO 8601
  
  // 发射信息
  status: ProjectStatus;
  chain: Chain;
  launchpad?: Launchpad;
  firstBuyAmount?: number;  // 伯乐首单买入金额
  tokenAddress?: string;    // 代币合约地址
  launchedAt?: string;      // 发射时间
  devWalletAddress?: string; // Dev 钱包地址
  
  // 创作者认领
  creatorId?: string;       // 创作者 ID
  creatorWallet?: string;   // 创作者钱包地址
  claimedAt?: string;       // 认领时间
  claimStatus?: 'unclaimed' | 'pending' | 'claimed'; // 认领状态
  claimedRevenue?: number;  // 累计交易税收入（USD）
  verification: VerificationIcons;
  
  // 元数据
  createdAt: string;
  updatedAt: string;
}

/**
 * 时间线事件类型（无竞拍）
 */
export type TimelineEventType = 
  | 'discovered'   // 被发掘并发射
  | 'launched'     // 代币上链成功
  | 'claimed'      // 创作者认领
  | 'verified';    // 验证通过

/**
 * 时间线事件
 */
export interface TimelineEvent {
  id: string;
  projectId: string;
  type: TimelineEventType;
  actor?: string;           // 操作者钱包地址
  actorName?: string;       // 操作者名称
  data?: Record<string, unknown>; // 事件附加数据
  createdAt: string;
}

/**
 * 用户信息
 */
export interface User {
  id: string;
  wallet: string;           // 主钱包地址
  wallets?: string[];       // 绑定的所有钱包地址
  name?: string;            // 用户名
  avatar?: string;          // 头像
  twitter?: string;         // Twitter
  github?: string;          // GitHub
  website?: string;         // 个人网站
  
  // 统计
  projectsDiscovered: number;  // 发掘的项目数
  totalRevenue?: string;       // 总收益（伯乐分成）
  
  createdAt: string;
  updatedAt: string;
}

/**
 * 分成记录
 */
export interface RevenueRecord {
  id: string;
  projectId: string;
  amount: number;
  currency: 'SOL' | 'BNB';
  fromWallet: string;       // Dev 钱包地址
  toWallet: string;         // 接收方钱包
  recipientType: 'creator' | 'scout' | 'platform';
  txHash?: string;
  createdAt: string;
}

/**
 * 认领申请
 */
export interface ClaimRequest {
  id: string;
  projectId: string;
  applicantWallet: string;  // 申请者钱包
  proofType: 'twitter' | 'github' | 'website' | 'other';
  proofUrl: string;         // 证明链接
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

// ============ API 请求/响应类型 ============

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * 项目列表查询参数
 */
export interface ProjectListParams extends PaginationParams {
  status?: ProjectStatus;
  chain?: Chain;
  search?: string;
  sortBy?: 'latest' | 'market_cap' | 'most_revenue';
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * 发掘项目请求
 */
export interface DiscoverProjectRequest {
  url: string;              // 项目 URL
  ticker: string;           // 代币符号
  name: string;             // 项目名称
  description: string;      // 描述
  chain: Chain;             // 发射链
  launchpad: Launchpad;     // 发射台
  logo?: string;            // Logo URL
}

/**
 * 认领请求
 */
export interface SubmitClaimRequest {
  proofType: 'twitter' | 'github' | 'website' | 'other';
  proofUrl: string;
}

/**
 * API 响应包装
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============ 前端展示用类型 ============

/**
 * 项目卡片展示数据
 */
export interface ProjectCardData {
  ticker: string;
  name: string;
  logo?: string;
  chain: Chain;
  status: ProjectStatus;
  firstBuyAmount?: number;  // 伯乐首单金额
  launchedAt?: string;      // 发射时间
  verification: VerificationIcons;
}

/**
 * 链配置
 */
export interface ChainConfig {
  id: Chain;
  name: string;
  icon: string;             // 链图标路径
  currency: 'SOL' | 'BNB';
  minFirstBuy: number;      // 最低首单购买金额
  devWalletAmount: number;  // Dev 钱包固定金额
  launchpads: Launchpad[];  // 支持的发射台
}

/**
 * 链配置映射
 */
export const CHAIN_CONFIG: Record<Chain, ChainConfig> = {
  solana: {
    id: 'solana',
    name: 'Solana',
    icon: '/chains/solana.svg',
    currency: 'SOL',
    minFirstBuy: 0.1,
    devWalletAmount: 0.01,
    launchpads: ['pump.fun', 'trends.fun', 'bags.fm'],
  },
  bsc: {
    id: 'bsc',
    name: 'BSC',
    icon: '/chains/bsc.svg',
    currency: 'BNB',
    minFirstBuy: 0.01,
    devWalletAmount: 0.001,
    launchpads: ['flap.sh'],
  },
};

/**
 * 发射台配置
 */
export interface LaunchpadConfig {
  id: Launchpad;
  name: string;
  chain: Chain;
  url: string;
  icon: string;
}

export const LAUNCHPAD_CONFIG: Record<Launchpad, LaunchpadConfig> = {
  'pump.fun': {
    id: 'pump.fun',
    name: 'Pump.fun',
    chain: 'solana',
    url: 'https://pump.fun',
    icon: '/launchpads/pumpfun.svg',
  },
  'trends.fun': {
    id: 'trends.fun',
    name: 'Trends.fun',
    chain: 'solana',
    url: 'https://trends.fun',
    icon: '/launchpads/trendsfun.svg',
  },
  'bags.fm': {
    id: 'bags.fm',
    name: 'Bags.fm',
    chain: 'solana',
    url: 'https://bags.fm',
    icon: '/launchpads/bagsfm.svg',
  },
  'flap.sh': {
    id: 'flap.sh',
    name: 'Flap.sh',
    chain: 'bsc',
    url: 'https://flap.sh',
    icon: '/launchpads/flapsh.svg',
  },
};

/**
 * 发掘配置常量（无竞拍）
 */
export const DISCOVER_CONFIG = {
  discoverFee: 99,                        // 发掘费 $99 USDT
  minFirstBuySOL: 0.1,                    // Solana 最低首单
  minFirstBuyBNB: 0.01,                   // BSC 最低首单
};

/**
 * 发掘费常量（方便导入）
 */
export const DISCOVER_FEE = 99; // $99 USDT

/**
 * 分成比例配置
 */
export const REVENUE_SPLIT = {
  creator: 0.70,   // 创作者 70%
  scout: 0.10,     // 伯乐 10%
  platform: 0.20,  // 平台 20%
};

/**
 * 首次释放比例（根据验证图标数量）
 */
export const INITIAL_RELEASE_RATE: Record<number, number> = {
  1: 0.10,  // 1个验证图标 → 10%
  2: 0.15,  // 2个验证图标 → 15%
  3: 0.20,  // 3个验证图标 → 20%
  4: 0.25,  // 4个及以上 → 25%
};
