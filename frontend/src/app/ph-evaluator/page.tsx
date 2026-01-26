"use client";

import { useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

// API 基础 URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// 类型定义
interface PHProduct {
  id: string;
  ph_id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  thumbnail: string;
  topics: string[];
  upvotes: number;
  comments_count: number;
  maker_name: string;
  maker_headline: string;
  maker_twitter: string;
  maker_products_count: number;
}

interface PHEvaluation {
  id: string;
  product_id: string;
  score_product: number;
  score_community: number;
  score_aigc: number;
  score_maker: number;
  score_meme: number;
  score_total: number;
  product_analysis: string;
  aigc_analysis: string;
  maker_analysis: string;
  community_feedback: string;
  meme_analysis: string;
  risk_warning: string;
  token_suggestion: string;
  recommend_level: number;
  full_report: string;
  product?: PHProduct;
}

interface UserCredits {
  credits: number;
}

// 维度配置
const DIMENSIONS = [
  { key: "score_product", label: "产品力", labelEn: "Product Quality", icon: "🎯", weight: "25%" },
  { key: "score_community", label: "社区热度", labelEn: "Community Heat", icon: "🔥", weight: "20%" },
  { key: "score_aigc", label: "AIGC 相关性", labelEn: "AIGC Relevance", icon: "🤖", weight: "20%" },
  { key: "score_maker", label: "Maker 信誉", labelEn: "Maker Reputation", icon: "👨‍💻", weight: "15%" },
  { key: "score_meme", label: "Meme 潜力", labelEn: "Meme Potential", icon: "✨", weight: "20%" },
];

export default function PHEvaluatorPage() {
  const { locale } = useI18n();
  const { user, token } = useAuth();
  
  const [phUrl, setPhUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(false);
  const [product, setProduct] = useState<PHProduct | null>(null);
  const [evaluation, setEvaluation] = useState<PHEvaluation | null>(null);
  const [error, setError] = useState("");
  const [credits, setCredits] = useState<UserCredits | null>(null);

  // 获取用户积分
  const fetchCredits = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/evaluator/credits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCredits(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch credits:", err);
    }
  };

  // 获取产品信息
  const fetchProduct = async () => {
    if (!phUrl.trim()) {
      setError(locale === "zh" ? "请输入 Product Hunt 链接" : "Please enter a Product Hunt URL");
      return;
    }

    setFetchingProduct(true);
    setError("");
    setProduct(null);
    setEvaluation(null);

    try {
      const res = await fetch(`${API_BASE}/api/evaluator/fetch?url=${encodeURIComponent(phUrl)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch product");
      }

      setProduct(data);
      
      // 如果用户已登录，获取积分
      if (token) {
        await fetchCredits();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch product";
      setError(message);
    } finally {
      setFetchingProduct(false);
    }
  };

  // 执行评估
  const runEvaluation = async () => {
    if (!product) return;
    if (!token) {
      setError(locale === "zh" ? "请先登录" : "Please login first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/evaluator/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: phUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setError(locale === "zh" ? "积分不足，请先购买评估额度" : "Insufficient credits, please purchase first");
          return;
        }
        throw new Error(data.error || "Evaluation failed");
      }

      setEvaluation(data.evaluation);
      
      // 刷新积分
      await fetchCredits();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Evaluation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // 获取推荐等级星星
  const getStars = (level: number) => {
    return "⭐".repeat(level) + "☆".repeat(5 - level);
  };

  // 获取分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-400";
    if (score >= 6) return "text-yellow-400";
    if (score >= 4) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-2xl md:text-3xl font-bold mb-4 flex items-center justify-center gap-3">
              <svg className="w-8 h-8 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="gradient-text">
                {locale === "zh" ? "Product Hunt 评估器" : "Product Hunt Evaluator"}
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              {locale === "zh" 
                ? "输入 Product Hunt 链接，AI 帮你评估项目代币化潜力"
                : "Enter a Product Hunt URL to evaluate tokenization potential"}
            </p>
            
            {/* 积分显示 */}
            {user && credits && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full">
                <span className="text-gray-400">
                  {locale === "zh" ? "剩余额度：" : "Credits: "}
                </span>
                <span className="text-[#FF8C00] font-bold">{credits.credits}</span>
                <Link href="/ph-evaluator/buy" className="text-sm text-blue-400 hover:underline ml-2">
                  {locale === "zh" ? "购买" : "Buy"}
                </Link>
              </div>
            )}
          </div>

          {/* Input Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="url"
                value={phUrl}
                onChange={(e) => setPhUrl(e.target.value)}
                placeholder={locale === "zh" 
                  ? "https://www.producthunt.com/posts/..." 
                  : "https://www.producthunt.com/posts/..."}
                className="flex-1 px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
              />
              <button
                onClick={fetchProduct}
                disabled={fetchingProduct}
                className="px-6 py-3 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition disabled:opacity-50"
              >
                {fetchingProduct 
                  ? (locale === "zh" ? "获取中..." : "Fetching...")
                  : (locale === "zh" ? "获取产品信息" : "Fetch Product")}
              </button>
            </div>
            
            {error && (
              <p className="mt-4 text-red-400 text-center">{error}</p>
            )}
          </div>

          {/* Product Preview */}
          {product && !evaluation && (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-8">
              <div className="flex items-start gap-4 mb-6">
                {product.thumbnail && (
                  <img 
                    src={product.thumbnail} 
                    alt={product.name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{product.name}</h3>
                  <p className="text-gray-400">{product.tagline}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>👆 {product.upvotes}</span>
                    <span>💬 {product.comments_count}</span>
                    {product.maker_name && (
                      <span>👤 {product.maker_name}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {product.topics && product.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {product.topics.map((topic, i) => (
                    <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              {/* 评估按钮 */}
              <div className="text-center">
                {user ? (
                  <button
                    onClick={runEvaluation}
                    disabled={loading}
                    className="px-8 py-4 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] hover:from-[#FF9500] hover:to-[#FF7C00] text-black font-bold text-lg rounded-xl transition disabled:opacity-50"
                  >
                    {loading 
                      ? (locale === "zh" ? "🔮 AI 评估中..." : "🔮 AI Evaluating...")
                      : (locale === "zh" ? "🚀 开始 AI 评估（消耗 1 积分）" : "🚀 Start AI Evaluation (1 Credit)")}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-400">
                      {locale === "zh" ? "请先登录后再进行评估" : "Please login to evaluate"}
                    </p>
                    <Link 
                      href="/auth/login"
                      className="inline-block px-8 py-4 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition"
                    >
                      {locale === "zh" ? "登录" : "Login"}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evaluation Result */}
          {evaluation && (
            <div className="space-y-8">
              {/* Score Overview */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">
                  {locale === "zh" ? "📊 评估结果" : "📊 Evaluation Result"}
                </h2>
                
                {/* Total Score */}
                <div className="mb-6">
                  <div className="text-6xl font-bold gradient-text mb-2">
                    {evaluation.score_total}
                    <span className="text-2xl text-gray-400">/100</span>
                  </div>
                  <div className="text-2xl">
                    {getStars(evaluation.recommend_level)}
                  </div>
                </div>

                {/* Dimension Scores */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {DIMENSIONS.map((dim) => {
                    const score = evaluation[dim.key as keyof PHEvaluation] as number;
                    return (
                      <div key={dim.key} className="bg-black/30 rounded-xl p-4">
                        <div className="text-2xl mb-1">{dim.icon}</div>
                        <div className={`text-xl font-bold ${getScoreColor(score)}`}>
                          {score}/10
                        </div>
                        <div className="text-sm text-gray-400">
                          {locale === "zh" ? dim.label : dim.labelEn}
                        </div>
                        <div className="text-xs text-gray-500">{dim.weight}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Analysis */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 space-y-6">
                <h3 className="text-xl font-bold border-b border-white/10 pb-3">
                  {locale === "zh" ? "📝 详细分析" : "📝 Detailed Analysis"}
                </h3>
                
                {/* Product Analysis */}
                <div>
                  <h4 className="font-bold text-[#FF8C00] mb-2">🎯 {locale === "zh" ? "产品分析" : "Product Analysis"}</h4>
                  <p className="text-gray-300">{evaluation.product_analysis}</p>
                </div>

                {/* AIGC Analysis */}
                <div>
                  <h4 className="font-bold text-[#FF8C00] mb-2">🤖 {locale === "zh" ? "AIGC 判定" : "AIGC Assessment"}</h4>
                  <p className="text-gray-300">{evaluation.aigc_analysis}</p>
                </div>

                {/* Maker Analysis */}
                <div>
                  <h4 className="font-bold text-[#FF8C00] mb-2">👨‍💻 {locale === "zh" ? "Maker 背景" : "Maker Background"}</h4>
                  <p className="text-gray-300">{evaluation.maker_analysis}</p>
                </div>

                {/* Community Feedback */}
                <div>
                  <h4 className="font-bold text-[#FF8C00] mb-2">💬 {locale === "zh" ? "社区反馈" : "Community Feedback"}</h4>
                  <p className="text-gray-300">{evaluation.community_feedback}</p>
                </div>

                {/* Meme Analysis */}
                <div>
                  <h4 className="font-bold text-[#FF8C00] mb-2">✨ {locale === "zh" ? "Meme 潜力" : "Meme Potential"}</h4>
                  <p className="text-gray-300">{evaluation.meme_analysis}</p>
                </div>
              </div>

              {/* Risk & Suggestion */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                  <h4 className="font-bold text-red-400 mb-3">⚠️ {locale === "zh" ? "风险提示" : "Risk Warning"}</h4>
                  <p className="text-gray-300">{evaluation.risk_warning}</p>
                </div>
                
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
                  <h4 className="font-bold text-green-400 mb-3">💡 {locale === "zh" ? "代币化建议" : "Tokenization Suggestion"}</h4>
                  <p className="text-gray-300">{evaluation.token_suggestion}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => {
                    setProduct(null);
                    setEvaluation(null);
                    setPhUrl("");
                  }}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition"
                >
                  {locale === "zh" ? "评估新项目" : "Evaluate Another"}
                </button>

                <button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/ph-evaluator/share/${evaluation.id}`;
                    navigator.clipboard.writeText(shareUrl);
                    alert(locale === "zh" ? "分享链接已复制！" : "Share link copied!");
                  }}
                  className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl transition"
                >
                  {locale === "zh" ? "📤 分享报告" : "📤 Share Report"}
                </button>
                
                <Link
                  href={`/apply?product=${encodeURIComponent(product?.name || "")}`}
                  className="px-6 py-3 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition"
                >
                  {locale === "zh" ? "申请代币化 🚀" : "Apply for Tokenization 🚀"}
                </Link>
              </div>
            </div>
          )}

          {/* Pricing Info */}
          {!evaluation && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <h3 className="text-lg font-bold mb-2 text-gray-300">
                {locale === "zh" ? "🪙 评估定价" : "🪙 Pricing"}
              </h3>
              <p className="text-2xl font-bold text-[#FF8C00] mb-2">$99 USDT</p>
              <p className="text-gray-400 mb-4">
                {locale === "zh" 
                  ? "每次评估消耗 1 积分，支持加密货币支付"
                  : "1 credit per evaluation, crypto payment supported"}
              </p>
              <Link
                href="/ph-evaluator/buy"
                className="inline-block px-6 py-3 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition"
              >
                {locale === "zh" ? "购买评估额度" : "Buy Credits"}
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
