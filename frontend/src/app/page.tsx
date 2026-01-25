"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

// ==================== HERO SECTION ====================
function HeroSection() {
  const { t } = useI18n();
  
  return (
    <section className="min-h-screen flex items-center justify-center pt-20 relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF8C00]/20 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#00E5FF]/10 rounded-full blur-[100px]" />
      
      <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col lg:flex-row items-center gap-12 relative z-10">
        {/* Left: Text Content */}
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-block px-4 py-2 bg-[#FF8C00]/10 border border-[#FF8C00]/30 rounded-full text-[#FF8C00] text-sm mb-6">
            {t("hero.badge")}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            <span className="gradient-text">{t("hero.title1")}</span>
            <br />
            <span className="text-white">{t("hero.title2")}</span>
            <br />
            <span className="text-white">{t("hero.title3")}</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-xl">
            {t("hero.subtitle")}
            <br />
            <span className="text-[#00E5FF]">{t("hero.slogan")}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link href="/idea-evaluator" className="px-8 py-4 bg-[#FF8C00] text-black font-bold rounded-full text-lg hover:bg-[#FFAD33] transition animate-pulse-glow text-center">
              {t("hero.cta1")}
            </Link>
            <Link href="/whitepaper" className="px-8 py-4 border border-white/20 text-white rounded-full text-lg hover:bg-white/5 transition text-center">
              {t("hero.cta2")}
            </Link>
          </div>
        </div>
        
        {/* Right: Waggy Mascot */}
        <div className="flex-1 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-[#FF8C00]/30 rounded-full blur-[80px] scale-75 animate-pulse" />
            <Image 
              src="/waggy.png" 
              alt="Waggy - WAGMI Mascot" 
              width={300} 
              height={300}
              className="relative z-10 drop-shadow-2xl animate-float"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== PAIN POINTS SECTION ====================
function PainPointsSection() {
  const { t } = useI18n();
  
  const painPoints = [
    {
      icon: t("pain.highBarrier.icon"),
      title: t("pain.highBarrier.title"),
      problem: t("pain.highBarrier.problem"),
      solution: t("pain.highBarrier.solution")
    },
    {
      icon: t("pain.meme.icon"),
      title: t("pain.meme.title"),
      problem: t("pain.meme.problem"),
      solution: t("pain.meme.solution")
    },
    {
      icon: t("pain.opaque.icon"),
      title: t("pain.opaque.title"),
      problem: t("pain.opaque.problem"),
      solution: t("pain.opaque.solution")
    },
    {
      icon: t("pain.slow.icon"),
      title: t("pain.slow.title"),
      problem: t("pain.slow.problem"),
      solution: t("pain.slow.solution")
    }
  ];

  return (
    <section id="pain-points" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{t("pain.sectionTitle")}</span>
          </h2>
          <p className="text-xl text-gray-400">{t("pain.sectionSubtitle")}</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {painPoints.map((item, index) => (
            <div 
              key={index}
              className="p-8 bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-2xl hover:border-[#FF8C00]/50 transition group"
            >
              <div className="text-5xl mb-4">{item.icon}</div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-[#FF8C00] transition">{item.title}</h3>
              <p className="text-red-400/80 mb-4 line-through decoration-red-400/50">{item.problem}</p>
              <p className="text-[#00E5FF]">✓ {item.solution}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== FEATURES SECTION ====================
function FeaturesSection() {
  const { t } = useI18n();
  
  const features = [
    {
      icon: t("features.ai.icon"),
      title: t("features.ai.title"),
      description: t("features.ai.desc")
    },
    {
      icon: t("features.fairLaunch.icon"),
      title: t("features.fairLaunch.title"),
      description: t("features.fairLaunch.desc")
    },
    {
      icon: t("features.vesting.icon"),
      title: t("features.vesting.title"),
      description: t("features.vesting.desc")
    },
    {
      icon: t("features.dao.icon"),
      title: t("features.dao.title"),
      description: t("features.dao.desc")
    },
    {
      icon: t("features.mentor.icon"),
      title: t("features.mentor.title"),
      description: t("features.mentor.desc")
    },
    {
      icon: t("features.meme.icon"),
      title: t("features.meme.title"),
      description: t("features.meme.desc")
    }
  ];

  return (
    <section id="features" className="py-24 bg-gradient-to-b from-transparent via-[#FF8C00]/5 to-transparent">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t("features.sectionTitle")} <span className="gradient-text">{t("features.sectionTitleHighlight")}</span>？
          </h2>
          <p className="text-xl text-gray-400">{t("features.sectionSubtitle")}</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-6 bg-black/50 border border-white/10 rounded-xl hover:border-[#00E5FF]/50 hover:bg-[#00E5FF]/5 transition group"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-[#00E5FF] transition">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== TOKENOMICS SECTION ====================
function TokenomicsSection() {
  const { t } = useI18n();
  
  const distribution = [
    { label: t("token.community"), percentage: 40, color: "#FF8C00" },
    { label: t("token.ecosystem"), percentage: 25, color: "#FFAD33" },
    { label: t("token.team"), percentage: 15, color: "#FFD54F" },
    { label: t("token.liquidity"), percentage: 10, color: "#00E5FF" },
    { label: t("token.reserve"), percentage: 10, color: "#4DD0D0" },
  ];

  return (
    <section id="tokenomics" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{t("token.sectionTitle")}</span> {t("token.sectionTitleSuffix")}
          </h2>
          <p className="text-xl text-gray-400">{t("token.sectionSubtitle")}</p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Distribution Chart (Simplified) */}
          <div className="space-y-4">
            {distribution.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{item.label}</span>
                  <span className="font-bold" style={{ color: item.color }}>{item.percentage}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* Right: Key Info */}
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-r from-[#FF8C00]/10 to-transparent border border-[#FF8C00]/30 rounded-xl">
              <h3 className="text-2xl font-bold mb-2">{t("token.functionsTitle")}</h3>
              <ul className="text-gray-400 space-y-2">
                <li>• {t("token.function1")}</li>
                <li>• {t("token.function2")}</li>
                <li>• {t("token.function3")}</li>
                <li>• {t("token.function4")}</li>
              </ul>
            </div>
            <div className="p-6 bg-gradient-to-r from-[#00E5FF]/10 to-transparent border border-[#00E5FF]/30 rounded-xl">
              <h3 className="text-2xl font-bold mb-2">{t("token.revenueTitle")}</h3>
              <ul className="text-gray-400 space-y-2">
                <li>• {t("token.revenue1")}</li>
                <li>• {t("token.revenue2")}</li>
                <li>• {t("token.revenue3")}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== ROADMAP SECTION ====================
function RoadmapSection() {
  const { t } = useI18n();
  
  const milestones = [
    { phase: t("roadmap.q1.phase"), title: t("roadmap.q1.title"), items: [t("roadmap.q1.item1"), t("roadmap.q1.item2"), t("roadmap.q1.item3"), t("roadmap.q1.item4")] },
    { phase: t("roadmap.q2.phase"), title: t("roadmap.q2.title"), items: [t("roadmap.q2.item1"), t("roadmap.q2.item2"), t("roadmap.q2.item3"), t("roadmap.q2.item4")] },
    { phase: t("roadmap.q3.phase"), title: t("roadmap.q3.title"), items: [t("roadmap.q3.item1"), t("roadmap.q3.item2"), t("roadmap.q3.item3"), t("roadmap.q3.item4")] },
    { phase: t("roadmap.q4.phase"), title: t("roadmap.q4.title"), items: [t("roadmap.q4.item1"), t("roadmap.q4.item2"), t("roadmap.q4.item3"), t("roadmap.q4.item4")] },
  ];

  return (
    <section id="roadmap" className="py-24 bg-gradient-to-b from-transparent via-white/5 to-transparent">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{t("roadmap.sectionTitle")}</span>
          </h2>
          <p className="text-xl text-gray-400">{t("roadmap.sectionSubtitle")}</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {milestones.map((milestone, index) => (
            <div 
              key={index}
              className="relative p-6 bg-black/50 border border-white/10 rounded-xl hover:border-[#FF8C00]/50 transition"
            >
              <div className="absolute -top-3 left-6 px-3 py-1 bg-[#FF8C00] text-black text-sm font-bold rounded-full">
                {milestone.phase}
              </div>
              <h3 className="text-xl font-bold mt-4 mb-4">{milestone.title}</h3>
              <ul className="space-y-2">
                {milestone.items.map((item, i) => (
                  <li key={i} className="text-gray-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#00E5FF] rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== CTA SECTION ====================
function CTASection() {
  const { t } = useI18n();
  
  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="p-12 bg-gradient-to-br from-[#FF8C00]/20 to-[#00E5FF]/10 border border-[#FF8C00]/30 rounded-3xl glow-orange">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t("cta.title1")}
            <br />
            <span className="gradient-text">{t("cta.title2")}</span>{t("cta.title3")}
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            {t("cta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://t.me/wagmiac" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-8 py-4 bg-[#FF8C00] text-black font-bold rounded-full text-lg hover:bg-[#FFAD33] transition"
            >
              {t("cta.community")}
            </a>
            <a 
              href="https://x.com/wagmiac" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-8 py-4 border border-white/20 text-white rounded-full text-lg hover:bg-white/5 transition"
            >
              {t("cta.twitter")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== MAIN PAGE ====================
export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Navigation />
      <HeroSection />
      <PainPointsSection />
      <FeaturesSection />
      <RoadmapSection />
      <CTASection />
      <Footer />
    </main>
  );
}
