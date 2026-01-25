"use client";

import { useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { useI18n } from "@/lib/i18n";

interface FormData {
  // 基本信息
  founderName: string;
  email: string;
  twitter: string;
  telegram: string;
  
  // 项目信息
  projectName: string;
  tagline: string;
  description: string;
  category: string;
  
  // 产品阶段
  stage: string;
  hasProduct: boolean;
  productUrl: string;
  
  // 商业模式
  targetUsers: string;
  monetization: string;
  competition: string;
  
  // 融资需求
  fundingNeeded: string;
  fundingUse: string;
  
  // 附加
  pitchDeck: string;
  demoVideo: string;
  additionalInfo: string;
  
  // 协议
  agreeTerms: boolean;
}

const getCategories = (t: (key: string) => string) => [
  t("apply.categoryAI"),
  t("apply.categoryDev"),
  t("apply.categoryEfficiency"),
  t("apply.categoryMarketing"),
  t("apply.categoryContent"),
  t("apply.categoryData"),
  t("apply.categoryBlockchain"),
  t("apply.categoryOther")
];

const getStages = (t: (key: string) => string) => [
  { value: "idea", label: t("apply.stageIdea") },
  { value: "validation", label: t("apply.stageValidation") },
  { value: "mvp", label: t("apply.stageMvp") },
  { value: "launched", label: t("apply.stageLaunched") },
  { value: "growing", label: t("apply.stageGrowing") }
];

const getFundingOptions = (t: (key: string) => string) => [
  "$1,000 - $5,000",
  "$5,000 - $10,000",
  "$10,000 - $25,000",
  "$25,000 - $50,000",
  t("apply.fundingNoCash")
];

export default function ApplyPage() {
  const { t, locale } = useI18n();
  const categories = getCategories(t);
  const stages = getStages(t);
  const fundingOptions = getFundingOptions(t);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    founderName: "",
    email: "",
    twitter: "",
    telegram: "",
    projectName: "",
    tagline: "",
    description: "",
    category: "",
    stage: "",
    hasProduct: false,
    productUrl: "",
    targetUsers: "",
    monetization: "",
    competition: "",
    fundingNeeded: "",
    fundingUse: "",
    pitchDeck: "",
    demoVideo: "",
    additionalInfo: "",
    agreeTerms: false
  });

  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.founderName && formData.email;
      case 2:
        return formData.projectName && formData.tagline && formData.description && formData.category;
      case 3:
        return formData.stage && formData.targetUsers;
      case 4:
        return formData.fundingNeeded;
      case 5:
        return formData.agreeTerms;
      default:
        return true;
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-[#FF8C00] to-[#FFD700] rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">🎉</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">{t("apply.successTitle")}</h1>
          <p className="text-gray-400 mb-8">
            {t("apply.successDesc")}
            <br /><br />
            {t("apply.successNext")}
          </p>
          <div className="space-y-4">
            <Link
              href="/ai-mentor"
              className="block w-full px-6 py-4 bg-[#FF8C00] text-black font-bold rounded-xl hover:bg-[#FFAD33] transition"
            >
              {t("apply.talkToMentor")}
            </Link>
            <Link
              href="/projects"
              className="block w-full px-6 py-4 border border-white/20 text-white rounded-xl hover:bg-white/5 transition"
            >
              {t("apply.viewProjects")}
            </Link>
            <Link
              href="/"
              className="block text-gray-400 hover:text-white transition"
            >
              {t("apply.backToHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              {t("apply.title")} <span className="gradient-text">WAGMI</span> {t("apply.titleSuffix")}
            </h1>
            <p className="text-gray-400">
              {t("apply.subtitle")}
              <br />
              {t("apply.subtitleTime")}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4, 5].map(s => (
                <div
                  key={s}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition ${
                    s < step
                      ? "bg-[#FF8C00] text-black"
                      : s === step
                      ? "bg-[#FF8C00]/20 border-2 border-[#FF8C00] text-[#FF8C00]"
                      : "bg-white/5 text-gray-500"
                  }`}
                >
                  {s < step ? "✓" : s}
                </div>
              ))}
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFD700] transition-all duration-500"
                style={{ width: `${((step - 1) / 4) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>{t("apply.step1")}</span>
              <span>{t("apply.step2")}</span>
              <span>{t("apply.step3")}</span>
              <span>{t("apply.step4")}</span>
              <span>{t("apply.step5")}</span>
            </div>
          </div>

          {/* Form Steps */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white mb-6">👤 {t("apply.step1")}</h2>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.founderName")} *</label>
                  <input
                    type="text"
                    value={formData.founderName}
                    onChange={e => updateForm("founderName", e.target.value)}
                    placeholder={t("apply.founderNamePlaceholder")}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.email")} *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => updateForm("email", e.target.value)}
                    placeholder={t("apply.emailPlaceholder")}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.twitter")}</label>
                  <input
                    type="text"
                    value={formData.twitter}
                    onChange={e => updateForm("twitter", e.target.value)}
                    placeholder="@your_handle"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.telegram")}</label>
                  <input
                    type="text"
                    value={formData.telegram}
                    onChange={e => updateForm("telegram", e.target.value)}
                    placeholder="@your_username"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Project Info */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white mb-6">🚀 {t("apply.step2")}</h2>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.projectName")} *</label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={e => updateForm("projectName", e.target.value)}
                    placeholder={t("apply.projectNamePlaceholder")}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.tagline")} *</label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={e => updateForm("tagline", e.target.value)}
                    placeholder={t("apply.taglinePlaceholder")}
                    maxLength={50}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.tagline.length}/50</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.description")} *</label>
                  <textarea
                    value={formData.description}
                    onChange={e => updateForm("description", e.target.value)}
                    placeholder={t("apply.descriptionPlaceholder")}
                    rows={5}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.category")} *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => updateForm("category", cat)}
                        className={`px-4 py-2 rounded-lg text-sm transition ${
                          formData.category === cat
                            ? "bg-[#FF8C00] text-black font-semibold"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Product Stage */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white mb-6">📊 {t("apply.step3")}</h2>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.currentStage")} *</label>
                  <div className="space-y-2">
                    {stages.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => updateForm("stage", s.value)}
                        className={`w-full px-4 py-3 rounded-lg text-left transition ${
                          formData.stage === s.value
                            ? "bg-[#FF8C00]/20 border border-[#FF8C00] text-white"
                            : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasProduct}
                      onChange={e => updateForm("hasProduct", e.target.checked)}
                      className="w-5 h-5 rounded border-white/20 bg-black/50 text-[#FF8C00] focus:ring-[#FF8C00]"
                    />
                    <span className="text-gray-300">{t("apply.hasProduct")}</span>
                  </label>
                </div>

                {formData.hasProduct && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">{t("apply.productUrl")}</label>
                    <input
                      type="url"
                      value={formData.productUrl}
                      onChange={e => updateForm("productUrl", e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.targetUsers")} *</label>
                  <textarea
                    value={formData.targetUsers}
                    onChange={e => updateForm("targetUsers", e.target.value)}
                    placeholder={t("apply.targetUsersPlaceholder")}
                    rows={3}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.monetization")}</label>
                  <textarea
                    value={formData.monetization}
                    onChange={e => updateForm("monetization", e.target.value)}
                    placeholder={t("apply.monetizationPlaceholder")}
                    rows={2}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.competition")}</label>
                  <textarea
                    value={formData.competition}
                    onChange={e => updateForm("competition", e.target.value)}
                    placeholder={t("apply.competitionPlaceholder")}
                    rows={2}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Funding */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white mb-6">💰 {t("apply.step4")}</h2>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.fundingNeeded")} *</label>
                  <div className="space-y-2">
                    {fundingOptions.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateForm("fundingNeeded", option)}
                        className={`w-full px-4 py-3 rounded-lg text-left transition ${
                          formData.fundingNeeded === option
                            ? "bg-[#FF8C00]/20 border border-[#FF8C00] text-white"
                            : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.fundingNeeded && !formData.fundingNeeded.includes(t("apply.fundingNoCash").substring(0, 5)) && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">{t("apply.fundingUse")}</label>
                    <textarea
                      value={formData.fundingUse}
                      onChange={e => updateForm("fundingUse", e.target.value)}
                      placeholder={t("apply.fundingUsePlaceholder")}
                      rows={3}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 resize-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.pitchDeck")}</label>
                  <input
                    type="url"
                    value={formData.pitchDeck}
                    onChange={e => updateForm("pitchDeck", e.target.value)}
                    placeholder={t("apply.pitchDeckPlaceholder")}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.demoVideo")}</label>
                  <input
                    type="url"
                    value={formData.demoVideo}
                    onChange={e => updateForm("demoVideo", e.target.value)}
                    placeholder={t("apply.demoVideoPlaceholder")}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Review & Submit */}
            {step === 5 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white mb-6">✅ {t("apply.step5")}</h2>
                
                {/* Summary */}
                <div className="space-y-4 p-4 bg-black/30 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t("apply.summaryFounder")}</span>
                    <span className="text-white">{formData.founderName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t("apply.summaryProject")}</span>
                    <span className="text-white">{formData.projectName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t("apply.summaryCategory")}</span>
                    <span className="text-white">{formData.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t("apply.summaryStage")}</span>
                    <span className="text-white">{stages.find(s => s.value === formData.stage)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t("apply.summaryFunding")}</span>
                    <span className="text-white">{formData.fundingNeeded}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("apply.additionalInfo")}</label>
                  <textarea
                    value={formData.additionalInfo}
                    onChange={e => updateForm("additionalInfo", e.target.value)}
                    placeholder={t("apply.additionalInfoPlaceholder")}
                    rows={3}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 resize-none"
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={e => updateForm("agreeTerms", e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-white/20 bg-black/50 text-[#FF8C00] focus:ring-[#FF8C00]"
                  />
                  <span className="text-gray-300 text-sm">
                    {t("apply.agreeTerms")}
                  </span>
                </label>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                disabled={step === 1}
                className="px-6 py-3 text-gray-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← {t("common.back")}
              </button>
              
              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canProceed()}
                  className="px-8 py-3 bg-[#FF8C00] text-black font-semibold rounded-xl hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("common.next")} →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSubmitting}
                  className="px-8 py-3 bg-[#FF8C00] text-black font-semibold rounded-xl hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      {t("apply.submitting")}
                    </>
                  ) : (
                    <>{t("apply.submitButton")} 🚀</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="mt-8 p-4 bg-[#00E5FF]/5 border border-[#00E5FF]/20 rounded-xl">
            <p className="text-[#00E5FF] text-sm">
              💡 <strong>{t("apply.tipTitle")}</strong>{t("apply.tipContent")}
              <Link href="/idea-evaluator" className="underline hover:no-underline mx-1">{t("apply.tipEvaluator")}</Link>
              {t("apply.tipOr")}
              <Link href="/ai-mentor" className="underline hover:no-underline mx-1">{t("apply.tipMentor")}</Link>
              {t("apply.tipEnd")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
