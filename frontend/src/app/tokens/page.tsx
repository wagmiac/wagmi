"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";

interface Token {
  id: string;
  name: string;
  symbol: string;
  logo: string;
  description: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  contract_address?: string;
  chain: string;
  status: 'draft' | 'published';
  market_cap?: string;
  price?: string;
  price_change?: string;
  progress?: number;
  created_at: string;
}

// 截断合约地址显示
function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-6)}`;
}

// 格式化市值
function formatMarketCap(value?: string): string {
  if (!value) return '-';
  const num = parseFloat(value);
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toFixed(2);
}

export default function TokensPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const res = await fetch('/api/tokens');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTokens(data.success ? data.data : []);
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = (e: React.MouseEvent, address: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    // 2秒后清除提示
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Navigation />
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Tokens Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#FF8C00] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🪙</div>
              <h3 className="text-2xl font-bold mb-2">{t("tokens.noTokens")}</h3>
              <p className="text-gray-400">{t("tokens.noTokensDesc")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.map((token) => {
                // 只有有数据时才显示
                const hasPrice = token.price_change && parseFloat(token.price_change) !== 0;
                const priceChange = hasPrice ? parseFloat(token.price_change!) : null;
                const progress = token.progress ?? null;
                
                return (
                  <div
                    key={token.id}
                    onClick={() => router.push(`/tokens/${encodeURIComponent(token.symbol.toLowerCase())}`)}
                    className="group block bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-[#3a3a3a] transition-all cursor-pointer"
                  >
                    {/* 图片区域 */}
                    <div className="relative aspect-square bg-[#0d0d0d] overflow-hidden">
                      <Image
                        src={token.logo}
                        alt={token.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* 进度条 - 只有有数据时显示 */}
                      {progress !== null && (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#1a1a1a]">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-r"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* 信息区域 */}
                    <div className="p-4">
                      {/* 标题行：简称在前，全称在后 */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white truncate">
                            {token.symbol} <span className="text-gray-500 font-normal text-sm">{token.name.length > 12 ? token.name.slice(0, 12) + '...' : token.name}</span>
                          </h3>
                        </div>
                        {priceChange !== null && (
                          <span className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
                          </span>
                        )}
                      </div>

                      {/* 社交链接：X、网站、TG */}
                      {(token.twitter || token.website || token.telegram) && (
                        <div className="flex items-center gap-3 mb-3">
                          {token.twitter && (
                            <a
                              href={token.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-white text-sm"
                            >
                              𝕏
                            </a>
                          )}
                          {token.website && (
                            <a
                              href={token.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-white text-sm"
                            >
                              🌐
                            </a>
                          )}
                          {token.telegram && (
                            <a
                              href={token.telegram}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-white text-sm"
                            >
                              ✈️
                            </a>
                          )}
                        </div>
                      )}

                      {/* 描述 */}
                      <p className="text-gray-400 text-sm mb-4 line-clamp-1">
                        {token.description}
                      </p>

                      {/* 合约地址和市值 - 只显示有数据的 */}
                      <div className="space-y-2 text-sm">
                        {token.contract_address && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">{t("tokens.contractAddress")}:</span>
                            <button
                              onClick={(e) => copyAddress(e, token.contract_address || '')}
                              className={`font-mono transition-colors ${
                                copiedAddress === token.contract_address
                                  ? 'text-yellow-400'
                                  : 'text-green-400 hover:text-green-300'
                              }`}
                              title={t("tokens.copy")}
                            >
                              {copiedAddress === token.contract_address
                                ? t("tokens.copied")
                                : formatAddress(token.contract_address)}
                            </button>
                          </div>
                        )}
                        {token.market_cap && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">{t("tokens.marketCap")}:</span>
                            <span className="text-white">{formatMarketCap(token.market_cap)}</span>
                          </div>
                        )}
                      </div>

                      {/* 底部进度百分比 - 只有有数据时显示 */}
                      {progress !== null && (
                        <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                          <div className="text-right">
                            <span className="text-sm font-medium text-green-400">
                              {progress.toFixed(3)}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 交易链接 */}
                      {token.contract_address && (
                        <div className="mt-3 pt-3 border-t border-[#2a2a2a] flex gap-2">
                          <a
                            href={`https://web3.binance.com/zh-CN/token/${token.chain?.toLowerCase() === 'bsc' ? 'bsc' : 'sol'}/${token.contract_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 py-2 text-center text-xs bg-[#F0B90B]/20 text-[#F0B90B] rounded-lg hover:bg-[#F0B90B]/30 transition"
                          >
                            {t("tokens.binance")}
                          </a>
                          <a
                            href={`https://gmgn.ai/${token.chain?.toLowerCase() === 'bsc' ? 'bsc' : 'sol'}/token/ZWZjVvEH_${token.contract_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 py-2 text-center text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition"
                          >
                            {t("tokens.gmgn")}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
