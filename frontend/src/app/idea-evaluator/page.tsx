"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/Toast";

// Note: metadata must be in a separate file for client components
// This is handled by the parent layout

// Types
interface EvaluationResult {
  grade: "S" | "A" | "B" | "C" | "D";
  totalScore: number;
  memePhrase: string;
  gradeColor: string;
  dimensions: {
    name: string;
    icon: string;
    score: number;
    comment: string;
  }[];
  suggestions: string[];
}

// Mock evaluation function (in production, this would call an AI API)
function evaluateIdea(idea: string, targetUser: string, monetization: string, locale: "zh" | "en"): EvaluationResult {
  // Simulate AI evaluation with some randomness based on input length
  const baseScore = Math.min(10, 5 + (idea.length / 50));
  const variance = () => Math.random() * 2 - 1;
  
  const dimensionNames = locale === 'zh' 
    ? ["商业潜力", "变现难度", "竞争程度", "技术可行性", "增长潜力", "Meme 潜力"]
    : ["Business Potential", "Monetization Ease", "Competition Level", "Technical Feasibility", "Growth Potential", "Meme Potential"];
  
  const dimensions = [
    { 
      name: dimensionNames[0], 
      icon: "💰", 
      score: Math.min(10, Math.max(1, Math.round(baseScore + variance() + (targetUser.length > 5 ? 1 : 0)))),
      comment: targetUser 
        ? (locale === 'zh' ? `目标用户"${targetUser}"市场需求明确` : `Target user "${targetUser}" has clear market demand`)
        : (locale === 'zh' ? "需要更清晰地定义目标用户群体" : "Need clearer definition of target user group")
    },
    { 
      name: dimensionNames[1], 
      icon: "⚡", 
      score: Math.min(10, Math.max(1, Math.round(baseScore + variance() + (monetization.length > 5 ? 1 : 0)))),
      comment: monetization 
        ? (locale === 'zh' ? `${monetization}模式清晰，变现路径明确` : `${monetization} model is clear with defined monetization path`)
        : (locale === 'zh' ? "建议明确具体的变现模式" : "Suggest clarifying specific monetization model")
    },
    { 
      name: dimensionNames[2], 
      icon: "🏁", 
      score: Math.min(10, Math.max(1, Math.round(baseScore * 0.8 + variance()))),
      comment: locale === 'zh' ? "市场存在竞品但尚未出现绝对垄断者" : "Market has competitors but no absolute monopoly yet"
    },
    { 
      name: dimensionNames[3], 
      icon: "🛠️", 
      score: Math.min(10, Math.max(1, Math.round(baseScore + 1 + variance()))),
      comment: idea.toLowerCase().includes("ai") 
        ? (locale === 'zh' ? "利用现有 AI API 可快速实现" : "Can be quickly implemented using existing AI APIs")
        : (locale === 'zh' ? "技术方案可行，需要一定开发投入" : "Technical solution is feasible, requires development investment")
    },
    { 
      name: dimensionNames[4], 
      icon: "🚀", 
      score: Math.min(10, Math.max(1, Math.round(baseScore + variance()))),
      comment: locale === 'zh' ? "具备规模化潜力，可扩展到更多场景" : "Has scaling potential, can expand to more scenarios"
    },
    { 
      name: dimensionNames[5], 
      icon: "🔥", 
      score: Math.min(10, Math.max(1, Math.round(baseScore * 0.7 + variance()))),
      comment: idea.length > 100 
        ? (locale === 'zh' ? "概念有趣，具备一定话题性" : "Interesting concept with viral potential")
        : (locale === 'zh' ? "实用工具类，话题性一般" : "Utility tool type, moderate viral potential")
    },
  ];

  // Calculate weighted score
  const weights = [0.25, 0.20, 0.15, 0.15, 0.15, 0.10];
  const totalScore = dimensions.reduce((acc, dim, i) => acc + dim.score * weights[i], 0);

  // Determine grade
  let grade: "S" | "A" | "B" | "C" | "D";
  let memePhrase: string;
  let gradeColor: string;

  if (totalScore >= 9.0) {
    grade = "S";
    memePhrase = locale === 'zh' ? "🚀 WAGMI! 冲就完了" : "🚀 WAGMI! Let's go!";
    gradeColor = "from-yellow-400 to-amber-500";
  } else if (totalScore >= 7.5) {
    grade = "A";
    memePhrase = locale === 'zh' ? "💪 有搞头，建议启动" : "💪 Looking good, recommend starting";
    gradeColor = "from-green-400 to-emerald-500";
  } else if (totalScore >= 6.0) {
    grade = "B";
    memePhrase = locale === 'zh' ? "🤔 可以试试，但要优化" : "🤔 Worth trying, but needs optimization";
    gradeColor = "from-blue-400 to-cyan-500";
  } else if (totalScore >= 4.0) {
    grade = "C";
    memePhrase = locale === 'zh' ? "⚠️ 风险较高，三思" : "⚠️ High risk, think twice";
    gradeColor = "from-orange-400 to-amber-500";
  } else {
    grade = "D";
    memePhrase = locale === 'zh' ? "💀 NGMI，换个思路吧" : "💀 NGMI, try a different approach";
    gradeColor = "from-red-400 to-rose-500";
  }

  // Generate suggestions
  const suggestions = locale === 'zh' ? [
    "加入差异化功能，与竞品形成区隔",
    "考虑 B 端变现，提高客单价",
    "设计病毒式传播机制，降低获客成本",
  ] : [
    "Add differentiated features to stand out from competitors",
    "Consider B2B monetization for higher revenue per customer",
    "Design viral mechanisms to reduce customer acquisition cost",
  ];

  return { grade, totalScore, memePhrase, gradeColor, dimensions, suggestions };
}

export default function IdeaEvaluatorPage() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [idea, setIdea] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [monetization, setMonetization] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const loadingTexts = locale === 'zh' ? [
    "正在分析市场潜力...",
    "正在评估技术可行性...",
    "正在计算竞争程度...",
    "正在预测增长潜力...",
    "正在测量 Meme 指数...",
    "AI 正在疯狂思考中...",
  ] : [
    "Analyzing market potential...",
    "Evaluating technical feasibility...",
    "Calculating competition level...",
    "Predicting growth potential...",
    "Measuring Meme index...",
    "AI is thinking hard...",
  ];

  const handleEvaluate = async () => {
    if (idea.length < 10) {
      toast.warning(locale === 'zh' ? "请至少输入 10 个字描述你的 idea" : "Please enter at least 10 characters to describe your idea");
      return;
    }

    setIsLoading(true);
    setResult(null);

    // Simulate loading with changing text
    let textIndex = 0;
    const interval = setInterval(() => {
      setLoadingText(loadingTexts[textIndex % loadingTexts.length]);
      textIndex++;
    }, 500);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2500));

    clearInterval(interval);
    const evaluationResult = evaluateIdea(idea, targetUser, monetization, locale);
    setResult(evaluationResult);
    setIsLoading(false);
  };

  const handleReset = () => {
    setIdea("");
    setTargetUser("");
    setMonetization("");
    setResult(null);
  };

  const handleShare = () => {
    if (!result) return;
    
    const tweetText = locale === 'zh' 
      ? encodeURIComponent(
          `我的 AI 创业 idea 被评为 ${result.grade} 级！${result.grade === "S" ? "🚀" : result.grade === "A" ? "💪" : "🤔"}\n\n"${idea.slice(0, 50)}${idea.length > 50 ? "..." : ""}"\n\n${result.memePhrase}\n\n测测你的 idea 👉 wagmi.xyz/idea-evaluator\n\n#WAGMI #AI创业 #超级个体`
        )
      : encodeURIComponent(
          `My AI startup idea got rated ${result.grade}! ${result.grade === "S" ? "🚀" : result.grade === "A" ? "💪" : "🤔"}\n\n"${idea.slice(0, 50)}${idea.length > 50 ? "..." : ""}"\n\n${result.memePhrase}\n\nTest your idea 👉 wagmi.xyz/idea-evaluator\n\n#WAGMI #AIStartup #SuperIndividual`
        );
    window.open(`https://x.com/intent/tweet?text=${tweetText}`, "_blank");
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      <div className="pt-24 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          
          {/* Header */}
          <header className="text-center mb-12">
            <div className="text-6xl mb-4">🎯</div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {locale === 'zh' ? 'AI 创业 ' : 'AI Startup '}<span className="bg-gradient-to-r from-[#FF8C00] to-[#FFD54F] bg-clip-text text-transparent">{locale === 'zh' ? 'idea 评估器' : 'Idea Evaluator'}</span>
            </h1>
            <p className="text-gray-400">{t('evaluator.subtitle')}</p>
          </header>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-20">
              <div className="text-6xl mb-6 animate-bounce">🤖</div>
              <h2 className="text-2xl font-bold mb-4">{t('evaluator.analyzing')}</h2>
              <div className="w-64 h-2 bg-white/10 rounded-full mx-auto mb-4 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#FF8C00] to-[#00E5FF] animate-pulse rounded-full" style={{ width: "60%" }} />
              </div>
              <p className="text-[#00E5FF] animate-pulse">{loadingText}</p>
            </div>
          )}

          {/* Input Form */}
          {!isLoading && !result && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  {t('evaluator.inputLabel')} <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder={t('evaluator.inputPlaceholder')}
                  className="w-full h-32 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#FF8C00] focus:outline-none transition resize-none"
                  maxLength={500}
                />
                <p className="text-right text-gray-500 text-sm mt-1">{idea.length}/500</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  {locale === 'zh' ? '目标用户是谁' : 'Target Users'} <span className="text-gray-500">{locale === 'zh' ? '（选填）' : '(Optional)'}</span>
                </label>
                <input
                  type="text"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  placeholder={locale === 'zh' ? '例如：小红书博主、内容创作者' : 'e.g., Content creators, Small business owners'}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#FF8C00] focus:outline-none transition"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  {locale === 'zh' ? '你打算怎么赚钱' : 'Monetization Plan'} <span className="text-gray-500">{locale === 'zh' ? '（选填）' : '(Optional)'}</span>
                </label>
                <input
                  type="text"
                  value={monetization}
                  onChange={(e) => setMonetization(e.target.value)}
                  placeholder={locale === 'zh' ? '例如：订阅制 $9.9/月' : 'e.g., Subscription $9.9/month'}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#FF8C00] focus:outline-none transition"
                  maxLength={100}
                />
              </div>

              <button
                onClick={handleEvaluate}
                disabled={idea.length < 10}
                className="w-full py-4 bg-[#FF8C00] text-black font-bold rounded-xl text-lg hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('evaluator.button')}
              </button>

              <p className="text-center text-gray-500 text-sm">
                {locale === 'zh' ? '已有' : ''} <span className="text-[#FF8C00] font-bold">12,345</span> {locale === 'zh' ? '个 idea 被评估' : 'ideas evaluated'}
              </p>
            </div>
          )}

          {/* Result */}
          {!isLoading && result && (
            <div className="space-y-8">
              {/* Original Idea */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-sm text-gray-400 mb-1">{locale === 'zh' ? '🎯 你的 AI 创业 idea' : '🎯 Your AI Startup Idea'}</p>
                <p className="text-white">&ldquo;{idea}&rdquo;</p>
              </div>

              {/* Grade */}
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">{t('evaluator.overallScore')}</p>
                <div className={`inline-block w-24 h-24 rounded-2xl bg-gradient-to-br ${result.gradeColor} flex items-center justify-center mb-4`}>
                  <span className="text-5xl font-black text-white">{result.grade}</span>
                </div>
                <p className="text-2xl font-bold">{result.memePhrase}</p>
                <p className="text-gray-500 text-sm mt-2">{locale === 'zh' ? '综合得分：' : 'Overall Score: '}{result.totalScore.toFixed(1)}/10</p>
              </div>

              {/* Dimensions */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span>📊</span> {locale === 'zh' ? '详细评分' : 'Detailed Scores'}
                </h3>
                {result.dimensions.map((dim, index) => (
                  <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">
                        {dim.icon} {dim.name}
                      </span>
                      <span className="text-[#FF8C00] font-bold">{dim.score}/10</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFD54F] rounded-full transition-all duration-500"
                        style={{ width: `${dim.score * 10}%` }}
                      />
                    </div>
                    <p className="text-gray-400 text-sm">{dim.comment}</p>
                  </div>
                ))}
              </div>

              {/* Suggestions */}
              <div className="p-6 bg-[#00E5FF]/10 border border-[#00E5FF]/30 rounded-xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span>💡</span> {t('evaluator.suggestions')}
                </h3>
                <ul className="space-y-2">
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-300">
                      <span className="text-[#00E5FF]">{index + 1}.</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleShare}
                  className="flex-1 py-4 bg-[#1DA1F2] text-white font-bold rounded-xl hover:bg-[#1a8cd8] transition flex items-center justify-center gap-2"
                >
                  <span>📤</span> {locale === 'zh' ? '分享到 Twitter' : 'Share on Twitter'}
                </button>
                {(result.grade === "S" || result.grade === "A") && (
                  <Link
                    href="#"
                    className="flex-1 py-4 bg-[#FF8C00] text-black font-bold rounded-xl hover:bg-[#FFAD33] transition flex items-center justify-center gap-2"
                  >
                    {t('evaluator.applyNow')}
                  </Link>
                )}
              </div>

              <button
                onClick={handleReset}
                className="w-full py-3 border border-white/20 text-gray-300 rounded-xl hover:bg-white/5 transition"
              >
                {t('evaluator.tryAnother')}
              </button>

            </div>
          )}

        </div>
      </div>
      <Footer />
    </main>
  );
}