import type { ReactNode } from "react";

type Variant = "safe" | "warn" | "danger" | "info" | "blue";

const classes: Record<Variant, string> = {
  safe: "badge badge-safe",
  warn: "badge badge-warn",
  danger: "badge badge-danger",
  info: "badge badge-info",
  blue: "badge badge-blue",
};

export default function Badge({ variant, children }: { variant: Variant; children: ReactNode }) {
  return <span className={classes[variant]}>{children}</span>;
}
