import { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { motion } from "framer-motion";
import { SilentErrorBoundary } from "@/components/ErrorBoundary";

interface SiteLayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}

export function SiteLayout({ children, hideFooter = false }: SiteLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <motion.main 
        className="flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.main>
      {!hideFooter && (
        <SilentErrorBoundary>
          <SiteFooter />
        </SilentErrorBoundary>
      )}
    </div>
  );
}
