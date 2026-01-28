"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 旧版 discover 页面，重定向到新的 submit 页面
export default function DiscoverPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/submit");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-gray-400">正在跳转...</p>
    </div>
  );
}
