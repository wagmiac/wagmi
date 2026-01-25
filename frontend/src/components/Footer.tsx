"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();
  
  const footerLinks = [
    { label: t("nav.whitepaper"), href: "/whitepaper" },
    { label: t("nav.faq"), href: "/faq" },
  ];
  
  const socialLinks = [
    { label: "𝕏 Twitter", href: "https://x.com/wagmiac", icon: "𝕏" },
    { label: "Telegram", href: "https://t.me/wagmiac", icon: "✈️" },
  ];

  return (
    <footer className="py-16 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/waggy.png" alt="Waggy" width={40} height={40} className="rounded-full" />
              <span className="text-2xl font-bold gradient-text">WAGMI</span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              {t("footer.description")}
            </p>
            <div className="flex gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition"
                  title={link.label}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t("footer.platform")}</h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Tools */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t("footer.tools")}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/idea-evaluator" className="text-gray-400 hover:text-white transition">
                  {t("nav.ideaEvaluator")}
                </Link>
              </li>
              <li>
                <Link href="/ai-mentor" className="text-gray-400 hover:text-white transition">
                  {t("nav.aiMentor")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            {t("footer.copyright")}
          </p>
          <p className="text-gray-600 text-xs">
            {t("footer.builtWith")}
          </p>
        </div>
      </div>
    </footer>
  );
}
