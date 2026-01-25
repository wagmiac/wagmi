"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  contract_address: string;
  chain: string;
  status: 'draft' | 'published';
  market_cap?: string;
  price?: string;
  volume_24h?: string;
  holders?: number;
  created_at: string;
}

export default function TokenDetailPage() {
  const params = useParams();
  const { t } = useI18n();
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchToken = async () => {
    try {
      const res = await fetch(`/api/tokens/${params.id}`);
      if (!res.ok) {
        setToken(null);
        return;
      }
      const data = await res.json();
      setToken(data.success ? data.data : null);
    } catch (error) {
      console.error('Failed to fetch token:', error);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (token?.contract_address) {
      navigator.clipboard.writeText(token.contract_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <div className="pt-24 pb-16 px-6 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#FF8C00] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white">
        <Navigation />
        <div className="pt-24 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold mb-2">{t("tokens.notFound")}</h2>
            <p className="text-gray-400 mb-6">{t("tokens.notFoundDesc")}</p>
            <Link
              href="/tokens"
              className="inline-block px-6 py-3 bg-[#FF8C00] text-white rounded-xl hover:bg-[#FF8C00]/90 transition"
            >
              {t("tokens.backToList")}
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Navigation />
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/tokens"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-6"
            >
              ← {t("tokens.backToList")}
            </Link>
            
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Image
                src={token.logo}
                alt={token.name}
                width={100}
                height={100}
                className="rounded-full border-4 border-white/10"
              />
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{token.symbol}</h1>
                <p className="text-xl text-gray-400 mb-4">{token.name}</p>
                <div className="flex flex-wrap gap-3">
                  {token.website && (
                    <a
                      href={token.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition text-sm"
                    >
                      🌐 {t("tokens.website")}
                    </a>
                  )}
                  {token.twitter && (
                    <a
                      href={token.twitter.startsWith('@') ? `https://twitter.com/${token.twitter.slice(1)}` : token.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition text-sm"
                    >
                      𝕏 Twitter
                    </a>
                  )}
                  {token.telegram && (
                    <a
                      href={token.telegram.startsWith('@') ? `https://t.me/${token.telegram.slice(1)}` : token.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition text-sm"
                    >
                      ✈️ Telegram
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {token.price && (
              <div className="p-6 bg-gradient-to-br from-[#FF8C00]/10 to-[#FF8C00]/5 border border-[#FF8C00]/20 rounded-2xl">
                <div className="text-sm text-gray-400 mb-2">{t("tokens.price")}</div>
                <div className="text-2xl font-bold font-mono">${token.price}</div>
              </div>
            )}
            {token.market_cap && (
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-sm text-gray-400 mb-2">{t("tokens.marketCap")}</div>
                <div className="text-2xl font-bold font-mono">${token.market_cap}</div>
              </div>
            )}
            {token.volume_24h && (
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-sm text-gray-400 mb-2">{t("tokens.volume24h")}</div>
                <div className="text-2xl font-bold font-mono">${token.volume_24h}</div>
              </div>
            )}
            {token.holders && (
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-sm text-gray-400 mb-2">{t("tokens.holders")}</div>
                <div className="text-2xl font-bold font-mono">{token.holders.toLocaleString()}</div>
              </div>
            )}
          </div>

          {/* Contract Address */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t("tokens.contractInfo")}</h3>
              <span className="px-3 py-1 bg-[#FF8C00]/20 text-[#FF8C00] text-sm rounded-lg">
                {token.chain}
              </span>
            </div>
            <div className="flex items-center gap-3 bg-black/50 p-4 rounded-xl">
              <code className="flex-1 text-sm font-mono text-[#00E5FF] break-all">
                {token.contract_address}
              </code>
              <button
                onClick={copyAddress}
                className="flex-shrink-0 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-sm"
              >
                {copied ? t("tokens.copiedShort") : t("tokens.copy")}
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl mb-8">
            <h3 className="text-lg font-bold mb-4">{t("tokens.projectIntro")}</h3>
            <p className="text-gray-300 leading-relaxed">{token.description}</p>
          </div>

          {/* Trading Button */}
          <div className="p-8 bg-gradient-to-br from-[#FF8C00]/20 via-[#00E5FF]/10 to-purple-500/10 border border-[#FF8C00]/30 rounded-2xl text-center">
            <h3 className="text-2xl font-bold mb-4">{t("tokens.readyToTrade")}</h3>
            <p className="text-gray-300 mb-6">
              {t("tokens.tradingDesc").replace("{chain}", token.chain).replace("{symbol}", token.symbol)}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href={`https://web3.binance.com/zh-CN/token/${token.chain?.toLowerCase() === 'bsc' ? 'bsc' : 'sol'}/${token.contract_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] text-black rounded-xl hover:opacity-90 transition font-medium"
              >
                {t("tokens.tradeOnBinance")}
              </a>
              <a
                href={`https://gmgn.ai/${token.chain?.toLowerCase() === 'bsc' ? 'bsc' : 'sol'}/token/ZWZjVvEH_${token.contract_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition font-medium"
              >
                {t("tokens.tradeOnGMGN")}
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
