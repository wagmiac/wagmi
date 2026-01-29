"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// 支持的支付链
const PAYMENT_CHAINS = [
  { id: "solana", name: "Solana", icon: "◎", color: "#9945FF" },
  { id: "ethereum", name: "Ethereum", icon: "Ξ", color: "#627EEA" },
  { id: "bsc", name: "BSC", icon: "🔶", color: "#F3BA2F" },
];

// 支付地址（示例，实际应从后端获取）
const PAYMENT_ADDRESSES: Record<string, string> = {
  solana: "WagmiPay111111111111111111111111111111111",
  ethereum: "0x1234567890abcdef1234567890abcdef12345678",
  bsc: "0x1234567890abcdef1234567890abcdef12345678",
};

interface PaymentOrder {
  id: string;
  user_id: string;
  amount: number;
  final_amount: number;
  currency: string;
  chain: string;
  status: "pending" | "completed" | "failed" | "expired";
  promo_code: string;
  credits: number;
  payment_tx: string;
  expires_at: string;
  created_at: string;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { locale } = useI18n();
  const { token } = useAuth();
  const toast = useToast();

  const orderId = params.orderId as string;

  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedChain, setSelectedChain] = useState("solana");
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [confirming, setConfirming] = useState(false);
  const [txHash, setTxHash] = useState("");

  // 获取订单详情
  const fetchOrder = useCallback(async () => {
    if (!token || !orderId) return;

    try {
      const res = await fetch(`${API_BASE}/evaluator/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Order not found");
      }

      const data = await res.json();
      setOrder(data);

      // 计算剩余时间
      const expiresAt = new Date(data.expires_at).getTime();
      const now = Date.now();
      setTimeLeft(Math.max(0, Math.floor((expiresAt - now) / 1000)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [token, orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // 倒计时
  useEffect(() => {
    if (timeLeft <= 0 || order?.status !== "pending") return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          fetchOrder(); // 刷新状态
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, order?.status, fetchOrder]);

  // 轮询订单状态
  useEffect(() => {
    if (order?.status !== "pending") return;

    const pollInterval = setInterval(() => {
      fetchOrder();
    }, 5000); // 每 5 秒检查一次

    return () => clearInterval(pollInterval);
  }, [order?.status, fetchOrder]);

  // 复制地址
  const copyAddress = async () => {
    const address = PAYMENT_ADDRESSES[selectedChain];
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 手动确认支付（测试用）
  const confirmPayment = async () => {
    if (!txHash.trim()) {
      toast.warning(locale === "zh" ? "请输入交易哈希" : "Please enter transaction hash");
      return;
    }

    setConfirming(true);
    try {
      const res = await fetch(`${API_BASE}/evaluator/orders/${orderId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tx_hash: txHash,
          chain: selectedChain,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Confirmation failed");
      }

      await fetchOrder();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-[#FF8C00] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">{locale === "zh" ? "加载中..." : "Loading..."}</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <main className="pt-24 pb-16">
          <div className="max-w-lg mx-auto px-6 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-4">
              {locale === "zh" ? "订单不存在" : "Order Not Found"}
            </h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link
              href="/ph-evaluator/buy"
              className="inline-block px-6 py-3 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition"
            >
              {locale === "zh" ? "重新购买" : "Buy Again"}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // 已完成
  if (order.status === "completed") {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <main className="pt-24 pb-16">
          <div className="max-w-lg mx-auto px-6 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-4 text-green-400">
              {locale === "zh" ? "支付成功！" : "Payment Successful!"}
            </h1>
            <p className="text-gray-400 mb-2">
              {locale === "zh"
                ? `已获得 ${order.credits} 个评估额度`
                : `You received ${order.credits} evaluation credit(s)`}
            </p>
            {order.payment_tx && (
              <p className="text-gray-500 text-sm mb-6 break-all">
                TX: {order.payment_tx}
              </p>
            )}
            <Link
              href="/ph-evaluator"
              className="inline-block px-6 py-3 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition"
            >
              {locale === "zh" ? "开始评估" : "Start Evaluating"}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // 已过期
  if (order.status === "expired" || timeLeft <= 0) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <main className="pt-24 pb-16">
          <div className="max-w-lg mx-auto px-6 text-center">
            <div className="text-6xl mb-4">⏰</div>
            <h1 className="text-2xl font-bold mb-4 text-yellow-400">
              {locale === "zh" ? "订单已过期" : "Order Expired"}
            </h1>
            <p className="text-gray-400 mb-6">
              {locale === "zh"
                ? "请重新创建订单"
                : "Please create a new order"}
            </p>
            <Link
              href="/ph-evaluator/buy"
              className="inline-block px-6 py-3 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition"
            >
              {locale === "zh" ? "重新购买" : "Buy Again"}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      <main className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              <span className="gradient-text">
                {locale === "zh" ? "💳 完成支付" : "💳 Complete Payment"}
              </span>
            </h1>
            <p className="text-gray-400">
              {locale === "zh"
                ? "请在倒计时结束前完成转账"
                : "Please complete the transfer before timer ends"}
            </p>
          </div>

          {/* 倒计时 */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full ${
              timeLeft < 300 ? "bg-red-500/20 text-red-400" : "bg-white/5"
            }`}>
              <span>⏱️</span>
              <span className="font-mono text-2xl font-bold">{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* 订单信息 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <span>📋</span>
              {locale === "zh" ? "订单详情" : "Order Details"}
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">{locale === "zh" ? "订单编号" : "Order ID"}</span>
                <span className="font-mono text-xs">{order.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{locale === "zh" ? "购买数量" : "Credits"}</span>
                <span className="font-bold">{order.credits}</span>
              </div>
              {order.promo_code && (
                <div className="flex justify-between">
                  <span className="text-gray-400">{locale === "zh" ? "优惠码" : "Promo Code"}</span>
                  <span className="text-green-400">{order.promo_code}</span>
                </div>
              )}
              {order.amount !== order.final_amount && (
                <div className="flex justify-between">
                  <span className="text-gray-400">{locale === "zh" ? "原价" : "Original"}</span>
                  <span className="line-through text-gray-500">${order.amount} USDT</span>
                </div>
              )}
              <div className="flex justify-between text-lg pt-2 border-t border-white/10">
                <span className="font-bold">{locale === "zh" ? "应付金额" : "Amount Due"}</span>
                <span className="font-bold text-[#FF8C00]">${order.final_amount} USDT</span>
              </div>
            </div>
          </div>

          {/* 选择链 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <span>⛓️</span>
              {locale === "zh" ? "选择支付链" : "Select Chain"}
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => setSelectedChain(chain.id)}
                  className={`p-4 rounded-xl transition ${
                    selectedChain === chain.id
                      ? "bg-white/10 border-2 border-[#FF8C00]"
                      : "bg-white/5 border-2 border-transparent hover:border-white/20"
                  }`}
                >
                  <div className="text-2xl mb-1">{chain.icon}</div>
                  <div className="text-sm font-medium">{chain.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 支付地址 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <span>📮</span>
              {locale === "zh" ? "转账地址" : "Payment Address"}
            </h3>

            <div className="bg-black/50 rounded-xl p-4 mb-4">
              <div className="text-xs text-gray-400 mb-2">
                {PAYMENT_CHAINS.find((c) => c.id === selectedChain)?.name} USDT Address
              </div>
              <div className="font-mono text-sm break-all">
                {PAYMENT_ADDRESSES[selectedChain]}
              </div>
            </div>

            <button
              onClick={copyAddress}
              className={`w-full py-3 rounded-xl font-bold transition ${
                copied
                  ? "bg-green-500 text-white"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {copied
                ? locale === "zh" ? "✓ 已复制" : "✓ Copied"
                : locale === "zh" ? "📋 复制地址" : "📋 Copy Address"}
            </button>

            <p className="text-center text-gray-500 text-xs mt-3">
              {locale === "zh"
                ? `请准确转账 ${order.final_amount} USDT 到上述地址`
                : `Please transfer exactly ${order.final_amount} USDT to the address above`}
            </p>
          </div>

          {/* 确认支付 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <span>✅</span>
              {locale === "zh" ? "确认支付" : "Confirm Payment"}
            </h3>

            <p className="text-gray-400 text-sm mb-4">
              {locale === "zh"
                ? "转账完成后，请输入交易哈希以加速确认"
                : "After transfer, enter the transaction hash to speed up confirmation"}
            </p>

            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder={locale === "zh" ? "交易哈希 (可选)" : "Transaction Hash (optional)"}
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:outline-none focus:border-[#FF8C00] text-sm font-mono mb-4"
            />

            <button
              onClick={confirmPayment}
              disabled={confirming}
              className="w-full py-3 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition disabled:opacity-50"
            >
              {confirming
                ? locale === "zh" ? "确认中..." : "Confirming..."
                : locale === "zh" ? "我已完成转账" : "I've Completed Transfer"}
            </button>

            <p className="text-center text-gray-500 text-xs mt-3">
              {locale === "zh"
                ? "系统会自动检测链上交易，通常 1-5 分钟内确认"
                : "System will auto-detect on-chain transactions, usually confirmed within 1-5 minutes"}
            </p>
          </div>

          {/* 返回 */}
          <div className="text-center">
            <Link
              href="/ph-evaluator/buy"
              className="text-gray-400 hover:text-white transition"
            >
              ← {locale === "zh" ? "返回" : "Back"}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
