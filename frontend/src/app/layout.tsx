import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { NotificationProvider, AnnouncementBanner } from "@/components/notifications";
import { NotificationProvider as IMONotificationProvider } from "@/components/imo/NotificationContext";
import AuthWrapper from "@/components/AuthWrapper";
import { MultiWalletProvider } from "@/lib/wallet/MultiWalletProvider";
import { SidebarProvider } from "@/components/imo";
import { ToastProvider } from "@/components/ui/Toast";

// 使用 Inter 字体，替代 Geist（更稳定的 CDN）
const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // 防止字体加载阻塞渲染
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wagmi.ac';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "WAGMI IMO - 社区驱动的 Meme 币发射平台",
    template: "%s | WAGMI IMO"
  },
  description: "WAGMI IMO 是社区驱动的 Meme 币发射平台。发掘有潜力的项目，通过竞拍获得代币发射权，在 pump.fun、trends.fun 等平台发射 Meme 币。We're All Gonna Make It!",
  keywords: ["WAGMI", "IMO", "Initial Meme Offering", "Meme币", "Solana", "BSC", "pump.fun", "trends.fun", "bags.fm", "flap.sh", "代币发射", "竞拍"],
  authors: [{ name: "WAGMI Team" }],
  creator: "WAGMI",
  alternates: {
    canonical: BASE_URL,
    languages: {
      'zh-CN': `${BASE_URL}`,
      'en': `${BASE_URL}?lang=en`,
    },
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    alternateLocale: "en_US",
    url: BASE_URL,
    siteName: "WAGMI IMO",
    title: "WAGMI IMO - 社区驱动的 Meme 币发射平台",
    description: "发掘项目，竞拍发射权，在 Solana/BSC 上发射 Meme 币。社区可以给任何项目发 Meme 币！",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WAGMI - We're All Gonna Make It"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    site: "@nicekate99",
    creator: "@nicekate99",
    title: "WAGMI - AI 时代超级个体创业平台",
    description: "发现 AI 时代超级个体的创业故事、收入案例和可复制的方法论。",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // 添加搜索引擎验证码（需要时填入）
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/waggy.png", type: "image/png" },
    ],
    apple: "/waggy.png",
    shortcut: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${inter.variable} antialiased bg-[#0a0a0a] text-white`}
      >
        <AuthWrapper>
          <MultiWalletProvider>
            <SidebarProvider>
              <I18nProvider>
                <NotificationProvider>
                  <IMONotificationProvider>
                    <ToastProvider>
                      <AnnouncementBanner />
                      {children}
                    </ToastProvider>
                  </IMONotificationProvider>
                </NotificationProvider>
              </I18nProvider>
            </SidebarProvider>
          </MultiWalletProvider>
        </AuthWrapper>
      </body>
    </html>
  );
}
