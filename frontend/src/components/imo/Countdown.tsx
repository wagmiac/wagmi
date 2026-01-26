"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  endsAt: string;  // ISO 8601 时间
  onEnd?: () => void;
  size?: "sm" | "md" | "lg";
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  isEnded: boolean;
}

function calculateTimeLeft(endsAt: string): TimeLeft {
  const now = new Date().getTime();
  const end = new Date(endsAt).getTime();
  const diff = end - now;
  
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isEnded: true };
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds, isEnded: false };
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg font-bold",
};

export default function Countdown({ endsAt, onEnd, size = "md" }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    setTimeLeft(calculateTimeLeft(endsAt));
    
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(endsAt);
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft.isEnded) {
        clearInterval(timer);
        onEnd?.();
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [endsAt, onEnd]);
  
  // 服务端渲染或未挂载时显示占位符
  if (!mounted || !timeLeft) {
    return (
      <span className={`font-mono text-gray-500 ${sizeClasses[size]}`}>
        --:--:--
      </span>
    );
  }
  
  if (timeLeft.isEnded) {
    return (
      <span className={`text-[#EF4444] ${sizeClasses[size]}`}>
        已结束
      </span>
    );
  }
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  // 最后5分钟显示红色
  const isUrgent = timeLeft.hours === 0 && timeLeft.minutes < 5;
  
  return (
    <span className={`font-mono ${isUrgent ? 'text-[#EF4444]' : 'text-[#00E5FF]'} ${sizeClasses[size]}`}>
      {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
    </span>
  );
}
