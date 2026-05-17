import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

const links = [
  ["dashboard", "Dashboard"],
  ["courses", "Courses"],
  ["calendar", "Calendar"],
  ["forums", "Forums"],
  ["content", "Content"],
  ["assignments", "Assignments"],
  ["reports", "Reports"],
] as const;

export default function Navbar({
  active,
  setActive,
}: {
  active: string;
  setActive: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const specularRef = useRef<HTMLDivElement>(null);

  const navigate = (value: string) => {
    setActive(value);
    setOpen(false);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (specularRef.current) {
      specularRef.current.style.background = `radial-gradient(
        circle at ${x}px ${y}px,
        rgba(255,255,255,0.10) 0%,
        rgba(255,255,255,0.03) 40%,
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
    <>
      <nav
        className="navbar desktop-nav glass-nav"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Glass layers */}
        <div className="glass-filter" />
        <div className="glass-overlay" />
        <div className="glass-specular" ref={specularRef} />

        {/* Nav content sits above glass layers via glass-nav-inner */}
        <div className="glass-nav-inner">
          <button className="brand" onClick={() => navigate("dashboard")}>
            <img src="/sle-logo.png" alt="SLE" style={{ height: "2rem", width: "auto", display: "inline-block", verticalAlign: "middle", marginRight: "0.5rem" }} />
            SLE
          </button>
          <div className="nav-links">
            {links.map(([id, label]) => (
              <button key={id} onClick={() => navigate(id)} className={active === id ? "active" : ""}>
                {label}
              </button>
            ))}
          </div>
          <div className="nav-actions">
            <button className="ghost-button">
              Sign Out <LogOut size={14} />
            </button>
          </div>
        </div>
      </nav>

      <nav className="mobile-nav">
        <button className="brand" onClick={() => navigate("dashboard")}>
          <img src="/sle-logo.png" alt="SLE" style={{ height: "1.8rem", width: "auto", display: "inline-block", verticalAlign: "middle", marginRight: "0.4rem" }} />
          SLE
        </button>
        <button className="icon-button" onClick={() => setOpen((value) => !value)} aria-label="Open menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {links.map(([id, label], index) => (
              <motion.button
                key={id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(id)}
                className={active === id ? "active" : ""}
              >
                {label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
