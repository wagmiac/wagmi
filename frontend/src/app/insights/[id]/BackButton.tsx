'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function BackButton() {
  const { locale } = useI18n();
  
  return (
    <Link
      href="/insights"
      className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-8"
    >
      ← {locale === 'zh' ? '返回洞察列表' : 'Back to Insights'}
    </Link>
  );
}
