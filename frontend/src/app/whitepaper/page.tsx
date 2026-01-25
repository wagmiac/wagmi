"use client";

import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import { useI18n } from "@/lib/i18n";

// 中文内容
const contentZh = {
  title: "WAGMI",
  subtitle: "去中心化孵化场白皮书",
  tagline: "We're All Gonna Make It — 从野蛮中生长",
  tocTitle: "目录",
  toc: [
    { id: "summary", text: "1. 摘要" },
    { id: "problems", text: "2. 问题与痛点" },
    { id: "solution", text: "3. 解决方案：野蛮生长" },
    { id: "business", text: "4. 商业模式" },
    { id: "fund", text: "5. 平台基金" },
    { id: "process", text: "6. 孵化流程" },
    { id: "network", text: "7. 众包支持网络" },
    { id: "roadmap", text: "8. 路线图" },
    { id: "risk", text: "9. 风险提示" },
    { id: "conclusion", text: "10. 结语" },
  ],
  sections: {
    summary: {
      title: "1. 摘要",
      content: [
        "WAGMI 不是传统孵化器，不是 VC，不是 DAO 的官僚大会。",
        "我们是 <strong>Meme 驱动的去中心化孵化场</strong>，专注于 AI 时代的 <strong>超级个体创业者</strong>。",
        "2026 年，AI 超级生产力爆发，一个人 + AI 就能干掉一个团队。",
      ],
      features: [
        "发现有商业潜力的爆款 idea",
        "将这些 idea 代币化",
        "邀请原作者或任何有执行力的开发者参与，提供资金和社区支持",
        "让市场决定哪些项目值得继续，哪些自然淘汰",
      ],
      highlight: "从市场中来，到市场中去。We're All Gonna Make It。",
    },
    problems: {
      title: "2. 问题与痛点",
      intro: "有很多让人眼前一亮的 idea：",
      examples: [
        "\"我发现了一个 AI 自动化赚钱的方法\"",
        "\"这个 SaaS idea 如果有人做，肯定能火\"",
        "\"我有个超酷的 AI Agent 创意，但没时间开发\"",
        "\"分享一个价值百万的商业模式，可惜我不会编程\"",
      ],
      why: "但大多数只停留在分享阶段。为什么？",
      reasons: [
        "缺少从概念到产品的执行支持",
        "缺少启动资金和早期用户",
        "缺少快速验证商业价值的通道",
      ],
      conclusion: "传统孵化器？太慢，太正式，不适合快节奏的 AI 创业时代。",
      answer: "<strong>WAGMI 的答案：用代币化机制加速从 idea 到市场验证的全过程。</strong>",
    },
    solution: {
      title: "3. 解决方案：野蛮生长",
      highlight: "WAGMI = 主动狩猎 + 代币化 + 反向邀请 + 市场验证",
      features: [
        { 
          icon: "🎯", 
          title: "主动狩猎爆款 idea", 
          desc: "我们不等项目来申请。我们主动去寻找：AI 变现相关的 idea、超级个体创业的成功案例、新工具、新产品、新商业模式。标准很简单：<strong>有变现潜力 + 可执行</strong>。" 
        },
        { 
          icon: "🪙", 
          title: "直接代币化", 
          desc: "发现爆款 idea 后，<strong>直接在发射台上代币化这个 idea</strong>。代币名称：根据 idea 命名；初始流动性：WAGMI 提供；创作者分成钱包：WAGMI 控制。" 
        },
        { 
          icon: "💬", 
          title: "反向邀请", 
          desc: "代币发射后，<strong>在原帖下留言</strong>：\"Hey fren，我们看好你的 idea，已经给你代币化了 [$TICKER]。要不要一起玩？如果你愿意推进这个项目，我们提供资金和社区支持。WAGMI 🚀\"" 
        },
        { 
          icon: "👐", 
          title: "开放合作", 
          desc: "如果原作者不感兴趣，欢迎任何有执行力的开发者申请接手！用代币创作者收益 + WAGMI 基金池资助你落地。提交简单 proposal（你是谁、怎么做、需多少资金），快速链接评估。评估通过后，WAGMI 代表社区拿股权比例（e.g., 15% 项目收益）。你专注执行，我们提供社区赋能。" 
        },
        { 
          icon: "📊", 
          title: "市场自己筛选", 
          desc: "作者感兴趣 + 社区有热度 = 继续推进；作者不理 or 社区无反应 = 自然归零。<strong>一切从野蛮中生长。</strong>" 
        },
        { 
          icon: "🤝", 
          title: "孵化陪跑", 
          desc: "作者或开发者愿意参与的项目，WAGMI 提供：初始资金支持、社区资源和流量支持、技术/营销/商务的众包支持网络。作者/开发者专注执行，社区众包赋能。" 
        },
        { 
          icon: "🔥", 
          title: "Meme 文化", 
          desc: "严肃 = NGMI。我们相信 meme 的力量，相信社区的力量，相信 WAGMI。" 
        },
      ],
    },
    business: {
      title: "4. 商业模式",
      intro: "WAGMI 不额外收取费用，收入来源于第三方发射台的 <strong>创作者分成机制</strong>。",
      sources: [
        "发射台的创作者分成",
        "孵化项目成功后的收益分成",
      ],
      projectShare: {
        title: "项目币创作者分成",
        items: ["70% → 支持项目本身运作", "30% → 沉淀入平台基金"],
        note: "作者愿意参与后，70% 那部分转给作者使用。",
      },
      afterSuccess: {
        title: "孵化项目成功后",
        items: ["WAGMI 获得事先约定的收益分成", "所得收益全部进入平台基金"],
      },
      afterFailure: {
        title: "孵化项目失败",
        text: "投资失败，无后续。这就是社会实验。",
      },
    },
    fund: {
      title: "5. 平台基金",
      intro: "所有收入进入平台基金，用于：",
      uses: [
        "支持更多爆款 idea 的代币化",
        "提供更多社区支持和资源",
        "维持平台运营和发展",
      ],
    },
    process: {
      title: "6. 孵化流程：从野蛮到文明",
      steps: [
        { step: "1", title: "狩猎爆款", desc: "全网搜索：AI、变现、超级个体、新项目相关爆款 idea。筛选标准：有变现潜力 + 可执行" },
        { step: "2", title: "直接代币化", desc: "在发射台发射代币。代币命名：根据 idea 命名（如 $AIMONEY / $SOLOSAAS）。初始流动性：WAGMI 提供。创作者分成：WAGMI 钱包控制" },
        { step: "3", title: "反向邀请", desc: "在原帖下评论：\"已代币化，要不要一起玩？\"。同步发推宣传" },
        { step: "4", title: "市场验证", desc: "作者回应 + 社区买入 = 项目有潜力。无人理睬 = 进入开放合作或自然归零" },
        { step: "5", title: "协商合作", desc: "协商合作细节 → 签订协议。明确收益分成。注资，执行协议" },
        { step: "6", title: "孵化陪跑", desc: "创作者分成持续支持项目运营。WAGMI 提供社区、技术、营销支持。作者/开发者专注执行，社区众包赋能" },
      ],
    },
    network: {
      title: "7. 众包支持网络",
      intro: "WAGMI 不是保姆，我们只是搭台。",
      supports: [
        { icon: "🛠️", title: "研发支持", desc: "技术、代码、设计" },
        { icon: "📣", title: "营销支持", desc: "文案、meme、推广" },
        { icon: "🌍", title: "市场支持", desc: "用户反馈、商务对接、渠道资源" },
        { icon: "🔗", title: "资源匹配", desc: "人才、资本、项目合作" },
      ],
    },
    roadmap: {
      title: "8. 路线图",
      mainText: "没有路线图。",
      desc: "WAGMI 是一场从野蛮中生长的社会实验。我们不画大饼，不做空头承诺。今天狩猎爆款，明天代币化，后天看市场反应。",
      ending: "能活下来的项目，自然会长大。活不下来的，归零就归零。",
      slogan: "<strong>一切从野蛮中生长。WAGMI or NGMI。</strong>",
    },
    risk: {
      title: "9. 风险提示 ⚠️",
      content: [
        "WAGMI 是一场 <strong>社会实验</strong>。",
        "社会实验的意思是：<strong class='text-red-400'>可能成功，也可能失败。</strong>",
      ],
    },
    conclusion: {
      title: "10. 结语",
      content: [
        "WAGMI 不是温室，是战场。",
        "我们相信：一个人 + AI + 一个够癫的 idea，就能赚到钱。",
        "我们相信：Meme 的力量，市场的力量，野蛮生长的力量。",
        "我们不等你来申请，我们主动找到你，代币化你的 idea，然后问你：",
      ],
      question: "\"要不要一起玩？\"",
      ending: "能不能成？不知道。但至少，我们试了。",
      final: "<strong>We're All Gonna Make It — 从野蛮中生长。🚀</strong>",
    },
  },
  footer: "WAGMI Hatchery © 2026",
};

// 英文内容
const contentEn = {
  title: "WAGMI",
  subtitle: "Decentralized Hatchery Whitepaper",
  tagline: "We're All Gonna Make It — Grow from the Wild",
  tocTitle: "Table of Contents",
  toc: [
    { id: "summary", text: "1. Summary" },
    { id: "problems", text: "2. Problems & Pain Points" },
    { id: "solution", text: "3. Solution: Wild Growth" },
    { id: "business", text: "4. Business Model" },
    { id: "fund", text: "5. Platform Fund" },
    { id: "process", text: "6. Incubation Process" },
    { id: "network", text: "7. Crowdsourced Support Network" },
    { id: "roadmap", text: "8. Roadmap" },
    { id: "risk", text: "9. Risk Disclosure" },
    { id: "conclusion", text: "10. Conclusion" },
  ],
  sections: {
    summary: {
      title: "1. Summary",
      content: [
        "WAGMI is not a traditional incubator, not a VC, not a bureaucratic DAO committee.",
        "We are a <strong>Meme-driven decentralized hatchery</strong>, focused on <strong>Solo Founders</strong> in the AI era.",
        "In 2026, AI superproductivity is exploding. One person + AI can outperform an entire team.",
      ],
      features: [
        "Discover viral ideas with commercial potential",
        "Tokenize these ideas",
        "Invite original authors or any capable developers to participate, provide funding and community support",
        "Let the market decide which projects continue, which naturally fade",
      ],
      highlight: "From the market, to the market. We're All Gonna Make It.",
    },
    problems: {
      title: "2. Problems & Pain Points",
      intro: "There are many brilliant ideas out there:",
      examples: [
        "\"I discovered an AI automation method to make money\"",
        "\"If someone builds this SaaS idea, it'll definitely go viral\"",
        "\"I have a cool AI Agent idea but no time to develop it\"",
        "\"Sharing a million-dollar business model, too bad I can't code\"",
      ],
      why: "But most stay at the sharing stage. Why?",
      reasons: [
        "Lack of execution support from concept to product",
        "No initial funding or early users",
        "No fast channel to validate commercial value",
      ],
      conclusion: "Traditional incubators? Too slow, too formal, not suitable for fast-paced AI entrepreneurship.",
      answer: "<strong>WAGMI's answer: Use tokenization mechanism to accelerate the entire process from idea to market validation.</strong>",
    },
    solution: {
      title: "3. Solution: Wild Growth",
      highlight: "WAGMI = Active Hunting + Tokenization + Reverse Invitation + Market Validation",
      features: [
        { 
          icon: "🎯", 
          title: "Hunt Viral Ideas Proactively", 
          desc: "We don't wait for applications. We actively search for: AI monetization ideas, solo founder success stories, new tools, new products, new business models. Simple criteria: <strong>monetization potential + executable</strong>." 
        },
        { 
          icon: "🪙", 
          title: "Direct Tokenization", 
          desc: "After finding a viral idea, <strong>directly tokenize it on a launchpad</strong>. Token name: named after the idea; Initial liquidity: provided by WAGMI; Creator share wallet: controlled by WAGMI." 
        },
        { 
          icon: "💬", 
          title: "Reverse Invitation", 
          desc: "After token launch, <strong>comment on the original post</strong>: \"Hey fren, we like your idea and tokenized it as [$TICKER]. Want to play together? If you're willing to push this project forward, we provide funding and community support. WAGMI 🚀\"" 
        },
        { 
          icon: "👐", 
          title: "Open Collaboration", 
          desc: "If the original author isn't interested, we welcome any capable developers to take over! Use token creator revenue + WAGMI fund to support implementation. Submit a simple proposal (who you are, how to do it, funding needed), quick evaluation. After approval, WAGMI represents the community to take equity share (e.g., 15% project revenue). You focus on execution, we provide community empowerment." 
        },
        { 
          icon: "📊", 
          title: "Market Self-Selection", 
          desc: "Author interested + community has heat = continue; Author ignores or community no response = naturally goes to zero. <strong>Everything grows from the wild.</strong>" 
        },
        { 
          icon: "🤝", 
          title: "Incubation Support", 
          desc: "For projects where authors or developers are willing to participate, WAGMI provides: initial funding support, community resources and traffic support, crowdsourced tech/marketing/business support network. Author/developer focuses on execution, community provides empowerment." 
        },
        { 
          icon: "🔥", 
          title: "Meme Culture", 
          desc: "Serious = NGMI. We believe in the power of memes, community, and WAGMI." 
        },
      ],
    },
    business: {
      title: "4. Business Model",
      intro: "WAGMI charges no extra fees. Revenue comes from third-party launchpad <strong>creator share mechanisms</strong>.",
      sources: [
        "Launchpad creator share",
        "Revenue share from successful incubated projects",
      ],
      projectShare: {
        title: "Project Token Creator Share",
        items: ["70% → Support project operations", "30% → Deposited into platform fund"],
        note: "After author agrees to participate, the 70% portion is transferred for their use.",
      },
      afterSuccess: {
        title: "After Project Success",
        items: ["WAGMI receives pre-agreed revenue share", "All proceeds go into platform fund"],
      },
      afterFailure: {
        title: "Project Failure",
        text: "Investment failed, no follow-up. That's the social experiment.",
      },
    },
    fund: {
      title: "5. Platform Fund",
      intro: "All revenue goes into the platform fund, used for:",
      uses: [
        "Supporting tokenization of more viral ideas",
        "Providing more community support and resources",
        "Maintaining platform operations and development",
      ],
    },
    process: {
      title: "6. Incubation Process: From Wild to Civilized",
      steps: [
        { step: "1", title: "Hunt Viral Ideas", desc: "Search the web: AI, monetization, solo founders, new project-related viral ideas. Screening criteria: monetization potential + executable" },
        { step: "2", title: "Direct Tokenization", desc: "Launch token on launchpad. Token naming: based on idea (e.g. $AIMONEY / $SOLOSAAS). Initial liquidity: provided by WAGMI. Creator share: WAGMI wallet controlled" },
        { step: "3", title: "Reverse Invitation", desc: "Comment on original post: \"Tokenized, want to play together?\". Tweet promotion simultaneously" },
        { step: "4", title: "Market Validation", desc: "Author responds + community buys = project has potential. No response = open collaboration or naturally goes to zero" },
        { step: "5", title: "Negotiate Collaboration", desc: "Negotiate details → sign agreement. Define revenue share. Invest, execute agreement" },
        { step: "6", title: "Incubation Support", desc: "Creator share continuously supports project operations. WAGMI provides community, tech, marketing support. Author/developer focuses on execution, community provides empowerment" },
      ],
    },
    network: {
      title: "7. Crowdsourced Support Network",
      intro: "WAGMI is not a babysitter, we just set the stage.",
      supports: [
        { icon: "🛠️", title: "Dev Support", desc: "Tech, code, design" },
        { icon: "📣", title: "Marketing Support", desc: "Copywriting, memes, promotion" },
        { icon: "🌍", title: "Market Support", desc: "User feedback, business connections, channel resources" },
        { icon: "🔗", title: "Resource Matching", desc: "Talent, capital, project collaborations" },
      ],
    },
    roadmap: {
      title: "8. Roadmap",
      mainText: "No roadmap.",
      desc: "WAGMI is a social experiment growing from the wild. We don't make empty promises. Hunt viral ideas today, tokenize tomorrow, watch market reaction the day after.",
      ending: "Projects that survive will naturally grow. Those that don't, go to zero.",
      slogan: "<strong>Everything grows from the wild. WAGMI or NGMI.</strong>",
    },
    risk: {
      title: "9. Risk Disclosure ⚠️",
      content: [
        "WAGMI is a <strong>social experiment</strong>.",
        "Social experiment means: <strong class='text-red-400'>It could succeed, or it could fail.</strong>",
      ],
    },
    conclusion: {
      title: "10. Conclusion",
      content: [
        "WAGMI is not a greenhouse, it's a battlefield.",
        "We believe: one person + AI + a crazy idea can make money.",
        "We believe: in the power of memes, the market, and wild growth.",
        "We don't wait for you to apply, we find you proactively, tokenize your idea, then ask:",
      ],
      question: "\"Want to play together?\"",
      ending: "Can we make it? Don't know. But at least, we tried.",
      final: "<strong>We're All Gonna Make It — Grow from the Wild. 🚀</strong>",
    },
  },
  footer: "WAGMI Hatchery © 2026",
};

export default function WhitepaperPage() {
  const { locale } = useI18n();
  const content = locale === "en" ? contentEn : contentZh;
  const s = content.sections;

  return (
    <PageWrapper>
    <main className="min-h-screen bg-[#0a0a0a]">

      {/* Content */}
      <article className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#FF8C00] to-[#FFD54F] bg-clip-text text-transparent">{content.title}</span>
              <br />
              {content.subtitle}
            </h1>
            <p className="text-xl text-[#00E5FF]">{content.tagline}</p>
          </header>

          {/* TOC */}
          <nav className="mb-16 p-6 bg-white/5 border border-white/10 rounded-2xl">
            <h2 className="text-lg font-bold mb-4 text-[#FF8C00]">{content.tocTitle}</h2>
            <div className="grid md:grid-cols-2 gap-2 text-gray-400">
              {content.toc.map((item) => (
                <Link key={item.id} href={`#${item.id}`} className="hover:text-white transition">{item.text}</Link>
              ))}
            </div>
          </nav>

          {/* Sections */}
          <div className="prose prose-invert prose-lg max-w-none">
            
            {/* 1. Summary */}
            <section id="summary" className="mb-16">
              <h2 className="text-3xl font-bold mb-6 text-[#FF8C00]">{s.summary.title}</h2>
              {s.summary.content.map((text, i) => (
                <p key={i} className="text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: text.replace(/<strong>/g, '<strong class="text-white">') }} />
              ))}
              <div className="my-6">
                <p className="text-gray-300 font-semibold mb-3">WAGMI 做的事：</p>
                <ul className="text-gray-300 space-y-2">
                  {s.summary.features.map((feature, i) => (
                    <li key={i}>• {feature}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-[#FF8C00]/10 border border-[#FF8C00]/30 rounded-xl mt-6">
                <p className="text-xl font-bold text-center text-[#FF8C00] m-0">
                  {s.summary.highlight}
                </p>
              </div>
            </section>

            {/* 2. Problems */}
            <section id="problems" className="mb-16">
              <h2 className="text-3xl font-bold mb-6 text-[#FF8C00]">{s.problems.title}</h2>
              <p className="text-gray-300 mb-4">{s.problems.intro}</p>
              <ul className="text-gray-300 space-y-2 mb-6 pl-6">
                {s.problems.examples.map((example, i) => (
                  <li key={i} className="italic">• {example}</li>
                ))}
              </ul>
              <p className="text-gray-300 font-semibold mb-4">{s.problems.why}</p>
              <ul className="text-gray-300 space-y-2 mb-6 pl-6">
                {s.problems.reasons.map((reason, i) => (
                  <li key={i}>• {reason}</li>
                ))}
              </ul>
              <p className="text-gray-300 mb-4">{s.problems.conclusion}</p>
              <p className="text-[#00E5FF]" dangerouslySetInnerHTML={{ __html: s.problems.answer }} />
            </section>

            {/* 3. Solution */}
            <section id="solution" className="mb-16">
              <h2 className="text-3xl font-bold mb-6 text-[#FF8C00]">{s.solution.title}</h2>
              <div className="p-4 bg-[#00E5FF]/10 border border-[#00E5FF]/30 rounded-xl mb-6">
                <p className="text-xl font-bold text-center text-[#00E5FF] m-0">{s.solution.highlight}</p>
              </div>
              <div className="space-y-6">
                {s.solution.features.map((f, i) => (
                  <div key={i} className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-xl font-bold mb-2">{f.icon} {f.title}</h3>
                    <p className="text-gray-400 m-0" dangerouslySetInnerHTML={{ __html: f.desc.replace(/<strong>/g, '<strong class="text-white">') }} />
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Business Model */}
            <section id="business" className="mb-16">
              <h2 className="text-3xl font-bold mb-6 text-[#FF8C00]">{s.business.title}</h2>
              <p className="text-gray-300 mb-6" dangerouslySetInnerHTML={{ __html: s.business.intro.replace(/<strong>/g, '<strong class="text-white">') }} />
              <div className="p-6 bg-white/5 rounded-xl border border-white/10 mb-6">
                <h3 className="text-xl font-bold mb-4 text-[#00E5FF]">{locale === 'zh' ? '收入来源' : 'Revenue Sources'}</h3>
                <ul className="text-gray-300 space-y-2">
                  {s.business.sources.map((source, i) => (
                    <li key={i}>• {source}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-6">
                <div className="p-6 bg-[#00E5FF]/10 border border-[#00E5FF]/30 rounded-xl">
                  <h3 className="text-xl font-bold mb-4 text-[#00E5FF]">{s.business.projectShare.title}</h3>
                  <ul className="text-gray-300 space-y-2 mb-4">
                    {s.business.projectShare.items.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-gray-400 italic m-0">{s.business.projectShare.note}</p>
                </div>
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="text-xl font-bold mb-4">{s.business.afterSuccess.title}</h3>
                  <ul className="text-gray-300 space-y-2">
                    {s.business.afterSuccess.items.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="text-xl font-bold mb-2">{s.business.afterFailure.title}</h3>
                  <p className="text-gray-400 m-0">{s.business.afterFailure.text}</p>
                </div>
              </div>
            </section>

            {/* 5. Platform Fund */}
            <section id="fund" className="mb-16">
              <h2 className="text-3xl font-bold mb-6 text-[#FF8C00]">{s.fund.title}</h2>
              <p className="text-gray-300 mb-4">{s.fund.intro}</p>
              <ul className="text-gray-300 space-y-2 pl-6">
                {s.fund.uses.map((use, i) => (
                  <li key={i}>• {use}</li>
                ))}
              </ul>
            </section>

            {/* 6. Process */}
            <section id="process" className="mb-16">
              <h2 className="text-3xl font-bold mb-6 text-[#FF8C00]">{s.process.title}</h2>
              <div className="space-y-4">
                {s.process.steps.map((item) => (
                  <div key={item.step} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="w-10 h-10 bg-[#FF8C00] text-black font-bold rounded-full flex items-center justify-center shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">{item.title}</h3>
                      <p className="text-gray-400 text-sm m-0">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 7. Network */}
            <section id="network" className="mb-16">
              <h2 className="text-3xl font-bold mb-6 text-[#FF8C00]">{s.network.title}</h2>
              <p className="text-gray-300 mb-6" dangerouslySetInnerHTML={{ __html: s.network.intro }} />
              <div className="grid md:grid-cols-2 gap-4">
                {s.network.supports.map((item, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-2xl">{item.icon}</span>
                    <h3 className="font-bold mt-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm m-0">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 8. Roadmap */}
            <section id="roadmap" className="mb-16">
              <h2 className="text-3xl font-bold mb-6 text-[#FF8C00]">{s.roadmap.title}</h2>
              <div className="p-6 bg-white/5 rounded-xl border border-white/10 text-center">
                <p className="text-2xl font-bold mb-4">{s.roadmap.mainText}</p>
                <p className="text-gray-400 mb-4">{s.roadmap.desc}</p>
                <p className="text-gray-400 mb-4">{s.roadmap.ending}</p>
                <p className="text-xl text-[#FF8C00] mt-4" dangerouslySetInnerHTML={{ __html: s.roadmap.slogan }} />
              </div>
            </section>

            {/* 9. Risk */}
            <section id="risk" className="mb-16">
              <h2 className="text-3xl font-bold mb-6 text-red-500">{s.risk.title}</h2>
              <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
                {s.risk.content.map((text, i) => (
                  <p key={i} className="text-gray-300" dangerouslySetInnerHTML={{ __html: text.replace(/<strong>/g, '<strong class="text-white">') }} />
                ))}
              </div>
            </section>

            {/* 10. Conclusion */}
            <section id="conclusion" className="mb-16">
              <h2 className="text-3xl font-bold mb-6 text-[#FF8C00]">{s.conclusion.title}</h2>
              {s.conclusion.content.map((text, i) => (
                <p key={i} className="text-gray-300">{text}</p>
              ))}
              <p className="text-2xl font-bold text-center text-[#00E5FF] my-6">{s.conclusion.question}</p>
              <p className="text-gray-300 text-center">{s.conclusion.ending}</p>
              <div className="p-6 bg-[#FF8C00]/10 border border-[#FF8C00]/30 rounded-xl mt-6">
                <p className="text-2xl font-bold text-center text-[#FF8C00] m-0" dangerouslySetInnerHTML={{ __html: s.conclusion.final }} />
              </div>
            </section>

          </div>
        </div>
      </article>
    </main>
    </PageWrapper>
  );
}
