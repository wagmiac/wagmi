"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface PaymentOrder {
  id: string;
  amount: number;
  final_amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "expired";
  credits: number;
  promo_code: string;
  created_at: string;
  completed_at: string | null;
}

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  note: string;
  created_at: string;
}

const STATUS_STYLES = {
  pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: { zh: "待支付", en: "Pending" } },
  completed: { bg: "bg-green-500/20", text: "text-green-400", label: { zh: "已完成", en: "Completed" } },
  failed: { bg: "bg-red-500/20", text: "text-red-400", label: { zh: "失败", en: "Failed" } },
  expired: { bg: "bg-gray-500/20", text: "text-gray-400", label: { zh: "已过期", en: "Expired" } },
};

const TX_TYPE_LABELS: Record<string, { zh: string; en: string; color: string }> = {
  purchase: { zh: "购买", en: "Purchase", color: "text-green-400" },
  use: { zh: "使用", en: "Use", color: "text-red-400" },
  gift: { zh: "赠送", en: "Gift", color: "text-blue-400" },
  refund: { zh: "退款", en: "Refund", color: "text-yellow-400" },
  promo: { zh: "优惠", en: "Promo", color: "text-purple-400" },
};

export default function OrdersPage() {
  const { locale } = useI18n();
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState<"orders" | "transactions">("orders");
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);

  // 获取数据
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // 获取积分
        const creditsRes = await fetch(`${API_BASE}/api/evaluator/credits`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (creditsRes.ok) {
          const data = await creditsRes.json();
          setCredits(data.credits || 0);
        }

        // 获取订单
        const ordersRes = await fetch(`${API_BASE}/api/evaluator/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrders(data.orders || []);
        }

        // 获取交易记录
        const txRes = await fetch(`${API_BASE}/api/evaluator/credits/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (txRes.ok) {
          const data = await txRes.json();
          setTransactions(data.transactions || []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <main className="pt-24 pb-16">
          <div className="max-w-lg mx-auto px-6 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold mb-4">
              {locale === "zh" ? "请先登录" : "Please Login First"}
            </h1>
            <Link
              href="/auth/login"
              className="inline-block px-6 py-3 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition"
            >
              {locale === "zh" ? "登录" : "Login"}
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
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              <span className="gradient-text">
                {locale === "zh" ? "📋 订单与积分" : "📋 Orders & Credits"}
              </span>
            </h1>
            
            {/* 积分显示 */}
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full mt-4">
              <span className="text-gray-400">
                {locale === "zh" ? "当前积分" : "Current Credits"}
              </span>
              <span className="text-2xl font-bold text-[#FF8C00]">{credits}</span>
              <Link
                href="/ph-evaluator/buy"
                className="ml-2 px-3 py-1 bg-[#FF8C00]/20 text-[#FF8C00] rounded-lg text-sm hover:bg-[#FF8C00]/30 transition"
              >
                + {locale === "zh" ? "充值" : "Buy"}
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-6 py-3 rounded-xl font-medium transition ${
                activeTab === "orders"
                  ? "bg-[#FF8C00] text-black"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {locale === "zh" ? "订单记录" : "Orders"}
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-6 py-3 rounded-xl font-medium transition ${
                activeTab === "transactions"
                  ? "bg-[#FF8C00] text-black"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {locale === "zh" ? "积分记录" : "Transactions"}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-[#FF8C00] border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-400">{locale === "zh" ? "加载中..." : "Loading..."}</p>
            </div>
          ) : activeTab === "orders" ? (
            /* 订单列表 */
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-400">
                    {locale === "zh" ? "暂无订单" : "No orders yet"}
                  </p>
                  <Link
                    href="/ph-evaluator/buy"
                    className="inline-block mt-4 px-6 py-2 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition"
                  >
                    {locale === "zh" ? "购买积分" : "Buy Credits"}
                  </Link>
                </div>
              ) : (
                orders.map((order) => {
                  const statusStyle = STATUS_STYLES[order.status];
                  return (
                    <div
                      key={order.id}
                      className="bg-white/5 backdrop-blur-sm rounded-xl p-5 hover:bg-white/10 transition"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label[locale as "zh" | "en"]}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                        <span className="font-mono text-sm text-gray-500">
                          {order.id.slice(0, 8)}...
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold">
                            {order.credits} {locale === "zh" ? "积分" : "Credits"}
                          </span>
                          {order.promo_code && (
                            <span className="ml-2 text-sm text-green-400">
                              🎟️ {order.promo_code}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          {order.amount !== order.final_amount && (
                            <span className="text-gray-500 line-through text-sm mr-2">
                              ${order.amount}
                            </span>
                          )}
                          <span className="text-xl font-bold text-[#FF8C00]">
                            ${order.final_amount} {order.currency}
                          </span>
                        </div>
                      </div>

                      {order.status === "pending" && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <Link
                            href={`/ph-evaluator/pay/${order.id}`}
                            className="text-[#FF8C00] hover:underline text-sm"
                          >
                            {locale === "zh" ? "继续支付 →" : "Continue Payment →"}
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* 交易记录 */
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-gray-400">
                    {locale === "zh" ? "暂无交易记录" : "No transactions yet"}
                  </p>
                </div>
              ) : (
                transactions.map((tx) => {
                  const txType = TX_TYPE_LABELS[tx.type] || { zh: tx.type, en: tx.type, color: "text-gray-400" };
                  const isPositive = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="bg-white/5 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isPositive ? "bg-green-500/20" : "bg-red-500/20"
                        }`}>
                          <span className={isPositive ? "text-green-400" : "text-red-400"}>
                            {isPositive ? "+" : "-"}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${txType.color}`}>
                              {txType[locale as "zh" | "en"]}
                            </span>
                            <span className="text-gray-500 text-sm">
                              {formatDate(tx.created_at)}
                            </span>
                          </div>
                          {tx.note && (
                            <p className="text-gray-400 text-sm">{tx.note}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-lg font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                          {isPositive ? "+" : ""}{tx.amount}
                        </div>
                        <div className="text-gray-500 text-sm">
                          {locale === "zh" ? "余额" : "Balance"}: {tx.balance_after}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 返回 */}
          <div className="text-center mt-8">
            <Link
              href="/ph-evaluator"
              className="text-gray-400 hover:text-white transition"
            >
              ← {locale === "zh" ? "返回评估器" : "Back to Evaluator"}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
