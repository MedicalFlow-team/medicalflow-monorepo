"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

export function AuthTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid">
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={pathname}
          className="[grid-area:1/1]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
