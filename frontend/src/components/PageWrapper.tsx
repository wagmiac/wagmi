"use client";

import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

interface PageWrapperProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

export default function PageWrapper({ children, showFooter = true }: PageWrapperProps) {
  return (
    <>
      <Navigation />
      {children}
      {showFooter && <Footer />}
    </>
  );
}
