"use client";

import { useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";

interface Project {
  id: string;
  name: string;
  nameEn: string;
  tagline: string;
  taglineEn: string;
  description: string;
  descriptionEn: string;
  founder: string;
  avatar: string;
  category: string;
  categoryEn: string;
  stage: "idea" | "mvp" | "launched" | "growing";
  raised: string;
  supporters: number;
  tags: string[];
  tagsEn: string[];
  metrics?: {
    mrr?: string;
    users?: string;
    growth?: string;
  };
  links: {
    website?: string;
    twitter?: string;
  };
}

const projects: Project[] = [
  {
    id: "1",
    name: "AIScript",
    nameEn: "AIScript",
    tagline: "AI 帮你写视频脚本，10分钟出稿",
    taglineEn: "AI writes video scripts for you, 10 mins to draft",
    description: "面向自媒体创作者的 AI 视频脚本生成工具。输入主题和风格，AI 自动生成完整脚本，支持多种平台格式。",
    descriptionEn: "AI video script generation tool for content creators. Input topic and style, AI generates complete scripts, supporting multiple platform formats.",
    founder: "Alex Chen",
    avatar: "🧑‍💻",
    category: "AI 工具",
    categoryEn: "AI Tools",
    stage: "launched",
    raised: "$12,500",
    supporters: 234,
    tags: ["内容创作", "AI", "自媒体"],
    tagsEn: ["Content Creation", "AI", "Social Media"],
    metrics: {
      mrr: "$2,800",
      users: "1,200+",
      growth: "+45%"
    },
    links: {
      website: "#",
      twitter: "#"
    }
  },
  {
    id: "2",
    name: "SoloStack",
    nameEn: "SoloStack",
    tagline: "超级个体的一站式技术栈",
    taglineEn: "One-stop tech stack for solopreneurs",
    description: "为超级个体打造的全栈开发模板。集成认证、支付、数据库、部署，一键启动你的 SaaS。",
    descriptionEn: "Full-stack development template for solopreneurs. Integrated auth, payment, database, deployment, one-click to launch your SaaS.",
    founder: "Sarah Liu",
    avatar: "👩‍🔬",
    category: "开发工具",
    categoryEn: "Dev Tools",
    stage: "growing",
    raised: "$28,000",
    supporters: 456,
    tags: ["SaaS", "开发工具", "模板"],
    tagsEn: ["SaaS", "Dev Tools", "Template"],
    metrics: {
      mrr: "$8,500",
      users: "3,400+",
      growth: "+62%"
    },
    links: {
      website: "#",
      twitter: "#"
    }
  },
  {
    id: "3",
    name: "MemeForge",
    nameEn: "MemeForge",
    tagline: "AI 生成 Meme 图，病毒传播神器",
    taglineEn: "AI generates memes, viral marketing weapon",
    description: "输入文字描述，AI 自动生成高质量 Meme 图。支持各种热门模板，让你的内容病毒式传播。",
    descriptionEn: "Input text description, AI generates high-quality memes. Supports various popular templates, make your content go viral.",
    founder: "Mike Wang",
    avatar: "🎨",
    category: "营销工具",
    categoryEn: "Marketing Tools",
    stage: "mvp",
    raised: "$5,200",
    supporters: 128,
    tags: ["Meme", "营销", "AI"],
    tagsEn: ["Meme", "Marketing", "AI"],
    links: {
      twitter: "#"
    }
  },
  {
    id: "4",
    name: "InboxZero AI",
    nameEn: "InboxZero AI",
    tagline: "AI 帮你管理邮箱，永远收件箱清零",
    taglineEn: "AI manages your inbox, always inbox zero",
    description: "智能邮件分类、自动回复建议、重要邮件提醒。让你从邮件地狱中解放出来。",
    descriptionEn: "Smart email classification, auto-reply suggestions, important email alerts. Free yourself from email hell.",
    founder: "Jenny Zhang",
    avatar: "📧",
    category: "效率工具",
    categoryEn: "Productivity Tools",
    stage: "idea",
    raised: "$1,800",
    supporters: 67,
    tags: ["效率", "AI", "邮箱"],
    tagsEn: ["Productivity", "AI", "Email"],
    links: {}
  },
  {
    id: "5",
    name: "CodeReview.ai",
    nameEn: "CodeReview.ai",
    tagline: "AI 代码审查，发现隐藏 Bug",
    taglineEn: "AI code review, find hidden bugs",
    description: "上传代码或连接 GitHub，AI 自动进行代码审查，发现潜在问题，提供改进建议。",
    descriptionEn: "Upload code or connect GitHub, AI performs code review automatically, finds potential issues, provides improvement suggestions.",
    founder: "David Lee",
    avatar: "🔍",
    category: "开发工具",
    categoryEn: "Dev Tools",
    stage: "launched",
    raised: "$18,000",
    supporters: 312,
    tags: ["代码", "AI", "开发"],
    tagsEn: ["Code", "AI", "Development"],
    metrics: {
      mrr: "$4,200",
      users: "890+",
      growth: "+38%"
    },
    links: {
      website: "#",
      twitter: "#"
    }
  },
  {
    id: "6",
    name: "PitchPerfect",
    nameEn: "PitchPerfect",
    tagline: "AI 帮你准备投资人问答",
    taglineEn: "AI helps you prepare investor Q&A",
    description: "上传你的商业计划书，AI 模拟投资人提问，帮你准备各种刁钻问题的回答。",
    descriptionEn: "Upload your business plan, AI simulates investor questions, helps you prepare answers for tricky questions.",
    founder: "Emma Wu",
    avatar: "🎤",
    category: "创业工具",
    categoryEn: "Startup Tools",
    stage: "mvp",
    raised: "$7,500",
    supporters: 189,
    tags: ["融资", "AI", "创业"],
    tagsEn: ["Fundraising", "AI", "Startup"],
    links: {
      website: "#"
    }
  }
];

const categoriesZh = ["全部", "AI 工具", "开发工具", "效率工具", "营销工具", "创业工具"];
const categoriesEn = ["All", "AI Tools", "Dev Tools", "Productivity Tools", "Marketing Tools", "Startup Tools"];

const stagesZh = [
  { key: "all", label: "全部阶段" },
  { key: "idea", label: "💡 Idea" },
  { key: "mvp", label: "🔧 MVP" },
  { key: "launched", label: "🚀 已上线" },
  { key: "growing", label: "📈 增长中" }
];

const stagesEn = [
  { key: "all", label: "All Stages" },
  { key: "idea", label: "💡 Idea" },
  { key: "mvp", label: "🔧 MVP" },
  { key: "launched", label: "🚀 Launched" },
  { key: "growing", label: "📈 Growing" }
];

const stageConfigZh = {
  idea: { label: "💡 Idea", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  mvp: { label: "🔧 MVP", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  launched: { label: "🚀 已上线", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  growing: { label: "📈 增长中", color: "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/30" }
};

const stageConfigEn = {
  idea: { label: "💡 Idea", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  mvp: { label: "🔧 MVP", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  launched: { label: "🚀 Launched", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  growing: { label: "📈 Growing", color: "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/30" }
};

export default function ProjectsPage() {
  const { t, locale } = useI18n();
  const categories = locale === "zh" ? categoriesZh : categoriesEn;
  const stages = locale === "zh" ? stagesZh : stagesEn;
  const stageConfig = locale === "zh" ? stageConfigZh : stageConfigEn;
  
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [selectedStage, setSelectedStage] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = projects.filter(project => {
    const projectCategory = locale === "zh" ? project.category : project.categoryEn;
    const matchCategory = selectedCategory === categories[0] || projectCategory === selectedCategory;
    const matchStage = selectedStage === "all" || project.stage === selectedStage;
    const projectName = locale === "zh" ? project.name : project.nameEn;
    const projectTagline = locale === "zh" ? project.tagline : project.taglineEn;
    const projectTags = locale === "zh" ? project.tags : project.tagsEn;
    const matchSearch = projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       projectTagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       projectTags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchStage && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            <span className="gradient-text">WAGMI</span> {locale === "zh" ? "孵化项目" : "Incubated Projects"}
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {locale === "zh" 
              ? "这些超级个体正在用 AI 改变世界。支持他们，成为早期投资者。"
              : "These solopreneurs are changing the world with AI. Support them, become an early investor."}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder={locale === "zh" ? "搜索项目..." : "Search projects..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 transition"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm transition ${
                  selectedCategory === category
                    ? "bg-[#FF8C00] text-black font-semibold"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Stage Filter */}
          <div className="flex flex-wrap gap-2">
            {stages.map(stage => (
              <button
                key={stage.key}
                onClick={() => setSelectedStage(stage.key)}
                className={`px-3 py-1.5 rounded-lg text-xs transition ${
                  selectedStage === stage.key
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-gray-500 hover:bg-white/10"
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">{t("projects.noProjects")}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map(project => (
                <div
                  key={project.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#FF8C00]/50 transition group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#FF8C00]/20 to-[#FFD700]/20 rounded-xl flex items-center justify-center text-2xl">
                        {project.avatar}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-[#FF8C00] transition">
                          {locale === "zh" ? project.name : project.nameEn}
                        </h3>
                        <p className="text-xs text-gray-500">{project.founder}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs border ${stageConfig[project.stage].color}`}>
                      {stageConfig[project.stage].label}
                    </span>
                  </div>

                  {/* Tagline */}
                  <p className="text-[#00E5FF] text-sm mb-3">{locale === "zh" ? project.tagline : project.taglineEn}</p>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{locale === "zh" ? project.description : project.descriptionEn}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(locale === "zh" ? project.tags : project.tagsEn).map(tag => (
                      <span key={tag} className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Metrics (if available) */}
                  {project.metrics && (
                    <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-black/30 rounded-lg">
                      {project.metrics.mrr && (
                        <div className="text-center">
                          <p className="text-[#FFD700] font-bold text-sm">{project.metrics.mrr}</p>
                          <p className="text-gray-500 text-xs">MRR</p>
                        </div>
                      )}
                      {project.metrics.users && (
                        <div className="text-center">
                          <p className="text-white font-bold text-sm">{project.metrics.users}</p>
                          <p className="text-gray-500 text-xs">{locale === "zh" ? "用户" : "Users"}</p>
                        </div>
                      )}
                      {project.metrics.growth && (
                        <div className="text-center">
                          <p className="text-green-400 font-bold text-sm">{project.metrics.growth}</p>
                          <p className="text-gray-500 text-xs">{locale === "zh" ? "月增长" : "Growth"}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[#FF8C00] font-bold">{project.raised}</p>
                        <p className="text-gray-500 text-xs">{t("projects.raised")}</p>
                      </div>
                      <div>
                        <p className="text-white font-bold">{project.supporters}</p>
                        <p className="text-gray-500 text-xs">{t("projects.participants")}</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-[#FF8C00]/10 border border-[#FF8C00]/30 text-[#FF8C00] rounded-lg text-sm hover:bg-[#FF8C00]/20 transition">
                      {locale === "zh" ? "支持" : "Support"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-[#FF8C00]/10 to-[#00E5FF]/10 border border-white/10 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {locale === "zh" 
              ? "你也有一个改变世界的 Idea？"
              : "Got an idea to change the world?"}
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            {locale === "zh"
              ? "WAGMI 正在寻找下一个超级个体。提交你的 idea，获得社区支持和天使投资。"
              : "WAGMI is looking for the next solopreneur. Submit your idea, get community support and angel investment."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/idea-evaluator"
              className="px-8 py-4 bg-[#FF8C00] text-black font-bold rounded-full hover:bg-[#FFAD33] transition"
            >
              {locale === "zh" ? "🎯 先测测你的 Idea" : "🎯 Test Your Idea First"}
            </Link>
            <Link
              href="/ai-mentor"
              className="px-8 py-4 border border-white/20 text-white rounded-full hover:bg-white/5 transition"
            >
              {locale === "zh" ? "🧙‍♂️ 找 AI 导师聊聊" : "🧙‍♂️ Chat with AI Mentor"}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
