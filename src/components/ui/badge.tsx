import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold leading-none backdrop-blur-sm",
  {
    variants: {
      variant: {
        neutral: "border-border/70 bg-white/70 text-text shadow-[0_8px_20px_-18px_rgba(16,33,58,0.45)]",
        accent: "border-border/70 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 text-text",
        success: "border-success/15 bg-success/10 text-success",
        warning: "border-warning/20 bg-warning/15 text-warning",
        danger: "border-danger/15 bg-danger/10 text-danger",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
