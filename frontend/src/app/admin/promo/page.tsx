"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import AdminLayout from "@/components/admin/AdminLayout";
import Dropdown from "@/components/ui/Dropdown";
import { useToast } from "@/components/ui/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

interface PromoCode {
  id: string;
  code: string;
  type: string;
  value: number;
  expires_at: string;
  used: boolean;
  used_by?: string;
  used_at?: string;
  created_at: string;
}

export default function PromoManagementPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUsed, setShowUsed] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // 创建表单
  const [createForm, setCreateForm] = useState({
    type: "free",
    value: 0,
    expires_in: 168, // 7 天
    count: 1,
  });

  // 赠送表单
  const [giftForm, setGiftForm] = useState({
    user_id: "",
    amount: 1,
    reason: "",
  });
  const [gifting, setGifting] = useState(false);

  // 加载优惠码列表
  const loadCodes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/admin/promo?show_used=${showUsed}&page_size=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setCodes(data.codes || []);
    } catch (err) {
      console.error("Failed to load promo codes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, [token, showUsed]);

  // 创建优惠码
  const createPromoCode = async () => {
    if (!token) return;
    setCreating(true);
    try {
      const endpoint = createForm.count > 1 
        ? `${API_BASE}/admin/promo/batch`
        : `${API_BASE}/admin/promo`;
      
      const body = createForm.count > 1
        ? { ...createForm }
        : { type: createForm.type, value: createForm.value, expires_in: createForm.expires_in };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }

      const data = await res.json();
      await loadCodes();
      
      // 复制优惠码到剪贴板
      if (createForm.count === 1 && data.code) {
        await navigator.clipboard.writeText(data.code);
        toast.success(`优惠码创建成功并已复制: ${data.code}`);
      } else if (createForm.count > 1 && data.codes?.length > 0) {
        const codesText = data.codes.map((c: { code: string }) => c.code).join("\n");
        await navigator.clipboard.writeText(codesText);
        toast.success(`成功创建 ${createForm.count} 个优惠码并已复制到剪贴板`);
      } else {
        toast.success(createForm.count > 1 ? `成功创建 ${createForm.count} 个优惠码` : "优惠码创建成功");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "创建失败";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  // 删除优惠码
  const deleteCode = async (id: string) => {
    if (!confirm("确定删除此优惠码？")) return;
    try {
      await fetch(`${API_BASE}/admin/promo/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadCodes();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // 赠送积分
  const giftCredits = async () => {
    if (!giftForm.user_id.trim()) {
      toast.warning("请输入用户 ID");
      return;
    }
    setGifting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/promo/gift`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(giftForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to gift");
      }

      toast.success(`成功赠送 ${giftForm.amount} 积分给用户`);
      setGiftForm({ user_id: "", amount: 1, reason: "" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "赠送失败";
      toast.error(message);
    } finally {
      setGifting(false);
    }
  };

  // 复制优惠码
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("已复制到剪贴板");
  };

  // 获取类型标签
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "free": return "免单";
      case "discount_percent": return "折扣";
      case "discount_amount": return "减免";
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "free": return "bg-green-500/20 text-green-400";
      case "discount_percent": return "bg-blue-500/20 text-blue-400";
      case "discount_amount": return "bg-yellow-500/20 text-yellow-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <AdminLayout title="免单码管理">
      <div className="max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* 创建优惠码 */}
            <div className="bg-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">创建优惠码</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">类型</label>
                  <Dropdown
                    options={[
                      { value: "free", label: "免单" },
                      { value: "discount_percent", label: "折扣（百分比）" },
                      { value: "discount_amount", label: "减免（固定金额）" },
                    ]}
                    value={createForm.type}
                    onChange={(value) => setCreateForm({ ...createForm, type: value })}
                    size="md"
                  />
                </div>

                {createForm.type !== "free" && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      {createForm.type === "discount_percent" ? "折扣比例 (%)" : "减免金额 ($)"}
                    </label>
                    <input
                      type="number"
                      value={createForm.value}
                      onChange={(e) => setCreateForm({ ...createForm, value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white"
                      placeholder={createForm.type === "discount_percent" ? "20" : "10"}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-1">有效期（小时）</label>
                  <input
                    type="number"
                    value={createForm.expires_in}
                    onChange={(e) => setCreateForm({ ...createForm, expires_in: parseInt(e.target.value) || 168 })}
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">168 小时 = 7 天</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">生成数量</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={createForm.count}
                    onChange={(e) => setCreateForm({ ...createForm, count: Math.min(100, parseInt(e.target.value) || 1) })}
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white"
                  />
                </div>

                <button
                  onClick={createPromoCode}
                  disabled={creating}
                  className="w-full py-3 bg-[#FF8C00] hover:bg-[#FF9500] text-black font-bold rounded-xl transition disabled:opacity-50"
                >
                  {creating ? "创建中..." : `创建 ${createForm.count} 个优惠码`}
                </button>
              </div>
            </div>

            {/* 赠送积分 */}
            <div className="bg-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">🎁 赠送积分</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">用户 ID</label>
                  <input
                    type="text"
                    value={giftForm.user_id}
                    onChange={(e) => setGiftForm({ ...giftForm, user_id: e.target.value })}
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white"
                    placeholder="输入用户 UUID"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">积分数量</label>
                  <input
                    type="number"
                    min="1"
                    value={giftForm.amount}
                    onChange={(e) => setGiftForm({ ...giftForm, amount: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">备注原因</label>
                  <input
                    type="text"
                    value={giftForm.reason}
                    onChange={(e) => setGiftForm({ ...giftForm, reason: e.target.value })}
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white"
                    placeholder="早期用户福利 / Bug 补偿等"
                  />
                </div>

                <button
                  onClick={giftCredits}
                  disabled={gifting}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition disabled:opacity-50"
                >
                  {gifting ? "赠送中..." : "赠送积分"}
                </button>
              </div>
            </div>
        </div>

        {/* 优惠码列表 */}
        <div className="bg-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">优惠码列表</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showUsed}
                  onChange={(e) => setShowUsed(e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-400">显示已使用</span>
              </label>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : codes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">暂无优惠码</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-white/10">
                      <th className="pb-3">优惠码</th>
                      <th className="pb-3">类型</th>
                      <th className="pb-3">值</th>
                      <th className="pb-3">过期时间</th>
                      <th className="pb-3">状态</th>
                      <th className="pb-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((code) => (
                      <tr key={code.id} className="border-b border-white/5">
                        <td className="py-3">
                          <span 
                            className="font-mono cursor-pointer hover:text-[#FF8C00]"
                            onClick={() => copyCode(code.code)}
                            title="点击复制"
                          >
                            {code.code}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(code.type)}`}>
                            {getTypeLabel(code.type)}
                          </span>
                        </td>
                        <td className="py-3">
                          {code.type === "free" ? "-" : 
                           code.type === "discount_percent" ? `${code.value}%` : `$${code.value}`}
                        </td>
                        <td className="py-3 text-sm text-gray-400">
                          {new Date(code.expires_at).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          {code.used ? (
                            <span className="text-red-400">已使用</span>
                          ) : new Date(code.expires_at) < new Date() ? (
                            <span className="text-yellow-400">已过期</span>
                          ) : (
                            <span className="text-green-400">有效</span>
                          )}
                        </td>
                        <td className="py-3">
                          {!code.used && (
                            <button
                              onClick={() => deleteCode(code.id)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              删除
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>
    </AdminLayout>
  );
}
