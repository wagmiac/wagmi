"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/components/ui/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

interface Setting {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

// 配置项分组定义
const SETTING_GROUPS: Record<string, { name: string; icon: string; keys: string[] }> = {
  github: {
    name: "GitHub 配置",
    icon: "🐙",
    keys: ["github_token"],
  },
  ai: {
    name: "AI 配置",
    icon: "🤖",
    keys: ["ai_model", "ai_temperature", "ai_api_key", "ai_base_url"],
  },
  prompts: {
    name: "Prompt 模板",
    icon: "📝",
    keys: ["prompt_rewrite_zh", "prompt_rewrite_en", "prompt_evaluation"],
  },
  payment: {
    name: "支付配置",
    icon: "💰",
    keys: ["sol_receiver_address", "bnb_receiver_address", "discover_fee_usd"],
  },
  system: {
    name: "系统配置",
    icon: "⚙️",
    keys: ["site_name", "site_description", "maintenance_mode"],
  },
};

// 敏感配置项（显示时隐藏）
const SENSITIVE_KEYS = ["github_token", "ai_api_key"];

// 长文本配置项（使用 textarea）
const TEXTAREA_KEYS = ["prompt_rewrite_zh", "prompt_rewrite_en", "prompt_evaluation"];

export default function SettingsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeGroup, setActiveGroup] = useState("github");
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

  // 加载配置列表
  const loadSettings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error("Failed to load settings:", res.status, res.statusText);
        toast.error(`加载配置失败: ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSettings(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      toast.error("加载配置失败");
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 获取配置值
  const getSettingValue = (key: string): string => {
    const setting = settings.find((s) => s.key === key);
    return setting?.value || "";
  };

  // 获取配置描述
  const getSettingDescription = (key: string): string => {
    const setting = settings.find((s) => s.key === key);
    return setting?.description || getDefaultDescription(key);
  };

  // 默认描述
  const getDefaultDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      github_token: "GitHub Personal Access Token，用于提高 API 请求限制（5000次/小时）",
      ai_model: "AI 模型名称，如 gpt-4、claude-3-opus 等",
      ai_temperature: "AI 生成温度，0-1 之间，越高越随机",
      ai_api_key: "AI API 密钥",
      ai_base_url: "AI API 基础 URL",
      prompt_rewrite_zh: "中文内容重写 Prompt 模板",
      prompt_rewrite_en: "英文内容重写 Prompt 模板",
      prompt_evaluation: "项目评估 Prompt 模板",
      sol_receiver_address: "Solana 收款钱包地址",
      bnb_receiver_address: "BSC 收款钱包地址",
      discover_fee_usd: "发掘费用（USD）",
      site_name: "站点名称",
      site_description: "站点描述",
      maintenance_mode: "维护模式（true/false）",
    };
    return descriptions[key] || "";
  };

  // 开始编辑
  const startEdit = (key: string) => {
    setEditingKey(key);
    setEditValue(getSettingValue(key));
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  // 保存配置
  const saveSetting = async (key: string) => {
    if (!token) return;
    setSaving(key);
    try {
      const res = await fetch(`${API_BASE}/settings/${key}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: editValue }),
      });
      if (!res.ok) {
        toast.error(`保存失败: ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast.success("保存成功");
        setEditingKey(null);
        loadSettings();
      } else {
        toast.error(data.error || "保存失败");
      }
    } catch (err) {
      console.error("Failed to save setting:", err);
      toast.error("保存失败");
    } finally {
      setSaving(null);
    }
  };

  // 切换敏感信息显示
  const toggleSensitive = (key: string) => {
    setShowSensitive((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 格式化显示值
  const formatDisplayValue = (key: string, value: string): string => {
    if (!value) return "未设置";
    if (SENSITIVE_KEYS.includes(key) && !showSensitive[key]) {
      return "••••••••••••••••";
    }
    if (value.length > 100 && !TEXTAREA_KEYS.includes(key)) {
      return value.substring(0, 100) + "...";
    }
    return value;
  };

  // 获取当前分组的配置项
  const currentGroupKeys = SETTING_GROUPS[activeGroup]?.keys || [];

  return (
    <AdminLayout title="系统配置">
      <div className="flex gap-6">
        {/* 左侧分组导航 */}
        <div className="w-48 flex-shrink-0">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-2 sticky top-4">
            {Object.entries(SETTING_GROUPS).map(([groupKey, group]) => (
              <button
                key={groupKey}
                onClick={() => setActiveGroup(groupKey)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition flex items-center gap-2 ${
                  activeGroup === groupKey
                    ? "bg-[#FF8C00]/10 text-[#FF8C00]"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{group.icon}</span>
                <span className="text-sm font-medium">{group.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧配置内容 */}
        <div className="flex-1">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>{SETTING_GROUPS[activeGroup]?.icon}</span>
                {SETTING_GROUPS[activeGroup]?.name}
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#FF8C00] border-t-transparent" />
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {currentGroupKeys.map((key) => (
                  <div key={key} className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono text-[#FF8C00] bg-[#FF8C00]/10 px-2 py-0.5 rounded">
                            {key}
                          </code>
                          {SENSITIVE_KEYS.includes(key) && (
                            <button
                              onClick={() => toggleSensitive(key)}
                              className="text-xs text-gray-500 hover:text-gray-300"
                            >
                              {showSensitive[key] ? "🙈 隐藏" : "👁 显示"}
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                          {getSettingDescription(key)}
                        </p>

                        {editingKey === key ? (
                          <div className="space-y-3">
                            {TEXTAREA_KEYS.includes(key) ? (
                              <textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                rows={8}
                                className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-[#FF8C00] resize-y"
                                placeholder="输入配置值..."
                              />
                            ) : (
                              <input
                                type={SENSITIVE_KEYS.includes(key) && !showSensitive[key] ? "password" : "text"}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#FF8C00]"
                                placeholder="输入配置值..."
                              />
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveSetting(key)}
                                disabled={saving === key}
                                className="px-4 py-1.5 bg-[#FF8C00] text-black text-sm font-medium rounded-lg hover:bg-[#FF8C00]/80 transition disabled:opacity-50"
                              >
                                {saving === key ? "保存中..." : "保存"}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-4 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => startEdit(key)}
                            className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg cursor-pointer hover:border-white/20 transition group"
                          >
                            <p className={`text-sm ${getSettingValue(key) ? "text-white" : "text-gray-600"} ${TEXTAREA_KEYS.includes(key) ? "whitespace-pre-wrap font-mono" : ""}`}>
                              {formatDisplayValue(key, getSettingValue(key))}
                            </p>
                            <p className="text-xs text-gray-600 mt-1 opacity-0 group-hover:opacity-100 transition">
                              点击编辑
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {currentGroupKeys.length === 0 && (
                  <div className="px-6 py-10 text-center text-gray-500">
                    暂无配置项
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 说明 */}
          <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <h3 className="text-sm font-medium text-blue-400 mb-2">💡 提示</h3>
            <ul className="text-xs text-blue-300/80 space-y-1">
              <li>• 配置修改后立即生效，无需重启服务</li>
              <li>• 敏感配置（如 API Key）请妥善保管，不要泄露</li>
              <li>• GitHub Token 可在 GitHub Settings → Developer settings → Personal access tokens 中生成</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
