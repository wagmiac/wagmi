import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { NotificationProvider, AnnouncementBanner } from "@/components/notifications";
import AuthWrapper from "@/components/AuthWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wagmi.fun';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "WAGMI - AI 时代超级个体创业平台",
    template: "%s | WAGMI"
  },
  description: "WAGMI 是 AI 时代超级个体的创业平台，提供创业洞察、想法评估、AI导师等工具。发现成功案例，启发你的创业灵感。We're All Gonna Make It!",
  keywords: ["WAGMI", "超级个体", "AI创业", "独立开发", "Solo Founder", "创业洞察", "收入案例", "MRR", "SaaS", "indie hacker"],
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
    siteName: "WAGMI",
    title: "WAGMI - AI 时代超级个体创业平台",
    description: "发现 AI 时代超级个体的创业故事、收入案例和可复制的方法论。",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-white`}
      >
        <AuthWrapper>
          <I18nProvider>
            <NotificationProvider>
              <AnnouncementBanner />
              {children}
            </NotificationProvider>
          </I18nProvider>
        </AuthWrapper>
      </body>
    </html>
  );
}
