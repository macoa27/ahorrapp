import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "google";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:opacity-90",
  secondary: "border border-white/10 bg-base-800 text-white hover:bg-white/5",
  ghost: "bg-transparent text-zinc-300 hover:bg-white/5",
  google: "bg-white text-zinc-900 hover:bg-zinc-100",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export function Input({
  id,
  label,
  error,
  hint,
  prefix,
  suffix,
  className,
  ...props
}: InputProps) {
  const fieldId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={fieldId} className="text-xs text-zinc-400">
          {label}
        </label>
      ) : null}
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-base-800 px-3 py-2.5 transition-colors",
          error ? "border-danger/60" : "border-white/10 focus-within:border-brand/60"
        )}
      >
        {prefix ? <span className="text-zinc-500">{prefix}</span> : null}
        <input
          id={fieldId}
          className={cn(
            "w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none",
            className
          )}
          {...props}
        />
        {suffix ? <span className="text-zinc-500">{suffix}</span> : null}
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: boolean;
}

export function Card({ accent = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-base-700 p-4",
        accent ? "border-brand/30" : "border-white/10",
        props.onClick ? "cursor-pointer transition-colors hover:border-white/20" : "",
        className
      )}
      {...props}
    />
  );
}

type BadgeVariant =
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "income"
  | "email"
  | "whatsapp"
  | "manual"
  | "csv";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeVariants: Record<BadgeVariant, string> = {
  brand: "bg-brand/20 text-brand",
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning",
  danger: "bg-danger/20 text-danger",
  income: "bg-income/20 text-income",
  email: "bg-income/20 text-income",
  whatsapp: "bg-whatsapp/20 text-whatsapp",
  manual: "bg-brand/20 text-brand",
  csv: "bg-warning/20 text-warning",
};

export function Badge({ variant = "brand", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-white/10" />
      {label ? <span className="text-xs text-zinc-500">{label}</span> : null}
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-5 w-5 border-2",
    lg: "h-8 w-8 border-[3px]",
  };

  return <span className={cn("inline-block animate-spin rounded-full border-white/30 border-t-white", sizes[size])} />;
}

export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const sizes = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
  };

  return (
    <div className={cn("inline-flex items-center justify-center rounded-full bg-brand font-semibold text-white", sizes[size])}>
      {initials || "A"}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: "brand" | "success" | "warning" | "danger" | "income";
}

const progressColors: Record<NonNullable<ProgressBarProps["color"]>, string> = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  income: "bg-income",
};

export function ProgressBar({ value, max = 100, color = "brand" }: ProgressBarProps) {
  const ratio = max > 0 ? value / max : 0;
  const percentage = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  const currentColor = ratio >= 1 ? "danger" : color;

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={cn("h-full rounded-full transition-all duration-300", progressColors[currentColor])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { box: "h-7 w-7 rounded-lg text-sm", text: "text-sm" },
    md: { box: "h-9 w-9 rounded-xl text-base", text: "text-base" },
    lg: { box: "h-12 w-12 rounded-2xl text-xl", text: "text-2xl" },
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div className={cn("inline-flex items-center justify-center bg-brand text-white", sizes[size].box)}>💰</div>
      <span className={cn("font-bold tracking-tight text-white", sizes[size].text)}>Ahorrapp</span>
    </div>
  );
}