import { useCallback, useRef } from "react";
import type { ReactNode } from "react";

export default function GlassButton({
  children,
  onClick,
  type = "button",
  variant = "default",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "default" | "primary";
  disabled?: boolean;
  className?: string;
}) {
  const specularRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (specularRef.current) {
      specularRef.current.style.background = `radial-gradient(
        circle at ${x}px ${y}px,
        rgba(255,255,255,0.18) 0%,
        rgba(255,255,255,0.06) 35%,
        transparent 65%
      )`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (specularRef.current) {
      specularRef.current.style.background = "";
    }
  }, []);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`glass-btn ${variant === "primary" ? "glass-btn-primary" : ""} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="glass-filter" />
      <div className="glass-overlay" />
      <div className="glass-specular" ref={specularRef} />
      <span className="glass-btn-content">{children}</span>
    </button>
  );
}
