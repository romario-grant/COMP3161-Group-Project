import { useCallback, useRef } from "react";
import type { ReactNode } from "react";

export default function GlassIcon({
  children,
  tone = "info",
  size = "2rem",
  className = "",
}: {
  children: ReactNode;
  tone?: "safe" | "warn" | "blue" | "info";
  size?: string;
  className?: string;
}) {
  const specularRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (specularRef.current) {
      specularRef.current.style.background = `radial-gradient(
        circle at ${x}px ${y}px,
        rgba(255,255,255,0.22) 0%,
        rgba(255,255,255,0.07) 40%,
        transparent 70%
      )`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (specularRef.current) {
      specularRef.current.style.background = "";
    }
  }, []);

  return (
    <div
      className={`glass-icon ${tone} ${className}`}
      style={{ width: size, height: size }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="glass-filter" />
      <div className="glass-overlay" />
      <div className="glass-specular" ref={specularRef} />
      <div className="glass-icon-content">{children}</div>
    </div>
  );
}
