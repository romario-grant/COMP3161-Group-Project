import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";

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
  dark,
  toggleDark,
}: {
  active: string;
  setActive: (value: string) => void;
  dark: boolean;
  toggleDark: () => void;
}) {
  const [open, setOpen] = useState(false);
  const navigate = (value: string) => {
    setActive(value);
    setOpen(false);
  };

  return (
    <>
      <nav className="navbar desktop-nav">
        <button className="brand" onClick={() => navigate("dashboard")}>
          CourseSense
        </button>
        <div className="nav-links">
          {links.map(([id, label]) => (
            <button key={id} onClick={() => navigate(id)} className={active === id ? "active" : ""}>
              {label}
            </button>
          ))}
        </div>
        <div className="nav-actions">
          <button className="ghost-button" onClick={toggleDark} aria-label="Toggle theme">
            {dark ? <Sun size={15} /> : <Moon size={15} />}
            {dark ? "Light Mode" : "Dark Mode"}
          </button>
          <button className="ghost-button">
            Sign Out <LogOut size={14} />
          </button>
        </div>
      </nav>

      <nav className="mobile-nav">
        <button className="brand" onClick={() => navigate("dashboard")}>
          CourseSense
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
            <button className="ghost-button mobile-theme" onClick={toggleDark}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
              {dark ? "Light Mode" : "Dark Mode"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
