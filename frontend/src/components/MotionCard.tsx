import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function MotionCard({
  children,
  className = "",
  delay = 0,
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={hover ? { y: -3, transition: { duration: 0.2 } } : undefined}
      className={`motion-card ${className}`}
    >
      {children}
    </motion.div>
  );
}
