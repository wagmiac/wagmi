"use client";

import { useState, createContext, useContext, ReactNode } from "react";

// 公告类型
interface Announcement {
  id: string;
  type: "info" | "success" | "warning" | "urgent";
  title: string;
  message: string;
  link?: string;
  linkText?: string;
  dismissible: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

// 模拟公告数据
const mockAnnouncements: Announcement[] = [
  // 暂时注释掉所有公告
  /*
  {
    id: "2",
    type: "success",
    title: "🎉 AI Idea 评估器上线！",
    message: "使用 AI 快速评估你的创业想法，现已免费开放使用。",
    link: "/idea-evaluator",
    linkText: "立即体验",
    dismissible: true,
    createdAt: new Date("2026-01-18"),
  },
  {
    id: "3",
    type: "info",
    title: "📢 每周 AMA",
    message: "本周四 20:00 UTC+8，Discord 社区 AMA，欢迎参加！",
    dismissible: true,
    createdAt: new Date("2026-01-21"),
  },
  */
];

// Context
interface NotificationContextType {
  announcements: Announcement[];
  dismissAnnouncement: (id: string) => void;
  hasUnread: boolean;
  showBanner: boolean;
  setShowBanner: (show: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [announcements] = useState<Announcement[]>(mockAnnouncements);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    // 懒初始化，从 localStorage 读取
    if (typeof window === "undefined") return new Set();
    const saved = localStorage.getItem("wagmi-dismissed-announcements");
    if (saved) {
      return new Set(JSON.parse(saved));
    }
    return new Set();
  });
  const [showBanner, setShowBanner] = useState(true);

  const dismissAnnouncement = (id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    if (typeof window !== "undefined") {
      localStorage.setItem("wagmi-dismissed-announcements", JSON.stringify([...newDismissed]));
    }
  };

  const activeAnnouncements = announcements.filter(
    a => !dismissedIds.has(a.id) && (!a.expiresAt || new Date(a.expiresAt) > new Date())
  );

  const hasUnread = activeAnnouncements.length > 0;

  return (
    <NotificationContext.Provider
      value={{
        announcements: activeAnnouncements,
        dismissAnnouncement,
        hasUnread,
        showBanner,
        setShowBanner,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

// 顶部公告横幅
export function AnnouncementBanner() {
  const { announcements, dismissAnnouncement, showBanner, setShowBanner } = useNotifications();
  
  // 显示最紧急/最新的公告
  const urgentAnnouncement = announcements.find(a => a.type === "urgent") || announcements[0];

  if (!showBanner || !urgentAnnouncement) return null;

  const bgColors = {
    urgent: "bg-gradient-to-r from-red-500/90 to-orange-500/90",
    success: "bg-gradient-to-r from-green-500/90 to-emerald-500/90",
    warning: "bg-gradient-to-r from-yellow-500/90 to-orange-500/90",
    info: "bg-gradient-to-r from-blue-500/90 to-cyan-500/90",
  };

  return (
    <div className={`${bgColors[urgentAnnouncement.type]} text-white py-2 px-4`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-bold whitespace-nowrap">{urgentAnnouncement.title}</span>
          <span className="text-white/80 text-sm truncate hidden sm:block">
            {urgentAnnouncement.message}
          </span>
          {urgentAnnouncement.link && (
            <a
              href={urgentAnnouncement.link}
              className="text-white underline text-sm whitespace-nowrap hover:no-underline"
            >
              {urgentAnnouncement.linkText || "了解更多"}
            </a>
          )}
        </div>
        {urgentAnnouncement.dismissible && (
          <button
            onClick={() => {
              dismissAnnouncement(urgentAnnouncement.id);
              if (announcements.length <= 1) {
                setShowBanner(false);
              }
            }}
            className="text-white/80 hover:text-white p-1"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// 通知铃铛图标（用于导航栏）
export function NotificationBell({ className = "" }: { className?: string }) {
  const { hasUnread, announcements } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-400 hover:text-white transition"
      >
        <span className="text-xl">🔔</span>
        {hasUnread && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 bg-black/95 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-bold">通知</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {announcements.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  暂无新通知
                </div>
              ) : (
                announcements.map(announcement => (
                  <NotificationItem
                    key={announcement.id}
                    announcement={announcement}
                    onClose={() => setShowDropdown(false)}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationItem({
  announcement,
  onClose,
}: {
  announcement: Announcement;
  onClose: () => void;
}) {
  const { dismissAnnouncement } = useNotifications();

  const typeIcons = {
    urgent: "🚨",
    success: "✅",
    warning: "⚠️",
    info: "ℹ️",
  };

  const typeColors = {
    urgent: "border-l-red-500",
    success: "border-l-green-500",
    warning: "border-l-yellow-500",
    info: "border-l-blue-500",
  };

  return (
    <div
      className={`p-4 border-b border-white/5 border-l-4 ${typeColors[announcement.type]} hover:bg-white/5 transition`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span>{typeIcons[announcement.type]}</span>
            <span className="text-white font-medium text-sm">{announcement.title}</span>
          </div>
          <p className="text-gray-400 text-sm mb-2">{announcement.message}</p>
          {announcement.link && (
            <a
              href={announcement.link}
              onClick={onClose}
              className="text-[#FF8C00] text-sm hover:underline"
            >
              {announcement.linkText || "查看详情"} →
            </a>
          )}
          <p className="text-gray-600 text-xs mt-2">
            {formatTimeAgo(announcement.createdAt)}
          </p>
        </div>
        {announcement.dismissible && (
          <button
            onClick={() => dismissAnnouncement(announcement.id)}
            className="text-gray-500 hover:text-white p-1"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return "刚刚";
}

// Toast 通知
interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, "id">) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    // 自动移除
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-in-right ${
              toast.type === "success"
                ? "bg-green-500/90"
                : toast.type === "error"
                ? "bg-red-500/90"
                : toast.type === "warning"
                ? "bg-yellow-500/90"
                : "bg-blue-500/90"
            } text-white`}
          >
            <span>
              {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : toast.type === "warning" ? "⚠" : "ℹ"}
            </span>
            <span className="text-sm">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
