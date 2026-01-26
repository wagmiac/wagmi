"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newNotification: Notification = {
        ...notification,
        id,
        duration: notification.duration ?? 5000,
      };

      setNotifications((prev) => [...prev, newNotification]);

      // 自动移除
      if (newNotification.duration && newNotification.duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, newNotification.duration);
      }
    },
    [removeNotification]
  );

  const success = useCallback(
    (title: string, message?: string) => {
      addNotification({ type: "success", title, message });
    },
    [addNotification]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      addNotification({ type: "error", title, message, duration: 8000 });
    },
    [addNotification]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      addNotification({ type: "info", title, message });
    },
    [addNotification]
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      addNotification({ type: "warning", title, message, duration: 6000 });
    },
    [addNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        success,
        error,
        info,
        warning,
      }}
    >
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const config: Record<NotificationType, { icon: string; color: string; bg: string }> = {
    success: {
      icon: "✓",
      color: "text-green-400",
      bg: "bg-green-500/10 border-green-500/30",
    },
    error: {
      icon: "✕",
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/30",
    },
    info: {
      icon: "ℹ",
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/30",
    },
    warning: {
      icon: "⚠",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10 border-yellow-500/30",
    },
  };

  const { icon, color, bg } = config[notification.type];

  return (
    <div
      className={`${bg} border rounded-xl p-4 shadow-lg backdrop-blur-sm animate-slide-in-right`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-6 h-6 rounded-full ${color} flex items-center justify-center flex-shrink-0 font-bold`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white">{notification.title}</p>
          {notification.message && (
            <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
