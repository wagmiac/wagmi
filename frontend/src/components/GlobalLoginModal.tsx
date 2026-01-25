'use client';

import { useAuth } from '@/lib/auth-context';
import LoginModal from './LoginModal';

export default function GlobalLoginModal() {
  const { isLoginOpen, closeLogin } = useAuth();
  
  return <LoginModal isOpen={isLoginOpen} onClose={closeLogin} />;
}
