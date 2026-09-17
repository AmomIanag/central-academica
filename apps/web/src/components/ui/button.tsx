import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-accent text-white hover:bg-accent-hover",
        variant === "secondary" &&
          "border border-border bg-surface text-foreground hover:bg-surface-hover",
        variant === "ghost" && "text-muted hover:bg-surface-hover hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
