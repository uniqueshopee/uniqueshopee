import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leadingIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, leadingIcon, ...props }, ref) => {
    return (
      <span className="relative block">
        {leadingIcon ? <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted">{leadingIcon}</span> : null}
        <input
          type={type}
          ref={ref}
          aria-invalid={error || undefined}
          className={cn(
            "flex h-11 w-full rounded-[var(--radius-md)] border bg-background px-3.5 text-sm font-medium text-text",
            leadingIcon && "pl-9",
            "border-border placeholder:text-muted placeholder:font-normal",
            "transition-colors duration-[var(--duration-fast)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger focus-visible:ring-danger",
            className,
          )}
          {...props}
        />
      </span>
    );
  },
);
Input.displayName = "Input";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("mb-1.5 block text-sm font-semibold text-text", className)}
      {...props}
    />
  ),
);
Label.displayName = "Label";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

/** Label + input/control + error or hint text, consistently spaced. */
function FormField({ label, htmlFor, error, hint, children }: FormFieldProps) {
  return (
    <div className="w-full">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs font-medium text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export { Input, Label, FormField };
