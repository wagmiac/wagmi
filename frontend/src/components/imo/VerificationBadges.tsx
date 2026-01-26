"use client";

import { VerificationIcons } from "@/types/imo";

interface VerificationBadgesProps {
  verification: VerificationIcons;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export default function VerificationBadges({ verification, size = "md" }: VerificationBadgesProps) {
  const badges = [
    { key: 'twitter', icon: '🐦', label: 'Twitter 已验证', active: verification.twitter },
    { key: 'github', icon: '🐙', label: 'GitHub 已验证', active: verification.github },
    { key: 'website', icon: '🌐', label: '官网已验证', active: verification.website },
    { key: 'official', icon: '🏆', label: '官方认领', active: verification.official },
  ];

  return (
    <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
      {badges.map((badge) => (
        <span
          key={badge.key}
          className={`transition-opacity ${badge.active ? 'opacity-100' : 'opacity-30 grayscale'}`}
          title={badge.label}
        >
          {badge.icon}
        </span>
      ))}
    </div>
  );
}
