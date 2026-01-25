"use client";

import { useState, useEffect, useRef } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ContentStats from "@/components/ContentStats";
import { useI18n } from "@/lib/i18n";

// 模拟实时数据
interface PlatformStats {
  totalValueLocked: number;
  wagmiPrice: number;
  wagmiPriceChange: number;
  marketCap: number;
  holders: number;
  holdersChange: number;
  volume24h: number;
  projectsIncubated: number;
  projectsLaunched: number;
  totalRaised: number;
  communityMembers: number;
  burnedTokens: number;
}

interface ProjectToken {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
  stage: string;
}

const mockStats: PlatformStats = {
  totalValueLocked: 2850000,
  wagmiPrice: 0.0042,
  wagmiPriceChange: 12.5,
  marketCap: 4200000,
  holders: 8750,
  holdersChange: 125,
  volume24h: 580000,
  projectsIncubated: 28,
  projectsLaunched: 12,
  totalRaised: 850000,
  communityMembers: 12500,
  burnedTokens: 45000000,
};

const mockProjectTokens: ProjectToken[] = [
  { name: "AIScript", symbol: "AIS", price: 0.0085, change24h: 24.5, marketCap: 850000, stage: "Growing" },
  { name: "SoloStack", symbol: "SOLO", price: 0.0123, change24h: -5.2, marketCap: 1230000, stage: "Growing" },
  { name: "CodeReview.ai", symbol: "CRAI", price: 0.0067, change24h: 8.9, marketCap: 670000, stage: "Launched" },
  { name: "MemeForge", symbol: "MFRG", price: 0.0034, change24h: 45.2, marketCap: 340000, stage: "MVP" },
  { name: "PitchPerfect", symbol: "PITCH", price: 0.0028, change24h: -2.1, marketCap: 280000, stage: "MVP" },
];

// 最近交易
interface RecentTx {
  type: "buy" | "sell" | "invest" | "burn";
  token: string;
  amount: string;
  timeMinutes: number;
  address: string;
}

const mockRecentTxs: RecentTx[] = [
  { type: "buy", token: "WAGMI", amount: "125,000", timeMinutes: 2, address: "0x1a2b...3c4d" },
  { type: "invest", token: "AIScript", amount: "$2,500", timeMinutes: 5, address: "0x5e6f...7g8h" },
  { type: "sell", token: "SOLO", amount: "50,000", timeMinutes: 8, address: "0x9i0j...1k2l" },
  { type: "burn", token: "WAGMI", amount: "1,000,000", timeMinutes: 15, address: "platformBuyback" },
  { type: "buy", token: "CRAI", amount: "80,000", timeMinutes: 22, address: "0x3m4n...5o6p" },
];

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num.toFixed(2)}`;
}

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    const startValue = prevValueRef.current;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const newValue = startValue + (value - startValue) * easeOut;
      setDisplayValue(newValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = value;
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span>
      {prefix}
      {displayValue >= 1000000
        ? (displayValue / 1000000).toFixed(2) + "M"
        : displayValue >= 1000
        ? (displayValue / 1000).toFixed(1) + "K"
        : displayValue.toFixed(displayValue < 1 ? 4 : 0)}
      {suffix}
    </span>
  );
}

export default function StatsPage() {
  const { t, locale } = useI18n();
  const [stats] = useState<PlatformStats>(mockStats);
  const [projectTokens] = useState<ProjectToken[]>(mockProjectTokens);
  const [recentTxs] = useState<RecentTx[]>(mockRecentTxs);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-2">
              {t("stats.title")}
            </h1>
            <p className="text-gray-400">
              {t("stats.subtitle")} · {t("stats.lastUpdated")}: {lastUpdate.toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-US")}
            </p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* WAGMI Price */}
            <div className="bg-gradient-to-br from-[#FF8C00]/10 to-[#FFD700]/5 border border-[#FF8C00]/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">{t("stats.wagmiPrice")}</span>
                <span className={`text-sm ${stats.wagmiPriceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {stats.wagmiPriceChange >= 0 ? "+" : ""}{stats.wagmiPriceChange}%
                </span>
              </div>
              <p className="text-3xl font-bold text-white">
                ${stats.wagmiPrice.toFixed(4)}
              </p>
            </div>

            {/* Market Cap */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <span className="text-gray-400 text-sm">{t("stats.marketCap")}</span>
              <p className="text-3xl font-bold text-white mt-2">
                <AnimatedNumber value={stats.marketCap} prefix="$" />
              </p>
            </div>

            {/* TVL */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <span className="text-gray-400 text-sm">{t("stats.totalValue")}</span>
              <p className="text-3xl font-bold text-[#00E5FF] mt-2">
                <AnimatedNumber value={stats.totalValueLocked} prefix="$" />
              </p>
            </div>

            {/* 24h Volume */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <span className="text-gray-400 text-sm">{t("stats.volume24h")}</span>
              <p className="text-3xl font-bold text-white mt-2">
                <AnimatedNumber value={stats.volume24h} prefix="$" />
              </p>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.holders.toLocaleString()}</p>
              <p className="text-gray-500 text-sm">{t("stats.holders")}</p>
              <p className="text-green-400 text-xs mt-1">+{stats.holdersChange} {t("stats.holdersToday")}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.projectsIncubated}</p>
              <p className="text-gray-500 text-sm">{t("stats.incubatedProjects")}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.projectsLaunched}</p>
              <p className="text-gray-500 text-sm">{t("stats.launchedProjects")}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#FFD700]">{formatNumber(stats.totalRaised)}</p>
              <p className="text-gray-500 text-sm">{t("stats.totalRaised")}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{(stats.burnedTokens / 1000000).toFixed(1)}M</p>
              <p className="text-gray-500 text-sm">{t("stats.burned")}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Project Tokens */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-white mb-4">{t("stats.projectTokens")}</h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 text-left">
                        <th className="px-6 py-4 text-gray-400 text-sm font-medium">{t("stats.projectColumn")}</th>
                        <th className="px-6 py-4 text-gray-400 text-sm font-medium">{t("stats.priceColumn")}</th>
                        <th className="px-6 py-4 text-gray-400 text-sm font-medium">{t("stats.change24h")}</th>
                        <th className="px-6 py-4 text-gray-400 text-sm font-medium">{t("stats.marketCapColumn")}</th>
                        <th className="px-6 py-4 text-gray-400 text-sm font-medium">{t("stats.stageColumn")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectTokens.map((token, index) => (
                        <tr
                          key={index}
                          className="border-b border-white/5 hover:bg-white/5 transition"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-[#FF8C00]/20 to-[#FFD700]/20 rounded-full flex items-center justify-center text-sm font-bold text-white">
                                {token.symbol[0]}
                              </div>
                              <div>
                                <p className="text-white font-medium">{token.name}</p>
                                <p className="text-gray-500 text-sm">${token.symbol}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-white">
                            ${token.price.toFixed(4)}
                          </td>
                          <td className={`px-6 py-4 ${token.change24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {token.change24h >= 0 ? "+" : ""}{token.change24h}%
                          </td>
                          <td className="px-6 py-4 text-white">
                            {formatNumber(token.marketCap)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-xs ${
                              token.stage === "Growing"
                                ? "bg-green-500/20 text-green-400"
                                : token.stage === "Launched"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              {token.stage}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">{t("stats.recentTx")}</h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                {recentTxs.map((tx, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        tx.type === "buy"
                          ? "bg-green-500/20 text-green-400"
                          : tx.type === "sell"
                          ? "bg-red-500/20 text-red-400"
                          : tx.type === "invest"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-orange-500/20 text-orange-400"
                      }`}>
                        {tx.type === "buy" ? "↗" : tx.type === "sell" ? "↘" : tx.type === "invest" ? "💰" : "🔥"}
                      </span>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {tx.type === "buy" ? t("stats.txBuy") : tx.type === "sell" ? t("stats.txSell") : tx.type === "invest" ? t("stats.txInvest") : t("stats.txBurn")} {tx.token}
                        </p>
                        <p className="text-gray-500 text-xs">{tx.address === "platformBuyback" ? t("stats.platformBuyback") : tx.address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm">{tx.amount}</p>
                      <p className="text-gray-500 text-xs">{tx.timeMinutes} {t("stats.timeMinutesAgo")}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Burn Stats */}
              <div className="mt-6 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl p-6">
                <h3 className="text-white font-bold mb-3">{t("stats.burnStats")}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">{t("stats.totalBurned")}</span>
                    <span className="text-white font-medium">{(stats.burnedTokens / 1000000).toFixed(1)}M WAGMI</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">{t("stats.burnRatio")}</span>
                    <span className="text-red-400 font-medium">4.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">{t("stats.monthlyBurn")}</span>
                    <span className="text-white font-medium">2.3M WAGMI</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Placeholder */}
          <div className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-gray-500 mb-2">{t("stats.priceChart")}</p>
            <p className="text-gray-600 text-sm">{t("stats.chartComingSoon")}</p>
            <div className="mt-4 h-48 bg-white/5 rounded-xl flex items-center justify-center">
              <span className="text-gray-600">{t("stats.chartPlaceholder")}</span>
            </div>
          </div>

          {/* Content Statistics */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6">📊 内容洞察统计</h2>
            <ContentStats />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
