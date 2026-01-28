"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// 价格配置
const PRICE_PER_CREDIT = 99;

interface PromoValidation {
  valid: boolean;
  original_price: number;
  final_price: number;
  description: string;
}

export default function BuyCreditsPage() {
  const { locale } = useI18n();
  const { user, token } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [creditsCount, setCreditsCount] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [promoValidation, setPromoValidation] = useState<PromoValidation | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [creating, setCreating] = useState(false);
  const [currentCredits, setCurrentCredits] = useState(0);

  // 获取当前积分
  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/evaluator/credits`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => setCurrentCredits(data.credits || 0))
        .catch(console.error);
    }
  }, [token]);

  // 验证优惠码
  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError(locale === "zh" ? "请输入优惠码" : "Please enter a promo code");
      return;
    }

    setValidatingPromo(true);
    setPromoError("");
    setPromoValidation(null);

    try {
      const res = await fetch(`${API_BASE}/api/evaluator/promo/validate?code=${encodeURIComponent(promoCode)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid promo code");
      }

      setPromoValidation({
        ...data,
        // 根据购买数量计算
        original_price: PRICE_PER_CREDIT * creditsCount,
        final_price: data.final_price * creditsCount / PRICE_PER_CREDIT,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Validation failed";
      setPromoError(message);
    } finally {
      setValidatingPromo(false);
    }
  };

  // 计算总价
  const getTotalPrice = () => {
    const originalPrice = PRICE_PER_CREDIT * creditsCount;
    if (promoValidation?.valid) {
      // 重新计算优惠后价格
      return promoValidation.final_price * creditsCount / (promoValidation.original_price / PRICE_PER_CREDIT);
    }
    return originalPrice;
  };

  const getOriginalPrice = () => PRICE_PER_CREDIT * creditsCount;

  // 创建订单
  const createOrder = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setCreating(true);

    try {
      const res = await fetch(`${API_BASE}/api/evaluator/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          credits_count: creditsCount,
          promo_code: promoValidation?.valid ? promoCode : "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      // 跳转到支付页面（实际项目中这里会跳转到第三方支付）
      router.push(`/ph-evaluator/pay/${data.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Order creation failed";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  // 更新购买数量时重置优惠码验证
  const handleCreditsChange = (count: number) => {
    setCreditsCount(count);
    if (promoValidation) {
      // 重新验证
      validatePromoCode();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      <main className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              <span className="gradient-text">
                {locale === "zh" ? "💳 购买评估额度" : "💳 Buy Evaluation Credits"}
              </span>
            </h1>
            <p className="text-gray-400">
              {locale === "zh"
                ? "购买积分后可用于 Product Hunt 项目评估"
                : "Purchase credits to evaluate Product Hunt projects"}
            </p>
            
            {user && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full">
                <span className="text-gray-400">
                  {locale === "zh" ? "当前额度：" : "Current Credits: "}
                </span>
                <span className="text-[#FF8C00] font-bold">{currentCredits}</span>
              </div>
            )}
          </div>

          {/* 未登录提示 */}
          {!user && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 text-center mb-8">
              <p className="text-yellow-400 mb-4">
                {locale === "zh" ? "请先登录后再购买" : "Please login to purchase"}
              </p>
              <Link
                href="/auth/login"
                className="inline-block px-6 py-3 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition"
              >
                {locale === "zh" ? "登录" : "Login"}
              </Link>
            </div>
          )}

          {/* 购买表单 */}
          {user && (
            <div className="space-y-6">
              {/* 数量选择 */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
                <h3 className="font-bold mb-4">
                  {locale === "zh" ? "选择购买数量" : "Select Quantity"}
                </h3>
                
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[1, 3, 5, 10].map((count) => (
                    <button
                      key={count}
                      onClick={() => handleCreditsChange(count)}
                      className={`py-3 rounded-xl font-bold transition ${
                        creditsCount === count
                          ? "bg-[#FF8C00] text-black"
                          : "bg-white/10 hover:bg-white/20 text-white"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-gray-400">
                    {locale === "zh" ? "自定义数量：" : "Custom:"}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={creditsCount}
                    onChange={(e) => handleCreditsChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-center focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
              </div>

              {/* 优惠码 */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
                <h3 className="font-bold mb-4">
                  {locale === "zh" ? "优惠码（可选）" : "Promo Code (Optional)"}
                </h3>
                
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value.toUpperCase());
                      setPromoValidation(null);
                      setPromoError("");
                    }}
                    placeholder={locale === "zh" ? "输入优惠码" : "Enter promo code"}
                    className="flex-1 px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                  <button
                    onClick={validatePromoCode}
                    disabled={validatingPromo || !promoCode.trim()}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition disabled:opacity-50"
                  >
                    {validatingPromo
                      ? (locale === "zh" ? "验证中..." : "Validating...")
                      : (locale === "zh" ? "验证" : "Apply")}
                  </button>
                </div>

                {promoError && (
                  <p className="mt-3 text-red-400 text-sm">{promoError}</p>
                )}

                {promoValidation?.valid && (
                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <p className="text-green-400">
                      ✅ {promoValidation.description}
                    </p>
                  </div>
                )}
              </div>

              {/* 价格汇总 */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
                <h3 className="font-bold mb-4">
                  {locale === "zh" ? "订单汇总" : "Order Summary"}
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between text-gray-400">
                    <span>{locale === "zh" ? "评估额度" : "Credits"}</span>
                    <span>{creditsCount} × ${PRICE_PER_CREDIT}</span>
                  </div>

                  <div className="flex justify-between text-gray-400">
                    <span>{locale === "zh" ? "原价" : "Subtotal"}</span>
                    <span>${getOriginalPrice()}</span>
                  </div>

                  {promoValidation?.valid && (
                    <div className="flex justify-between text-green-400">
                      <span>{locale === "zh" ? "优惠" : "Discount"}</span>
                      <span>-${(getOriginalPrice() - getTotalPrice()).toFixed(2)}</span>
                    </div>
                  )}

                  <hr className="border-white/10" />

                  <div className="flex justify-between text-xl font-bold">
                    <span>{locale === "zh" ? "应付金额" : "Total"}</span>
                    <span className="text-[#FF8C00]">${getTotalPrice().toFixed(2)} USDT</span>
                  </div>
                </div>
              </div>

              {/* 支付按钮 */}
              <button
                onClick={createOrder}
                disabled={creating}
                className="w-full py-4 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] hover:from-[#FF9500] hover:to-[#FF7C00] text-black font-bold text-lg rounded-xl transition disabled:opacity-50"
              >
                {creating
                  ? (locale === "zh" ? "创建订单中..." : "Creating Order...")
                  : (locale === "zh" ? `支付 $${getTotalPrice().toFixed(2)} USDT` : `Pay $${getTotalPrice().toFixed(2)} USDT`)}
              </button>

              {/* 支付说明 */}
              <div className="text-center text-sm text-gray-500 space-y-1">
                <p>{locale === "zh" ? "支持 Solana、Ethereum、Polygon 等多链支付" : "Supports Solana, Ethereum, Polygon and more"}</p>
                <p>{locale === "zh" ? "支付完成后积分即时到账" : "Credits arrive instantly after payment"}</p>
              </div>
            </div>
          )}

          {/* 返回链接 */}
          <div className="mt-8 text-center">
            <Link href="/ph-evaluator" className="text-gray-400 hover:text-white transition">
              ← {locale === "zh" ? "返回评估器" : "Back to Evaluator"}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
