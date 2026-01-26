"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface PHProduct {
  id: string;
  name: string;
  tagline: string;
  thumbnail: string;
  upvotes: number;
  comments_count: number;
  maker_name: string;
  topics: string[];
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
  product?: PHProduct;
  created_at: string;
}

const DIMENSIONS = [
  { key: "score_product", label: "产品力", labelEn: "Product Quality", icon: "🎯", weight: "25%" },
  { key: "score_community", label: "社区热度", labelEn: "Community Heat", icon: "🔥", weight: "20%" },
  { key: "score_aigc", label: "AIGC 相关性", labelEn: "AIGC Relevance", icon: "🤖", weight: "20%" },
  { key: "score_maker", label: "Maker 信誉", labelEn: "Maker Reputation", icon: "👨‍💻", weight: "15%" },
  { key: "score_meme", label: "Meme 潜力", labelEn: "Meme Potential", icon: "✨", weight: "20%" },
];

// 辅助函数
const getScoreColor = (score: number) => {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-yellow-400";
  if (score >= 4) return "text-orange-400";
  return "text-red-400";
};

const getStars = (level: number) => {
  return "⭐".repeat(Math.min(level, 5));
};

export default function ShareEvaluationPage() {
  const params = useParams();
  const { locale } = useI18n();
  
  const evaluationId = params.evaluationId as string;
  
  const [evaluation, setEvaluation] = useState<PHEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchEvaluation = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/evaluator/evaluations/${evaluationId}`);
      if (!res.ok) {
        throw new Error("Evaluation not found");
      }
      const data = await res.json();
      setEvaluation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load evaluation");
    } finally {
      setLoading(false);
    }
  }, [evaluationId]);

  useEffect(() => {
    if (evaluationId) {
      fetchEvaluation();
    }
  }, [evaluationId, fetchEvaluation]);

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    const text = locale === "zh"
      ? `🎯 我用 WAGMI 评估了 ${evaluation?.product?.name || "这个项目"}，得分 ${evaluation?.score_total}/100！\n\n快来看看这个产品的代币化潜力：`
      : `🎯 I evaluated ${evaluation?.product?.name || "this project"} with WAGMI, scored ${evaluation?.score_total}/100!\n\nCheck out its tokenization potential:`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-[#FF8C00] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">{locale === "zh" ? "加载评估报告..." : "Loading evaluation..."}</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <main className="pt-24 pb-16">
          <div className="max-w-lg mx-auto px-6 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-4">
              {locale === "zh" ? "评估报告未找到" : "Evaluation Not Found"}
            </h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link
              href="/ph-evaluator"
              className="inline-block px-6 py-3 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition"
            >
              {locale === "zh" ? "开始评估" : "Start Evaluating"}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const product = evaluation.product;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* Share Badge */}
          <div className="text-center mb-6">
            <span className="inline-block px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full text-sm">
              📤 {locale === "zh" ? "分享的评估报告" : "Shared Evaluation Report"}
            </span>
          </div>

          {/* Product Info */}
          {product && (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-8">
              <div className="flex items-start gap-4">
                {product.thumbnail && (
                  <img 
                    src={product.thumbnail} 
                    alt={product.name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">{product.name}</h2>
                  <p className="text-gray-400">{product.tagline}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>👆 {product.upvotes}</span>
                    <span>💬 {product.comments_count}</span>
                    {product.maker_name && <span>👤 {product.maker_name}</span>}
                  </div>
                </div>
              </div>
              
              {product.topics && product.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {product.topics.map((topic, i) => (
                    <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Score Overview */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 text-center mb-8">
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
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 space-y-6 mb-8">
            <h3 className="text-xl font-bold border-b border-white/10 pb-3">
              {locale === "zh" ? "📝 详细分析" : "📝 Detailed Analysis"}
            </h3>
            
            <div>
              <h4 className="font-bold text-[#FF8C00] mb-2">🎯 {locale === "zh" ? "产品分析" : "Product Analysis"}</h4>
              <p className="text-gray-300">{evaluation.product_analysis}</p>
            </div>

            <div>
              <h4 className="font-bold text-[#FF8C00] mb-2">🤖 {locale === "zh" ? "AIGC 判定" : "AIGC Assessment"}</h4>
              <p className="text-gray-300">{evaluation.aigc_analysis}</p>
            </div>

            <div>
              <h4 className="font-bold text-[#FF8C00] mb-2">👨‍💻 {locale === "zh" ? "Maker 背景" : "Maker Background"}</h4>
              <p className="text-gray-300">{evaluation.maker_analysis}</p>
            </div>

            <div>
              <h4 className="font-bold text-[#FF8C00] mb-2">💬 {locale === "zh" ? "社区反馈" : "Community Feedback"}</h4>
              <p className="text-gray-300">{evaluation.community_feedback}</p>
            </div>

            <div>
              <h4 className="font-bold text-[#FF8C00] mb-2">✨ {locale === "zh" ? "Meme 潜力" : "Meme Potential"}</h4>
              <p className="text-gray-300">{evaluation.meme_analysis}</p>
            </div>
          </div>

          {/* Risk & Suggestion */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
              <h4 className="font-bold text-red-400 mb-3">⚠️ {locale === "zh" ? "风险提示" : "Risk Warning"}</h4>
              <p className="text-gray-300">{evaluation.risk_warning}</p>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
              <h4 className="font-bold text-green-400 mb-3">💡 {locale === "zh" ? "代币化建议" : "Tokenization Suggestion"}</h4>
              <p className="text-gray-300">{evaluation.token_suggestion}</p>
            </div>
          </div>

          {/* Share Actions */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 text-center">
            <h3 className="font-bold mb-4">
              {locale === "zh" ? "🚀 分享这份报告" : "🚀 Share This Report"}
            </h3>
            
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <button
                onClick={copyShareLink}
                className={`px-6 py-3 rounded-xl transition ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {copied
                  ? locale === "zh" ? "✓ 已复制" : "✓ Copied"
                  : locale === "zh" ? "📋 复制链接" : "📋 Copy Link"}
              </button>

              <button
                onClick={shareToTwitter}
                className="px-6 py-3 bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 text-[#1DA1F2] rounded-xl transition"
              >
                𝕏 {locale === "zh" ? "分享到 Twitter" : "Share on Twitter"}
              </button>
            </div>

            <p className="text-gray-500 text-sm mb-4">
              {locale === "zh" 
                ? "想要评估更多项目？" 
                : "Want to evaluate more projects?"}
            </p>
            
            <Link
              href="/ph-evaluator"
              className="inline-block px-6 py-3 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition"
            >
              {locale === "zh" ? "开始评估" : "Start Evaluating"}
            </Link>
          </div>

          {/* Footer Note */}
          <p className="text-center text-gray-500 text-sm mt-8">
            {locale === "zh" 
              ? `评估时间：${new Date(evaluation.created_at).toLocaleString("zh-CN")}` 
              : `Evaluated at: ${new Date(evaluation.created_at).toLocaleString("en-US")}`}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
