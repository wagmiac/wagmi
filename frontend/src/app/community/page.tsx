"use client";

import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";

// 合作伙伴/生态
const partners = [
  { name: "Solana", logo: "◎", category: "Chain" },
  { name: "BSC", logo: "🔶", category: "Chain" },
  { name: "Pump.fun", logo: "🎈", category: "Launchpad" },
  { name: "Four.meme", logo: "4️⃣", category: "Launchpad" },
  { name: "Jupiter", logo: "🪐", category: "DEX" },
  { name: "PancakeSwap", logo: "🥞", category: "DEX" },
  { name: "Phantom", logo: "👻", category: "Wallet" },
  { name: "MetaMask", logo: "🦊", category: "Wallet" },
];

// 社区贡献者榜单
const contributors = [
  { name: "anon_builder", points: 12500, badge: "🥇" },
  { name: "wagmi_fan_01", points: 9800, badge: "🥈" },
  { name: "solo_coder", points: 8600, badge: "🥉" },
  { name: "crypto_artist", points: 7200, badge: "⭐" },
  { name: "defi_whale", points: 6500, badge: "⭐" },
];

export default function CommunityPage() {
  const { t, locale } = useI18n();

  // 社区统计数据
  const stats = [
    { label: t("community.members"), value: "12,500+", icon: "👥" },
    { label: t("community.projects"), value: "28", icon: "🚀" },
    { label: t("community.raised"), value: "$850K+", icon: "💰" },
    { label: t("community.successfulExits"), value: "6", icon: "🏆" },
  ];

  // 社区大使
  const ambassadors = [
    {
      name: "CryptoYoda",
      avatar: "🧙",
      role: t("community.ambassadorRoles.communityLeader"),
      twitter: "@crypto_yoda",
      contribution: t("community.ambassadorContributions.events"),
    },
    {
      name: "DeFi_Degen",
      avatar: "🦍",
      role: t("community.ambassadorRoles.contentCreator"),
      twitter: "@defi_degen",
      contribution: t("community.ambassadorContributions.tutorials"),
    },
    {
      name: "Web3_Luna",
      avatar: "🌙",
      role: t("community.ambassadorRoles.devAmbassador"),
      twitter: "@web3_luna",
      contribution: t("community.ambassadorContributions.aiEvaluator"),
    },
    {
      name: "Meme_Master",
      avatar: "🎭",
      role: t("community.ambassadorRoles.memeOfficer"),
      twitter: "@meme_master",
      contribution: t("community.ambassadorContributions.memes"),
    },
  ];

  // 社区活动
  const events = [
    {
      title: t("community.eventTitles.weeklyAma"),
      time: locale === "zh" ? "每周四 20:00 UTC+8" : "Every Thursday 20:00 UTC+8",
      platform: "Discord",
      description: t("community.eventDescriptions.weeklyAma"),
      status: "recurring" as const,
    },
    {
      title: t("community.eventTitles.hackathon"),
      time: locale === "zh" ? "2026年2月15-16日" : "Feb 15-16, 2026",
      platform: locale === "zh" ? "线上" : "Online",
      description: t("community.eventDescriptions.hackathon"),
      status: "upcoming" as const,
    },
    {
      title: t("community.eventTitles.aiTools"),
      time: locale === "zh" ? "2026年1月28日" : "Jan 28, 2026",
      platform: "Twitter Space",
      description: t("community.eventDescriptions.aiTools"),
      status: "upcoming" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-[#FF8C00] to-[#FFD54F] bg-clip-text text-transparent">WAGMI</span> {t("community.title")}
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
            {t("community.subtitle")}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center"
              >
                <span className="text-3xl mb-2 block">{stat.icon}</span>
                <p className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-gray-500 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            {t("community.ecosystemPartners")}
          </h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {partners.map((partner, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition group"
              >
                <span className="text-3xl mb-2 block group-hover:scale-110 transition">{partner.logo}</span>
                <p className="text-white text-sm font-medium">{partner.name}</p>
                <p className="text-gray-500 text-xs">{partner.category}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ambassadors */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            {t("community.ambassadors")}
          </h2>
          <p className="text-gray-400 text-center mb-8">
            {t("community.ambassadorsSubtitle")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ambassadors.map((ambassador, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#FF8C00]/50 transition"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#FF8C00]/20 to-[#FFD700]/20 rounded-full flex items-center justify-center text-3xl">
                    {ambassador.avatar}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{ambassador.name}</h3>
                    <p className="text-[#FF8C00] text-sm">{ambassador.role}</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-3">{ambassador.contribution}</p>
                <a
                  href={`https://x.com/${ambassador.twitter.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00E5FF] text-sm hover:underline"
                >
                  {ambassador.twitter}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="py-16 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            {t("community.events")}
          </h2>
          <p className="text-gray-400 text-center mb-8">
            {t("community.eventsSubtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {events.map((event, index) => (
              <div
                key={index}
                className="bg-black/50 border border-white/10 rounded-2xl p-6 hover:border-[#00E5FF]/50 transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    event.status === "recurring"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-[#00E5FF]/20 text-[#00E5FF]"
                  }`}>
                    {event.status === "recurring" ? t("community.eventRecurring") : t("community.eventUpcoming")}
                  </span>
                  <span className="text-gray-500 text-sm">{event.platform}</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{event.title}</h3>
                <p className="text-[#FF8C00] text-sm mb-2">{event.time}</p>
                <p className="text-gray-400 text-sm">{event.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            {t("community.topContributors")}
          </h2>
          <p className="text-gray-400 text-center mb-8">
            {t("community.leaderboardSubtitle")}
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {contributors.map((contributor, index) => (
              <div
                key={index}
                className={`flex items-center justify-between px-6 py-4 ${
                  index !== contributors.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl w-8">{contributor.badge}</span>
                  <span className="text-white font-medium">{contributor.name}</span>
                </div>
                <span className="text-[#FFD700] font-bold">{contributor.points.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
          <p className="text-center mt-4">
            <Link href="#" className="text-[#FF8C00] hover:underline text-sm">
              {t("community.viewFullLeaderboard")} →
            </Link>
          </p>
        </div>
      </section>

      {/* Join CTA */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-[#FF8C00]/10 to-[#00E5FF]/10 border border-white/10 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t("community.joinTitle")}
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            {t("community.joinSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://discord.gg/wagmiac"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-[#5865F2] text-white font-bold rounded-full hover:bg-[#4752C4] transition flex items-center justify-center gap-2"
            >
              <span>💬</span> {t("community.joinDiscord")}
            </a>
            <a
              href="https://x.com/wagmiac"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-black border border-white/20 text-white font-bold rounded-full hover:bg-white/5 transition flex items-center justify-center gap-2"
            >
              <span>𝕏</span> {t("community.followTwitter")}
            </a>
            <a
              href="https://t.me/wagmiac"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-[#0088cc] text-white font-bold rounded-full hover:bg-[#0077b5] transition flex items-center justify-center gap-2"
            >
              <span>✈️</span> {t("community.joinTelegram")}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
