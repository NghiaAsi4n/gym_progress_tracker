import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingLabel?: string;
  variant?: "primary" | "secondary";
}

export function Button({
  children,
  className,
  disabled,
  isLoading = false,
  loadingLabel = "Loading…",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const classes = ["button", `button-${variant}`, className].filter(Boolean).join(" ");

  return (
    <button
      aria-busy={isLoading || undefined}
      className={classes}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? loadingLabel : children}
    </button>
  );
}
