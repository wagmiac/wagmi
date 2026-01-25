'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import GlobalLoginModal from './GlobalLoginModal';

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  return (
    <AuthProvider>
      {children}
      <GlobalLoginModal />
    </AuthProvider>
  );
}
