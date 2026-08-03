import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full",
    "border border-transparent font-semibold text-sm transition-all duration-[var(--duration-fast)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 text-white shadow-[0_16px_30px_-16px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-18px_rgba(15,23,42,0.45)] active:translate-y-0",
        accent:
          "bg-gradient-to-r from-slate-600 via-slate-500 to-slate-400 text-white shadow-[0_16px_30px_-16px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-18px_rgba(15,23,42,0.4)] active:translate-y-0",
        outline:
          "border border-border/80 bg-white/80 text-text shadow-[0_10px_20px_-18px_rgba(16,33,58,0.4)] hover:-translate-y-0.5 hover:border-border hover:bg-white active:translate-y-0",
        ghost: "bg-transparent text-text hover:bg-background-secondary",
        danger: "bg-danger text-danger-foreground hover:opacity-90",
        link: "bg-transparent text-text underline-offset-4 hover:underline p-0 h-auto shadow-none border-0",
      },
      size: {
        sm: "h-11 px-4 text-sm",
        md: "h-12 px-6 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "h-11 w-11 shrink-0 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
