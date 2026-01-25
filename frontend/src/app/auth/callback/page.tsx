import { Suspense } from 'react';
import AuthCallbackClient from './AuthCallbackClient';

export const metadata = {
  title: 'Login - WAGMI',
  robots: 'noindex',
};

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#00D395] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <AuthCallbackClient />
    </Suspense>
  );
}
