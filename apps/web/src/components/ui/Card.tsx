import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  emphasis?: boolean;
}

export function Card({ children, className, emphasis = false, ...props }: CardProps) {
  const classes = ["card", emphasis ? "card-emphasis" : "", className].filter(Boolean).join(" ");

  return (
    <section className={classes} {...props}>
      {children}
    </section>
  );
}
