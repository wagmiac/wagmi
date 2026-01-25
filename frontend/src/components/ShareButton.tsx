'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wagmi.ac';

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  revenue?: string;
  keyPoints?: string[];
  targetUsers?: string;
}

export default function ShareButton({ url, title, description, revenue, keyPoints, targetUsers }: ShareButtonProps) {
  const { locale } = useI18n();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // 使用配置的 BASE_URL，确保分享链接始终是生产环境地址
  const fullUrl = `${BASE_URL}${url}`;
  
  // 构建完整分享文本
  const buildFullShareText = () => {
    let text = title;
    
    // 添加内容摘要
    if (description) {
      text += `\n\n${description.slice(0, 150)}${description.length > 150 ? '...' : ''}`;
    }
    
    // 添加收入数据
    if (revenue) {
      text += `\n\n💰 ${locale === 'zh' ? '收入' : 'Revenue'}:\n${revenue}`;
    }
    
    // 添加关键点
    if (keyPoints && keyPoints.length > 0) {
      text += `\n\n🔑 ${locale === 'zh' ? '关键点' : 'Key Points'}:`;
      keyPoints.slice(0, 3).forEach(point => {
        text += `\n• ${point}`;
      });
    }
    
    // 添加目标受众
    if (targetUsers) {
      text += `\n\n🎯 ${locale === 'zh' ? '适合' : 'Target'}:\n${targetUsers}`;
    }
    
    // 添加 hashtag
    text += '\n\n#wagmi @wagmiac';
    
    return text;
  };
  
  const shareText = buildFullShareText();

  const shareToTwitter = () => {
    // Twitter 蓝V 没有字符限制，使用完整版
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`,
      '_blank',
      'width=550,height=420'
    );
    setShowMenu(false);
  };

  const shareToLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`,
      '_blank',
      'width=550,height=420'
    );
    setShowMenu(false);
  };

  const shareToTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`,
      '_blank',
      'width=550,height=420'
    );
    setShowMenu(false);
  };

  const shareToWeibo = () => {
    window.open(
      `https://service.weibo.com/share/share.php?url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent(shareText)}`,
      '_blank',
      'width=550,height=420'
    );
    setShowMenu(false);
  };

  const copyLink = async () => {
    try {
      // 复制时包含完整文本和链接
      const copyText = `${shareText}\n\n${fullUrl}`;
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    setShowMenu(false);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: fullUrl,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1 text-gray-500 hover:text-[#00E5FF] transition text-sm"
        title="分享"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span>{locale === 'zh' ? '分享' : 'Share'}</span>
      </button>

      {showMenu && (
        <>
          {/* 点击遮罩关闭 */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          
          {/* 分享菜单 */}
          <div className="absolute bottom-full left-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 py-2 min-w-[160px]">
            {/* Native Share (if supported) */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={nativeShare}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition flex items-center gap-3"
              >
                <span className="text-lg">📤</span>
                {locale === 'zh' ? '分享到...' : 'Share to...'}
              </button>
            )}
            
            <button
              onClick={shareToTwitter}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition flex items-center gap-3"
            >
              <span className="text-lg">𝕏</span>
              X (Twitter)
            </button>
            
            <button
              onClick={shareToLinkedIn}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition flex items-center gap-3"
            >
              <span className="text-lg">💼</span>
              LinkedIn
            </button>
            
            <button
              onClick={shareToTelegram}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition flex items-center gap-3"
            >
              <span className="text-lg">✈️</span>
              Telegram
            </button>
            
            <button
              onClick={shareToWeibo}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition flex items-center gap-3"
            >
              <span className="text-lg">🌐</span>
              {locale === 'zh' ? '微博' : 'Weibo'}
            </button>
            
            <hr className="border-white/10 my-1" />
            
            <button
              onClick={copyLink}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition flex items-center gap-3"
            >
              <span className="text-lg">{copied ? '✓' : '🔗'}</span>
              {copied ? (locale === 'zh' ? '已复制!' : 'Copied!') : (locale === 'zh' ? '复制链接' : 'Copy Link')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
