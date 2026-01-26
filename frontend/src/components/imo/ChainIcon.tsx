"use client";

import { Chain, CHAIN_CONFIG } from "@/types/imo";
import Image from "next/image";

interface ChainIconProps {
  chain: Chain;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const chainColorClasses = {
  solana: "text-sol",
  bsc: "text-bnb",
};

export default function ChainIcon({ chain, size = "md", showName = false }: ChainIconProps) {
  const config = CHAIN_CONFIG[chain];
  const colorClass = chainColorClasses[chain] || "";
  
  return (
    <div className="flex items-center gap-1.5">
      <div className={`relative ${sizeClasses[size]}`}>
        <Image
          src={config.icon}
          alt={config.name}
          fill
          className="object-contain"
        />
      </div>
      {showName && (
        <span className={`text-sm font-medium ${colorClass}`}>{config.name}</span>
      )}
    </div>
  );
}
