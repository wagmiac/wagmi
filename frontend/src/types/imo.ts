// IMO (Initial Meme Offering) 核心类型定义

/**
 * 项目状态
 */
export type ProjectStatus = 
  | 'discovering'  // 发掘中
  | 'auctioning'   // 竞拍中
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
export type Launchpad = 'pump.fun' | 'trends.fun' | 'bags.fm' | 'flap.sh' | 'four.meme';

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
 * IMO 项目 - 字段名与后端 JSON 保持一致（snake_case）
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
  product_hunt?: string;    // Product Hunt 链接
  discord?: string;         // Discord 链接
  reddit?: string;          // Reddit 链接
  
  // 状态信息
  status: ProjectStatus;
  chain: Chain;
  launchpad?: Launchpad;
  
  // 发掘信息
  scout_id?: string;        // 伯乐 ID
  scout_wallet?: string;    // 伯乐钱包地址
  discovered_at?: string;   // 发掘时间 ISO 8601
  discover_tx_hash?: string; // 发掘支付交易哈希
  
  // 竞拍信息
  current_bid_amount?: number;  // 当前最高出价
  current_bidder_id?: string;   // 当前出价者 ID
  current_bidder?: string;      // 当前出价者钱包
  bid_count?: number;           // 出价次数
  auction_started_at?: string;  // 竞拍开始时间
  auction_ends_at?: string;     // 竞拍结束时间
  auction_extensions?: number;  // 累计延长次数
  
  // 发射信息
  token_address?: string;       // 代币合约地址
  dev_wallet_address?: string;  // Dev 钱包地址 (兼容旧数据)
  launched_at?: string;         // 发射时间
  launch_tx_hash?: string;      // 发射交易哈希
  
  // 多发射台钱包支持 - 每个发射台一个独立钱包
  launchpad_wallets?: Record<string, string>;  // 各发射台的 Dev 钱包地址 {"pump.fun": "xxx", ...}
  
  // 多发射台支持
  launched_pads?: string[];                    // 已发射的发射台列表
  token_addresses?: Record<string, string>;    // 各发射台代币地址
  
  // 创作者认领
  creator_id?: string;          // 创作者 ID
  creator_wallet?: string;      // 创作者钱包地址
  claimed_at?: string;          // 认领时间
  verify_twitter?: boolean;     // Twitter 已验证
  verify_github?: boolean;      // GitHub 已验证
  verify_website?: boolean;     // 官网已验证
  verify_official?: boolean;    // 官方认领
  
  // 评估状态
  is_evaluating?: boolean;      // 是否正在评估中
  
  // 兼容字段（前端使用）
  verification?: VerificationIcons;
  
  // 元数据
  created_at?: string;
  updated_at?: string;
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
  current_bid_amount?: number;  // 当前出价
  bid_count?: number;           // 出价次数
  discovered_at?: string;       // 发掘时间
  launched_at?: string;         // 发射时间
  verify_twitter?: boolean;
  verify_github?: boolean;
  verify_website?: boolean;
  verify_official?: boolean;
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
    minFirstBuy: 0.02,
    devWalletAmount: 0.001,
    launchpads: ['four.meme', 'flap.sh'],
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
  'four.meme': {
    id: 'four.meme',
    name: 'Four.meme',
    chain: 'bsc',
    url: 'https://four.meme',
    icon: '/launchpads/fourmeme.svg',
  },
};

/**
 * 发掘配置常量（无竞拍）
 */
export const DISCOVER_CONFIG = {
  discoverFee: 99,                        // 发掘费 $99 USDT
  minFirstBuySOL: 0.1,                    // Solana 最低首单
  minFirstBuyBNB: 0.02,                   // BSC 最低首单（发射台收0.01BNB）
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

// ============ AI评估相关类型 ============

/**
 * 评估等级
 */
export type EvaluationGrade = 'S' | 'A' | 'B' | 'C' | 'D';

/**
 * 评估等级配置
 */
export const EVALUATION_GRADES: Record<EvaluationGrade, { label: string; color: string; bgColor: string }> = {
  S: { label: '顶级', color: '#FFD700', bgColor: 'bg-yellow-500/20' },
  A: { label: '优秀', color: '#10B981', bgColor: 'bg-green-500/20' },
  B: { label: '良好', color: '#3B82F6', bgColor: 'bg-blue-500/20' },
  C: { label: '一般', color: '#F59E0B', bgColor: 'bg-orange-500/20' },
  D: { label: '较弱', color: '#EF4444', bgColor: 'bg-red-500/20' },
};

/**
 * 项目AI评估
 */
export interface ProjectEvaluation {
  id: string;
  project_id: string;
  
  // 综合评级
  overall_grade: EvaluationGrade;
  
  // 六维度评级
  grade_product: EvaluationGrade;      // 产品力
  grade_team: EvaluationGrade;         // 团队/背书
  grade_community: EvaluationGrade;    // 社区热度
  grade_meme: EvaluationGrade;         // Meme潜力
  grade_competition: EvaluationGrade;  // 竞争格局
  grade_timing: EvaluationGrade;       // 时机判断
  
  // 维度分析
  analysis_product: string;
  analysis_team: string;
  analysis_community: string;
  analysis_meme: string;
  analysis_competition: string;
  analysis_timing: string;
  
  // 汇总
  highlights: string;          // JSON数组字符串
  risks: string;               // JSON数组字符串
  investment_advice: string;   // 投资建议
  summary: string;             // 一句话总结（用于卡片展示）
  full_report: string;         // 完整Markdown报告
  
  // 评估来源
  evaluated_by: 'system' | 'admin' | 'scout';
  evaluator_id?: string;
  ai_model: string;
  version: number;
  
  // 关联项目
  project?: Project;
  
  created_at: string;
  updated_at: string;
}

/**
 * 评估摘要（用于项目卡片展示）
 */
export interface EvaluationSummary {
  overall_grade: EvaluationGrade;
  summary: string;
  evaluated_at: string;
}

/**
 * 解析评估中的亮点/风险数组
 */
export function parseEvaluationArray(jsonStr: string): string[] {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}

/**
 * 获取评估等级的样式
 */
export function getGradeStyle(grade: EvaluationGrade) {
  return EVALUATION_GRADES[grade] || EVALUATION_GRADES.C;
}

/**
 * 六维度评估配置
 */
export const EVALUATION_DIMENSIONS = [
  { key: 'product', label: '产品力', icon: '🎯', description: '产品创新性、解决的问题、市场需求' },
  { key: 'team', label: '团队/背书', icon: '👥', description: '项目可信度、背书强度' },
  { key: 'community', label: '社区热度', icon: '🔥', description: '社区活跃度、参与度' },
  { key: 'meme', label: 'Meme潜力', icon: '🚀', description: '传播性、病毒性潜力' },
  { key: 'competition', label: '竞争格局', icon: '⚔️', description: '赛道竞争、差异化程度' },
  { key: 'timing', label: '时机判断', icon: '⏰', description: '是否处于风口、趋势契合度' },
] as const;
