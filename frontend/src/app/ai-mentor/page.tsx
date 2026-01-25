"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// quickStarters 已移到组件内部以支持国际化

// 模拟 AI 回复
const mockResponses: Record<string, string> = {
  "验证我的 Idea": `好！来聊聊你的 idea 💡

在你开始之前，我需要你回答几个关键问题：

1. **你要解决什么问题？** 具体描述一下用户的痛点
2. **目标用户是谁？** 越具体越好
3. **现在他们怎么解决这个问题？** 竞品或替代方案
4. **你的方案有什么独特之处？**

想清楚这些，idea 是否靠谱就八九不离十了。

来，先说说你的 idea 是什么？🚀`,

  "MVP 怎么做": `MVP 的核心原则：**能验证假设的最小产品**

超级个体做 MVP 的黄金法则：

### 1. 砍功能，砍到不能再砍
问自己：如果只能做一个功能，哪个能验证核心假设？

### 2. 时间盒
给自己设个 deadline：2 周内必须上线。超时说明你想太多了。

### 3. 用现成工具
- 落地页：Framer / Carrd
- 后端：Supabase / Firebase
- 支付：Stripe / LemonSqueezy
- AI 功能：直接调 API

### 4. 丑一点没关系
用户买的是价值，不是 UI。先跑起来再说。

你现在在做什么产品？我帮你理一下 MVP 范围 🎯`,

  "怎么赚钱": `超级个体最适合的变现模式，按推荐排序：

### 🥇 订阅制 (SaaS)
- 稳定现金流，睡后收入
- 适合：工具类产品
- 定价建议：$9-49/月

### 🥈 一次性付费
- 回款快，适合验证市场
- 适合：模板、课程、小工具
- 定价建议：$19-199

### 🥉 API 调用计费
- 按用量收费，边际成本低
- 适合：AI 能力封装
- 定价建议：参考竞品

### ⚠️ 不推荐
- 广告模式（需要巨大流量）
- 纯免费 + 打赏（不稳定）

你的产品是什么类型？我帮你设计变现策略 💰`,

  "冷启动策略": `0 到 1 是最难的，但超级个体有独特优势！

### 冷启动三板斧

**1. Build in Public 🔨**
在 Twitter/小红书 分享你的构建过程
- 每天发进度
- 展示数据（哪怕很惨）
- 人们爱看真实的创业故事

**2. 找到你的 100 个铁杆用户 👥**
- 去目标用户聚集的地方（Reddit、Discord、垂直社区）
- 不是推销，是真诚帮忙
- 一个一个聊，建立关系

**3. 搞一个有传播性的事件 🔥**
- 限时免费
- 公开挑战（30 天从 0 做到 $1000 MRR）
- 与其他创作者联动

你现在有多少用户？产品是什么类型？我帮你制定具体策略 🚀`,

  "AI 工具选型": `超级个体 AI 工具栈推荐（2026 版）：

### 🧠 核心生产力
- **Claude / GPT-4**: 写作、分析、编程
- **Cursor**: AI 编程神器
- **v0.dev**: 快速生成 UI

### 🎨 设计 & 内容
- **Midjourney / DALL-E**: 图片生成
- **Runway**: 视频生成
- **ElevenLabs**: 语音合成

### 📊 运营 & 分析
- **Notion AI**: 知识管理
- **Zapier AI**: 自动化工作流
- **Analytics**: 用户行为分析

### 💡 我的建议
1. 不要贪多，先精通 2-3 个核心工具
2. AI 是放大器，先搞清楚要放大什么
3. 自动化重复工作，把时间留给创造

你主要想用 AI 解决什么问题？🤖`,

  "创业焦虑": `兄弟/姐妹，我懂 🤝

超级个体创业的孤独感是真实的。没有同事、没有老板、所有决定都是你自己做。

### 几个建议

**1. 找到你的 peer group**
- 加入创业者社群（比如 WAGMI！）
- 找 2-3 个同阶段的创业者，定期交流
- 不是为了建议，是为了被理解

**2. 建立节奏感**
- 固定作息，别昼夜颠倒
- 每周给自己一个"关机日"
- 运动，认真的，每周 3 次

**3. 重新定义成功**
- 不是做成独角兽才算成功
- $3000/月的收入 + 自由 = 很棒的人生
- 享受过程，而不是只盯着终点

**4. 接受不确定性**
- 创业本质就是不确定
- 焦虑是正常的，和它共处
- 记录你的小胜利，回头看会很爽

你现在最焦虑的是什么？具体聊聊 💪`
};

function getAIResponse(userMessage: string): string {
  // 检查是否匹配快捷入口关键字
  const keywords = Object.keys(mockResponses);
  for (const keyword of keywords) {
    if (userMessage.includes(keyword)) {
      return mockResponses[keyword];
    }
  }
  return getDefaultResponse();
}

function getDefaultResponse(): string {
  const responses = [
    `好问题！让我来帮你分析一下 🤔

首先，你说的这个方向确实有市场。但关键是：**你的差异化在哪里？**

超级个体创业最重要的不是做得大，而是做得准。

能具体说说你的目标用户是谁吗？他们现在怎么解决这个问题？`,

    `我喜欢你的思考方式！🚀

不过在继续之前，我想问你几个问题：
1. 你愿意为这个 idea 投入多长时间？
2. 你有什么独特的优势来做这件事？
3. 最小的验证方式是什么？

创业不是一蹴而就的，但每一步都要走得明白。Let's WAGMI!`,

    `有意思！这个方向我见过不少人尝试 💡

成功的几个关键点：
- 找到一个足够垂直的切入点
- 先做一个人能做的 MVP
- 用 AI 放大你的生产力

你现在最大的卡点是什么？是 idea 不确定、不知道怎么做、还是做了没人用？`,

    `直说吧，这个 idea 需要打磨一下 🔧

不是说不好，而是太泛了。超级个体创业最忌讳的就是"什么都想做"。

我的建议：
1. 选一个具体的用户群体
2. 解决他们一个具体的痛点
3. 做一个具体的产品

具体到什么程度？具体到你能叫出 10 个目标用户的名字。

要不我们从目标用户开始聊？`
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export default function AIMentorPage() {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 国际化的快捷入口
  const quickStarters = [
    {
      icon: "💡",
      title: t("mentor.topic1"),
      prompt: t("mentor.q1")
    },
    {
      icon: "🚀",
      title: t("mentor.topic2"),
      prompt: t("mentor.q2")
    },
    {
      icon: "💰",
      title: t("mentor.topic3"),
      prompt: t("mentor.q3")
    },
    {
      icon: "📈",
      title: t("mentor.topic4"),
      prompt: t("mentor.q4")
    },
    {
      icon: "🤖",
      title: t("mentor.topic5"),
      prompt: t("mentor.q1")
    },
    {
      icon: "😰",
      title: t("mentor.topic6"),
      prompt: t("mentor.q2")
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // 模拟 AI 思考时间
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    // 添加 AI 回复
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: getAIResponse(content),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickStart = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navigation />

      {/* Main Content */}
      <main className="flex-1 flex flex-col pt-20 max-w-4xl mx-auto w-full">
        {/* Welcome Screen (when no messages) */}
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            {/* Avatar */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#FF8C00]/30 rounded-full blur-[40px]" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-[#FF8C00] to-[#FFD700] rounded-full flex items-center justify-center">
                <span className="text-4xl">🧙‍♂️</span>
              </div>
            </div>

            {/* Welcome Text */}
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
              {t("mentor.welcome")}
            </h1>
            <p className="text-gray-400 text-center max-w-lg mb-8">
              {t("mentor.welcomeDesc")}<br />
              <span className="text-[#FF8C00]">Let&apos;s WAGMI! 🚀</span>
            </p>

            {/* Quick Starters */}
            <div className="w-full max-w-2xl">
              <p className="text-sm text-gray-500 mb-4 text-center">{t("mentor.suggestedQuestions")} 👇</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {quickStarters.map((starter, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickStart(starter.prompt)}
                    className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-[#FF8C00]/50 transition text-left group"
                  >
                    <span className="text-2xl mb-2 block">{starter.icon}</span>
                    <span className="text-white text-sm font-medium group-hover:text-[#FF8C00] transition">
                      {starter.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  message.role === "user" 
                    ? "bg-[#00E5FF]/20" 
                    : "bg-gradient-to-br from-[#FF8C00] to-[#FFD700]"
                }`}>
                  {message.role === "user" ? "👤" : "🧙‍♂️"}
                </div>

                {/* Message Content */}
                <div className={`max-w-[80%] ${message.role === "user" ? "text-right" : ""}`}>
                  <div className={`inline-block p-4 rounded-2xl ${
                    message.role === "user"
                      ? "bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-white"
                      : "bg-white/5 border border-white/10 text-gray-200"
                  }`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                      {message.content.split('\n').map((line, i) => {
                        // Handle headers
                        if (line.startsWith('### ')) {
                          return <h3 key={i} className="text-[#FF8C00] font-bold mt-3 mb-2 text-base">{line.replace('### ', '')}</h3>;
                        }
                        if (line.startsWith('## ')) {
                          return <h2 key={i} className="text-[#FFD700] font-bold mt-4 mb-2 text-lg">{line.replace('## ', '')}</h2>;
                        }
                        // Handle list items
                        if (line.startsWith('- ')) {
                          return <p key={i} className="ml-4 my-1">• {line.replace('- ', '')}</p>;
                        }
                        // Handle numbered items
                        if (/^\d+\.\s/.test(line)) {
                          return <p key={i} className="ml-4 my-1">{line}</p>;
                        }
                        // Handle bold text
                        if (line.includes('**')) {
                          const parts = line.split(/\*\*(.*?)\*\*/g);
                          return (
                            <p key={i} className="my-1">
                              {parts.map((part, j) => 
                                j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part
                              )}
                            </p>
                          );
                        }
                        // Empty lines
                        if (line.trim() === '') {
                          return <br key={i} />;
                        }
                        return <p key={i} className="my-1">{line}</p>;
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 px-2">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#FF8C00] to-[#FFD700] flex items-center justify-center">
                  🧙‍♂️
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[#FF8C00] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-[#FF8C00] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-[#FF8C00] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-gray-400 text-sm">{t("mentor.thinking")}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-white/10 p-4 bg-black/50 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t("mentor.inputPlaceholder")}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 transition"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="px-6 py-3 bg-[#FF8C00] text-black font-semibold rounded-xl hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("mentor.send")}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              💡 {t("mentor.tip")}
            </p>
          </form>
        </div>
      </main>

      {/* Action Buttons (when in conversation) */}
      {messages.length > 0 && (
        <div className="fixed bottom-24 right-6 flex flex-col gap-2">
          <Link
            href="/idea-evaluator"
            className="p-3 bg-[#00E5FF]/20 border border-[#00E5FF]/30 rounded-full hover:bg-[#00E5FF]/30 transition group"
            title="测试你的 Idea"
          >
            <span className="text-xl group-hover:scale-110 transition inline-block">🎯</span>
          </Link>
          <button
            onClick={() => setMessages([])}
            className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition group"
            title="开启新对话"
          >
            <span className="text-xl group-hover:scale-110 transition inline-block">🔄</span>
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}
