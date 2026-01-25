"use client";

import { useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";

interface FAQItem {
  questionKey: string;
  answerKey: string;
}

const faqItems: FAQItem[] = [
  { questionKey: "faq.q1", answerKey: "faq.a1" },
  { questionKey: "faq.q2", answerKey: "faq.a2" },
  { questionKey: "faq.q3", answerKey: "faq.a3" },
  { questionKey: "faq.q4", answerKey: "faq.a4" },
  { questionKey: "faq.q5", answerKey: "faq.a5" },
  { questionKey: "faq.q6", answerKey: "faq.a6" },
  { questionKey: "faq.q7", answerKey: "faq.a7" },
];

export default function FAQPage() {
  const { t, locale } = useI18n();
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // 动态生成 FAQ 数据
  const faqData = faqItems.map(item => ({
    question: t(item.questionKey),
    answer: t(item.answerKey),
  }));

  const filteredFAQ = faqData.filter(item => {
    const matchSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t("faq.title")}
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {t("faq.subtitle")}
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="px-6 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder={locale === "zh" ? "搜索问题..." : "Search questions..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 transition"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ List */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          {filteredFAQ.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg mb-4">
                {locale === "zh" ? "没有找到相关问题" : "No matching questions found"}
              </p>
              <Link href="/ai-mentor" className="text-[#FF8C00] hover:underline">
                {locale === "zh" ? "试试问问 AI 导师 →" : "Try asking AI Mentor →"}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFAQ.map((item, index) => (
                <div
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition"
                >
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#FF8C00]">Q</span>
                      <span className="text-white font-medium">{item.question}</span>
                    </div>
                    <span className={`text-gray-400 transition-transform ${openItems.has(index) ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {openItems.has(index) && (
                    <div className="px-6 pb-5 pt-0">
                      <div className="pl-8 border-l-2 border-[#FF8C00]/30">
                        <p className="text-gray-300 leading-relaxed">{item.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Still Have Questions CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-[#FF8C00]/10 to-[#00E5FF]/10 border border-white/10 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {t("faq.moreQuestions")}
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            {locale === "zh" 
              ? "AI 导师 24/7 在线，随时解答你关于创业的任何问题。"
              : "AI Mentor is online 24/7, ready to answer any questions about entrepreneurship."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/ai-mentor"
              className="px-8 py-4 bg-[#FF8C00] text-black font-bold rounded-full hover:bg-[#FFAD33] transition"
            >
              {locale === "zh" ? "🧙‍♂️ 找 AI 导师聊聊" : "🧙‍♂️ Chat with AI Mentor"}
            </Link>
            <a
              href="https://x.com/wagmiac"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 border border-white/20 text-white rounded-full hover:bg-white/5 transition"
            >
              {locale === "zh" ? "𝕏 关注 Twitter" : "𝕏 Follow on Twitter"}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
