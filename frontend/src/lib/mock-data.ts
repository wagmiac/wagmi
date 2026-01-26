import { Project } from "@/types/imo";

// Mock 数据 - 用于开发和测试（无竞拍版本）
export const mockProjects: Project[] = [
  {
    id: "1",
    ticker: "$CURSOR",
    name: "Cursor",
    logo: "https://cursor.sh/brand/icon.svg",
    description: "AI-first code editor that helps you build software faster.",
    website: "https://cursor.sh",
    twitter: "https://twitter.com/cursor_ai",
    github: "https://github.com/getcursor",
    scoutId: "scout1",
    scoutWallet: "7xKXtg...",
    discoveredAt: "2026-01-25T10:00:00Z",
    status: "launched",
    chain: "solana",
    launchpad: "pump.fun",
    firstBuyAmount: 2.5,
    tokenAddress: "CURx...abc",
    launchedAt: "2026-01-25T12:00:00Z",
    verification: {
      twitter: true,
      github: true,
      website: false,
      official: false,
    },
    createdAt: "2026-01-25T10:00:00Z",
    updatedAt: "2026-01-26T08:00:00Z",
  },
  {
    id: "2",
    ticker: "$BOLT",
    name: "Bolt.new",
    logo: "https://bolt.new/favicon.svg",
    description: "Prompt, run, edit, and deploy full-stack web apps.",
    website: "https://bolt.new",
    twitter: "https://twitter.com/stackaborflow",
    scoutId: "scout2",
    scoutWallet: "9zLYuh...",
    discoveredAt: "2026-01-24T08:00:00Z",
    status: "claimed",
    chain: "solana",
    launchpad: "pump.fun",
    firstBuyAmount: 5.2,
    tokenAddress: "BLTx...abc",
    launchedAt: "2026-01-24T12:00:00Z",
    claimedAt: "2026-01-25T12:00:00Z",
    claimedRevenue: 64614,
    verification: {
      twitter: true,
      github: false,
      website: true,
      official: true,
    },
    createdAt: "2026-01-24T08:00:00Z",
    updatedAt: "2026-01-25T12:00:00Z",
  },
  {
    id: "3",
    ticker: "$LOVABLE",
    name: "Lovable",
    logo: "https://lovable.dev/favicon.ico",
    description: "The last piece of software you'll ever build. AI-powered full-stack development.",
    website: "https://lovable.dev",
    twitter: "https://twitter.com/lovaborflow",
    scoutId: "scout3",
    scoutWallet: "5bMZui...",
    discoveredAt: "2026-01-26T06:00:00Z",
    status: "launching",
    chain: "solana",
    launchpad: "pump.fun",
    firstBuyAmount: 1.0,
    verification: {
      twitter: false,
      github: false,
      website: false,
      official: false,
    },
    createdAt: "2026-01-26T06:00:00Z",
    updatedAt: "2026-01-26T06:00:00Z",
  },
  {
    id: "4",
    ticker: "$DEVIN",
    name: "Devin",
    logo: "https://devin.ai/favicon.ico",
    description: "The world's first AI software engineer.",
    website: "https://devin.ai",
    twitter: "https://twitter.com/cognition_labs",
    github: "https://github.com/cognition-labs",
    scoutId: "scout1",
    scoutWallet: "7xKXtg...",
    discoveredAt: "2026-01-26T02:00:00Z",
    status: "launched",
    chain: "bsc",
    launchpad: "flap.sh",
    firstBuyAmount: 0.15,
    tokenAddress: "0xDEV...abc",
    launchedAt: "2026-01-26T04:00:00Z",
    verification: {
      twitter: true,
      github: true,
      website: true,
      official: false,
    },
    createdAt: "2026-01-26T02:00:00Z",
    updatedAt: "2026-01-26T08:00:00Z",
  },
  {
    id: "5",
    ticker: "$V0",
    name: "v0.dev",
    logo: "https://v0.dev/icon-dark.svg",
    description: "Chat with v0. Generate UI with simple text prompts.",
    website: "https://v0.dev",
    twitter: "https://twitter.com/v0",
    scoutId: "scout4",
    scoutWallet: "4cNZvi...",
    discoveredAt: "2026-01-23T10:00:00Z",
    status: "claimed",
    chain: "solana",
    launchpad: "trends.fun",
    firstBuyAmount: 8.8,
    tokenAddress: "V0xx...xyz",
    launchedAt: "2026-01-23T14:00:00Z",
    creatorId: "vercel",
    creatorWallet: "7ePZxi...",
    claimedAt: "2026-01-25T10:00:00Z",
    claimedRevenue: 128500,
    verification: {
      twitter: true,
      github: true,
      website: true,
      official: true,
    },
    createdAt: "2026-01-23T10:00:00Z",
    updatedAt: "2026-01-25T10:00:00Z",
  },
  {
    id: "6",
    ticker: "$REPLIT",
    name: "Replit Agent",
    description: "Build apps with AI. From idea to deployed in seconds.",
    website: "https://replit.com",
    twitter: "https://twitter.com/Replit",
    github: "https://github.com/replit",
    scoutId: "scout5",
    scoutWallet: "8fQYyj...",
    discoveredAt: "2026-01-26T07:00:00Z",
    status: "launched",
    chain: "solana",
    launchpad: "pump.fun",
    firstBuyAmount: 3.5,
    tokenAddress: "REPx...xyz",
    launchedAt: "2026-01-26T08:00:00Z",
    verification: {
      twitter: false,
      github: false,
      website: false,
      official: false,
    },
    createdAt: "2026-01-26T07:00:00Z",
    updatedAt: "2026-01-26T07:00:00Z",
  },
];

// 获取项目列表
export function getProjects(filter?: {
  status?: string;
  chain?: string;
}): Project[] {
  let filtered = [...mockProjects];
  
  if (filter?.status && filter.status !== 'all') {
    filtered = filtered.filter(p => p.status === filter.status);
  }
  
  if (filter?.chain && filter.chain !== 'all') {
    filtered = filtered.filter(p => p.chain === filter.chain);
  }
  
  return filtered;
}

// 根据 Ticker 获取项目
export function getProjectByTicker(ticker: string): Project | undefined {
  const normalizedTicker = ticker.startsWith('$') ? ticker : `$${ticker.toUpperCase()}`;
  return mockProjects.find(p => p.ticker.toUpperCase() === normalizedTicker.toUpperCase());
}
