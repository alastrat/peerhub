import { forwardRef } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
  external?: boolean;
}

const buttonVariants = {
  primary: "kultiva-btn-primary",
  secondary: "kultiva-btn-secondary",
  outline: "kultiva-btn-outline",
  ghost:
    "bg-transparent hover:bg-kultiva-sand text-kultiva-charcoal border-transparent",
};

const buttonSizes = {
  sm: "text-sm py-2 px-4",
  md: "text-base py-3 px-6",
  lg: "text-lg py-4 px-8",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      href,
      external,
      children,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      "kultiva-btn",
      buttonVariants[variant],
      buttonSizes[size],
      className
    );

    if (href) {
      if (external) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={classes}
          >
            {children}
          </a>
        );
      }
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
