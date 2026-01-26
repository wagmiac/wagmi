"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar, useSidebar } from "@/components/imo";
import { DISCOVER_FEE, REVENUE_SPLIT } from "@/types/imo";

type Category = "all" | "basic" | "discover" | "claim" | "revenue";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: Category;
}

const categories: { id: Category; label: string; icon: string }[] = [
  { id: "all", label: "全部", icon: "📋" },
  { id: "basic", label: "基础概念", icon: "💡" },
  { id: "discover", label: "发掘项目", icon: "🔍" },
  { id: "claim", label: "创作者认领", icon: "🏆" },
  { id: "revenue", label: "收益分配", icon: "📈" },
];

const faqItems: FAQItem[] = [
  // 基础概念
  {
    id: "what-is-wagmi",
    question: "什么是 wagmi？",
    answer: "wagmi 是一个 IMO (Initial Meme Offering) 平台，让社区可以为任何优秀项目发行 Meme 币。不需要项目方参与，社区就能为项目发币；项目方可以后续认领社区，获得持续分成。",
    category: "basic",
  },
  {
    id: "what-is-imo",
    question: "什么是 IMO？",
    answer: "IMO 即 Initial Meme Offering，初始 Meme 发行。这是 wagmi 的核心机制，通过「发掘 → 发射 → 认领」的流程，让社区能够为优质项目发行代币。",
    category: "basic",
  },
  {
    id: "supported-chains",
    question: "wagmi 支持哪些链？",
    answer: "目前支持 Solana 和 BSC（币安智能链）。\n\n• Solana：pump.fun、trends.fun、bags.fm\n• BSC：flap.sh",
    category: "basic",
  },
  {
    id: "connect-wallet",
    question: "如何连接钱包？",
    answer: "点击页面左下角的「连接钱包」按钮。\n\n• Solana：支持 Phantom、Solflare\n• BSC：支持 MetaMask",
    category: "basic",
  },
  // 发掘相关
  {
    id: "how-to-discover",
    question: "如何发掘项目？",
    answer: `1. 连接钱包\n2. 点击「发掘项目」按钮\n3. 填写项目信息（名称、简介、Logo）\n4. 添加验证链接（Twitter、GitHub、官网等）\n5. 选择发射链和发射台\n6. 设定首单购买金额\n7. 支付 $${DISCOVER_FEE} 发掘费 + 首单金额\n8. 提交成功后成为该项目的「伯乐」`,
    category: "discover",
  },
  {
    id: "discover-fee",
    question: `为什么要支付 $${DISCOVER_FEE} 发掘费？`,
    answer: `$${DISCOVER_FEE} 发掘费用于：\n\n1. 防止垃圾项目刷屏\n2. 确保发掘者认真筛选项目\n3. 激励发掘真正有价值的项目\n\n作为回报，发掘者（伯乐）将获得该项目 ${REVENUE_SPLIT.scout * 100}% 的持续分成。`,
    category: "discover",
  },
  {
    id: "what-is-scout",
    question: "什么是伯乐（Scout）？",
    answer: `伯乐是发掘并发射项目的人。支付 $${DISCOVER_FEE} + 首单金额成功发掘项目后，您就成为该项目的伯乐。\n\n伯乐权益：\n• 代币命名权（设定 Ticker）\n• 首批代币（以发射价买入）\n• ${REVENUE_SPLIT.scout * 100}% 持续分成`,
    category: "discover",
  },
  {
    id: "first-buy",
    question: "什么是首单购买？",
    answer: "首单购买是伯乐在发掘项目时设定的首次购买金额。这笔资金会在代币发射时以发射价买入代币。\n\n这确保了：\n• 伯乐对项目有信心\n• 伯乐获得首批代币\n• 项目有初始流动性",
    category: "discover",
  },
  // 认领相关
  {
    id: "what-is-claim",
    question: "什么是创作者认领？",
    answer: `如果您的项目被 wagmi 社区发掘，您可以验证身份后「认领」这个社区。\n\n认领后，您将获得 ${REVENUE_SPLIT.creator * 100}% 的持续分成收益。`,
    category: "claim",
  },
  {
    id: "how-to-claim",
    question: "创作者如何认领？",
    answer: "1. 在项目详情页点击「我是创作者，去认领」\n2. 连接钱包\n3. 通过官方渠道验证身份（在 Twitter/GitHub 发布特定内容）\n4. 提交认领申请\n5. wagmi 审核通过后开始接收分成",
    category: "claim",
  },
  {
    id: "verification-icons",
    question: "验证图标有什么用？",
    answer: "验证图标表示项目的官方链接已验证：\n\n• Twitter 已验证\n• GitHub 已验证\n• 官网已验证\n• Product Hunt 已验证\n\n验证图标越多，首次释放比例越高（最高 25%）。",
    category: "claim",
  },
  // 收益相关
  {
    id: "revenue-distribution",
    question: "资金如何分配？",
    answer: `代币交易产生的创作者分成按以下比例分配：\n\n• 创作者：${REVENUE_SPLIT.creator * 100}%（认领后）\n• 伯乐：${REVENUE_SPLIT.scout * 100}%\n• 平台：${REVENUE_SPLIT.platform * 100}%\n\n如果创作者未认领，其 ${REVENUE_SPLIT.creator * 100}% 暂存于 Dev 钱包。`,
    category: "revenue",
  },
  {
    id: "scout-revenue",
    question: "伯乐如何获得收益？",
    answer: `项目发射后，每笔代币交易产生的手续费中，${REVENUE_SPLIT.scout * 100}% 将分配给伯乐。\n\n收益会定期发送到您的钱包，可在「我的」页面查看收益明细。`,
    category: "revenue",
  },
  {
    id: "dev-wallet",
    question: "什么是 Dev 钱包？",
    answer: "Dev 钱包是每个项目的专属钱包，用于：\n\n1. 持有小额代币\n2. 接收发射台的创作者分成\n3. 向伯乐和创作者分配收益\n\n私钥由 wagmi 加密存储。",
    category: "revenue",
  },
];

export default function HelpPage() {
  const [expandedId, setExpandedId] = useState<string | null>("what-is-wagmi");
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { sidebarWidth } = useSidebar();

  const filteredFAQs = faqItems.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch = searchQuery === "" || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />

      <main 
        className="flex-1 transition-all duration-300 pb-20 md:pb-0 pt-16 md:pt-0"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Header */}
        <header className="sticky top-0 md:top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">帮助中心</h1>
              <p className="text-sm text-gray-400 mt-1">了解 wagmi IMO 的运作方式</p>
            </div>
            
            {/* Search */}
            <div className="relative max-w-md w-full">
              <svg 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索问题..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 transition"
              />
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-3 md:p-4 text-center">
              <p className="text-2xl md:text-3xl font-bold text-[#FF8C00] mb-1">${DISCOVER_FEE}</p>
              <p className="text-xs md:text-sm text-gray-400">发掘费用</p>
            </div>
            <div className="bg-[#111111] border border-white/10 rounded-xl p-3 md:p-4 text-center">
              <p className="text-2xl md:text-3xl font-bold text-[#10B981] mb-1">{REVENUE_SPLIT.scout * 100}%</p>
              <p className="text-xs md:text-sm text-gray-400">伯乐分成</p>
            </div>
            <div className="bg-[#111111] border border-white/10 rounded-xl p-3 md:p-4 text-center">
              <p className="text-2xl md:text-3xl font-bold text-[#00E5FF] mb-1">{REVENUE_SPLIT.creator * 100}%</p>
              <p className="text-xs md:text-sm text-gray-400">创作者分成</p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Link 
              href="/submit"
              className="bg-gradient-to-br from-[#FF8C00]/20 to-[#FF8C00]/5 border border-[#FF8C00]/30 rounded-xl p-3 md:p-4 hover:border-[#FF8C00]/50 transition group"
            >
              <div className="text-xl md:text-2xl mb-1 md:mb-2">🔍</div>
              <h3 className="font-bold text-white text-sm md:text-base group-hover:text-[#FF8C00] transition">发掘项目</h3>
              <p className="text-xs text-gray-400 mt-1 hidden md:block">支付 $99 发掘优质项目</p>
            </Link>
            
            <Link 
              href="/"
              className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 hover:border-white/20 transition group"
            >
              <div className="text-xl md:text-2xl mb-1 md:mb-2">💰</div>
              <h3 className="font-bold text-white text-sm md:text-base group-hover:text-[#FF8C00] transition">参与竞拍</h3>
              <p className="text-xs text-gray-400 mt-1 hidden md:block">竞拍获得项目命名权</p>
            </Link>
            
            <Link 
              href="/claim"
              className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 hover:border-white/20 transition group"
            >
              <div className="text-xl md:text-2xl mb-1 md:mb-2">🏆</div>
              <h3 className="font-bold text-white text-sm md:text-base group-hover:text-[#FF8C00] transition">创作者认领</h3>
              <p className="text-xs text-gray-400 mt-1 hidden md:block">认领您的项目社区</p>
            </Link>
            
            <a 
              href="https://www.notion.so/wagmi-meme-IMO-2f39170d2f1080358c6beed82f634437"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 hover:border-white/20 transition group"
            >
              <div className="text-xl md:text-2xl mb-1 md:mb-2">📄</div>
              <h3 className="font-bold text-white text-sm md:text-base group-hover:text-[#FF8C00] transition">白皮书</h3>
              <p className="text-xs text-gray-400 mt-1 hidden md:block">查看完整文档 →</p>
            </a>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
                  activeCategory === cat.id
                    ? "bg-[#FF8C00] text-black"
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="bg-[#111111] border border-white/10 rounded-xl overflow-hidden">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((item, index) => (
                <div 
                  key={item.id} 
                  className={index < filteredFAQs.length - 1 ? "border-b border-white/5" : ""}
                >
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-white/5 transition"
                  >
                    <span className="font-medium text-white pr-4 text-sm md:text-base">{item.question}</span>
                    <svg
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                        expandedId === item.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedId === item.id && (
                    <div className="px-4 pb-4 border-t border-white/5">
                      <p className="text-gray-300 whitespace-pre-line pt-4 leading-relaxed text-sm md:text-base">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-400 mb-3">未找到相关问题</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                  className="text-[#FF8C00] hover:underline text-sm"
                >
                  清除筛选
                </button>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="bg-gradient-to-r from-[#FF8C00]/10 to-transparent border border-[#FF8C00]/20 rounded-xl p-4 md:p-6 mt-6">
            <h3 className="text-base md:text-lg font-bold text-white mb-2">还有其他问题？</h3>
            <p className="text-gray-400 text-sm mb-4">加入我们的社区，与团队和其他用户交流</p>
            <div className="flex flex-wrap gap-2 md:gap-3">
              <a
                href="https://twitter.com/nicekate99"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter
              </a>
              <a
                href="https://t.me/wagmi_imo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Telegram
              </a>
              <a
                href="mailto:hello@wagmi.fun"
                className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
