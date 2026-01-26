"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Sidebar, useSidebar } from "@/components/imo";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { Project } from "@/types/imo";
import { getProjectByTicker, submitClaimRequest } from "@/lib/api/imo";

type ClaimStep = "loading" | "info" | "verify" | "submit" | "pending" | "success";

interface VerificationProof {
  type: "twitter" | "github" | "website";
  url: string;
  verified: boolean;
}

export default function ClaimPage() {
  const params = useParams();
  const router = useRouter();
  const { sidebarWidth } = useSidebar();
  const { address, isConnected, connect } = useWallet();
  
  const [step, setStep] = useState<ClaimStep>("loading");
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 验证信息
  const [verificationCode, setVerificationCode] = useState("");
  const [proofs, setProofs] = useState<VerificationProof[]>([]);
  const [selectedProofType, setSelectedProofType] = useState<"twitter" | "github" | "website">("twitter");
  const [proofUrl, setProofUrl] = useState("");
  const [creatorWallet, setCreatorWallet] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const ticker = params.ticker as string;

  // 加载项目信息
  useEffect(() => {
    async function loadProject() {
      try {
        const res = await getProjectByTicker(ticker);
        if (res.success && res.data) {
          const proj = res.data as Project;
          setProject(proj);
          
          // 生成验证码
          const code = `wagmi-verify-${proj.id}-${Date.now().toString(36)}`;
          setVerificationCode(code);
          
          // 检查是否已认领
          if (proj.claimStatus === "claimed") {
            setStep("success");
          } else if (proj.claimStatus === "pending") {
            setStep("pending");
          } else {
            setStep("info");
          }
        } else {
          setError("项目不存在");
        }
      } catch {
        setError("加载项目失败");
      }
    }
    
    loadProject();
  }, [ticker]);

  // 添加验证证明
  function addProof() {
    if (!proofUrl) return;
    
    setProofs([...proofs, {
      type: selectedProofType,
      url: proofUrl,
      verified: false,
    }]);
    setProofUrl("");
  }

  // 移除验证证明
  function removeProof(index: number) {
    setProofs(proofs.filter((_, i) => i !== index));
  }

  // 提交认领申请
  async function handleSubmit() {
    if (!project || proofs.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 提交每个验证证明
      for (const proof of proofs) {
        await submitClaimRequest(project.id, {
          proofType: proof.type,
          proofUrl: proof.url,
        });
      }
      
      setStep("pending");
    } catch {
      setError("提交失败，请重试");
    } finally {
      setIsLoading(false);
    }
  }

  // 获取验证指南
  function getVerificationGuide(type: "twitter" | "github" | "website") {
    switch (type) {
      case "twitter":
        return {
          title: "Twitter 验证",
          icon: "🐦",
          steps: [
            `使用项目官方 Twitter 账号发布以下内容：`,
            `"Verifying @wagmi_fun claim: ${verificationCode}"`,
            `发布后，将推文链接粘贴到下方`
          ]
        };
      case "github":
        return {
          title: "GitHub 验证",
          icon: "🐙",
          steps: [
            `在项目 GitHub 仓库根目录创建文件：`,
            `.wagmi-verify`,
            `文件内容为：${verificationCode}`,
            `提交后，将仓库链接粘贴到下方`
          ]
        };
      case "website":
        return {
          title: "官网验证",
          icon: "🌐",
          steps: [
            `在项目官网添加以下 meta 标签：`,
            `<meta name="wagmi-verify" content="${verificationCode}">`,
            `或在根目录创建 .well-known/wagmi-verify.txt`,
            `内容为：${verificationCode}`,
            `完成后，将官网链接粘贴到下方`
          ]
        };
    }
  }

  // 渲染内容
  function renderContent() {
    switch (step) {
      case "loading":
        return (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#FF8C00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">加载中...</p>
            </div>
          </div>
        );
        
      case "info":
        return (
          <div className="max-w-2xl mx-auto">
            {/* 项目信息 */}
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
                  {project?.logo ? (
                    <Image
                      src={project.logo}
                      alt={project.name}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-gray-500">
                      {project?.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{project?.name}</h2>
                  <p className="text-[#FF8C00] font-mono">{project?.ticker}</p>
                  <p className="text-gray-400 text-sm mt-2">{project?.description}</p>
                </div>
              </div>
            </div>
            
            {/* 认领说明 */}
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">为什么要认领？</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FF8C00]/20 flex items-center justify-center flex-shrink-0">
                    <span>💰</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">获得 70% 持续分成</p>
                    <p className="text-gray-400 text-sm">代币每笔交易的税收，您将获得 70% 的分成</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FF8C00]/20 flex items-center justify-center flex-shrink-0">
                    <span>✓</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">官方认证标识</p>
                    <p className="text-gray-400 text-sm">认领后项目将显示官方认证徽章</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FF8C00]/20 flex items-center justify-center flex-shrink-0">
                    <span>👥</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">社区管理权限</p>
                    <p className="text-gray-400 text-sm">可以管理项目信息和社区</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 分成说明 */}
            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-400 mb-2">分成比例</h4>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#FF8C00]">70%</p>
                  <p className="text-xs text-gray-400">创作者</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">10%</p>
                  <p className="text-xs text-gray-400">伯乐</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">20%</p>
                  <p className="text-xs text-gray-400">平台</p>
                </div>
              </div>
            </div>
            
            {!isConnected ? (
              <button
                onClick={() => connect("phantom")}
                className="w-full py-4 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition"
              >
                连接钱包开始认领
              </button>
            ) : (
              <button
                onClick={() => setStep("verify")}
                className="w-full py-4 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition"
              >
                开始验证身份
              </button>
            )}
          </div>
        );
        
      case "verify":
        const guide = getVerificationGuide(selectedProofType);
        
        return (
          <div className="max-w-2xl mx-auto">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">验证身份</h2>
              
              {/* 验证码 */}
              <div className="bg-[#FF8C00]/10 border border-[#FF8C00]/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-400 mb-2">您的验证码</p>
                <div className="flex items-center justify-between">
                  <code className="text-[#FF8C00] font-mono text-sm break-all">{verificationCode}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(verificationCode)}
                    className="px-3 py-1 text-xs bg-white/10 rounded hover:bg-white/20 transition"
                  >
                    复制
                  </button>
                </div>
              </div>
              
              {/* 选择验证方式 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">选择验证方式</label>
                <div className="flex gap-2">
                  {(["twitter", "github", "website"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedProofType(type)}
                      className={`flex-1 py-3 rounded-lg border transition ${
                        selectedProofType === type
                          ? "border-[#FF8C00] bg-[#FF8C00]/10 text-[#FF8C00]"
                          : "border-white/10 text-gray-400 hover:border-white/30"
                      }`}
                    >
                      {type === "twitter" && "🐦 Twitter"}
                      {type === "github" && "🐙 GitHub"}
                      {type === "website" && "🌐 官网"}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 验证指南 */}
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <h4 className="flex items-center gap-2 font-medium text-white mb-3">
                  <span>{guide.icon}</span>
                  {guide.title}
                </h4>
                <ol className="space-y-2">
                  {guide.steps.map((step, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-gray-500">{i + 1}.</span>
                      <span className="break-all">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              
              {/* 添加验证链接 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">验证链接</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]"
                  />
                  <button
                    onClick={addProof}
                    disabled={!proofUrl}
                    className="px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition disabled:opacity-50"
                  >
                    添加
                  </button>
                </div>
              </div>
              
              {/* 已添加的验证 */}
              {proofs.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">已添加的验证</label>
                  <div className="space-y-2">
                    {proofs.map((proof, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <span>
                            {proof.type === "twitter" && "🐦"}
                            {proof.type === "github" && "🐙"}
                            {proof.type === "website" && "🌐"}
                          </span>
                          <span className="text-sm text-white truncate max-w-[300px]">{proof.url}</span>
                        </div>
                        <button
                          onClick={() => removeProof(i)}
                          className="text-gray-400 hover:text-[#EF4444] transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-4">
                <button
                  onClick={() => setStep("info")}
                  className="flex-1 py-4 border border-white/10 text-white font-bold rounded-lg hover:bg-white/5 transition"
                >
                  返回
                </button>
                <button
                  onClick={() => setStep("submit")}
                  disabled={proofs.length === 0}
                  className="flex-1 py-4 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一步
                </button>
              </div>
            </div>
          </div>
        );
        
      case "submit":
        return (
          <div className="max-w-lg mx-auto">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">填写接收信息</h2>
              
              {/* 钱包地址 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  收款钱包地址
                </label>
                <input
                  type="text"
                  value={creatorWallet || address || ""}
                  onChange={(e) => setCreatorWallet(e.target.value)}
                  placeholder="您的钱包地址"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]"
                />
                <p className="text-xs text-gray-500 mt-1">分成将发送到此地址</p>
              </div>
              
              {/* 联系邮箱 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  联系邮箱（可选）
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="team@project.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]"
                />
              </div>
              
              {/* 验证摘要 */}
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-2">验证摘要</h4>
                <div className="space-y-1">
                  {proofs.map((proof, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span>
                        {proof.type === "twitter" && "🐦"}
                        {proof.type === "github" && "🐙"}
                        {proof.type === "website" && "🌐"}
                      </span>
                      <span className="text-gray-300">{proof.type} 验证</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {error && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg p-4 mb-6">
                  <p className="text-[#EF4444] text-sm">{error}</p>
                </div>
              )}
              
              <div className="flex gap-4">
                <button
                  onClick={() => setStep("verify")}
                  className="flex-1 py-4 border border-white/10 text-white font-bold rounded-lg hover:bg-white/5 transition"
                >
                  返回
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !creatorWallet}
                  className="flex-1 py-4 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "提交中..." : "提交认领申请"}
                </button>
              </div>
            </div>
          </div>
        );
        
      case "pending":
        return (
          <div className="max-w-lg mx-auto py-10">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[#FF8C00]/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">⏳</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">认领申请已提交</h2>
              <p className="text-gray-400 mb-6">
                我们正在审核您的验证信息，通常需要 1-3 个工作日。审核通过后，您将开始收到分成。
              </p>
              <Link
                href={`/${ticker}`}
                className="inline-block px-6 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition"
              >
                返回项目页面
              </Link>
            </div>
          </div>
        );
        
      case "success":
        return (
          <div className="max-w-lg mx-auto py-10">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[#10B981]/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">已认领</h2>
              <p className="text-gray-400 mb-6">
                此项目已被官方认领。如果您是项目方但未认领，请联系我们。
              </p>
              <Link
                href={`/${ticker}`}
                className="inline-block px-6 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition"
              >
                查看项目
              </Link>
            </div>
          </div>
        );
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      
      <main 
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={project ? `/${ticker}` : "/"}
              className="text-gray-400 hover:text-white transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <h1 className="text-xl font-bold text-white">🎨 创作者认领</h1>
            {project && (
              <>
                <div className="h-6 w-px bg-white/10" />
                <span className="text-[#FF8C00] font-medium">{project.name}</span>
              </>
            )}
          </div>
        </header>
        
        {/* Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
