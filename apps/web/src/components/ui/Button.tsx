import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function Button({ className, type = "button", variant = "primary", ...props }: ButtonProps) {
  const classes = ["button", `button-${variant}`, className].filter(Boolean).join(" ");

  return <button className={classes} type={type} {...props} />;
}
