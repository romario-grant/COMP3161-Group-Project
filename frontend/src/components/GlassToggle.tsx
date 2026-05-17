import { useCallback, useRef } from "react";

export default function GlassToggle({
  checked,
  onChange,
  label,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
  children?: React.ReactNode;
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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="glass-toggle-wrap ghost-button"
      style={{ padding: "0.25rem 0.5rem", minHeight: "unset" }}
    >
      <div
        className={`glass-toggle-track ${checked ? "is-on" : ""}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="glass-filter" />
        <div className="glass-overlay" />
        <div className="glass-specular" ref={specularRef} />
        <div className="glass-toggle-thumb">
          <div className="glass-filter" />
          <div className="glass-overlay" />
          <div className="glass-specular" />
        </div>
      </div>
      {children && <span style={{ position: "relative", zIndex: 4 }}>{children}</span>}
    </button>
  );
}
