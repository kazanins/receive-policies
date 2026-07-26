"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-border-default bg-bg-primary p-6 shadow-[var(--elevation-100)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="ts-h2 text-text-primary">{title}</h2>
        {subtitle && (
          <p className="ts-body-sm mt-1 text-text-secondary">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "base" | "lg";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "base",
      loading = false,
      disabled,
      className = "",
      children,
      ...rest
    },
    ref,
  ) {
    const sizes: Record<string, string> = {
      sm: "h-8 px-3 text-[12px]",
      base: "h-10 px-4 text-[14px]",
      lg: "h-11 px-4 text-[14px]",
    };
    const variants: Record<string, string> = {
      primary:
        "bg-bg-inverse text-text-inverse hover:shadow-[var(--elevation-300)]",
      secondary:
        "bg-bg-action-secondary text-text-primary hover:shadow-[var(--elevation-300)]",
      outline:
        "bg-transparent border border-border-default text-text-primary hover:bg-bg-secondary",
      ghost: "bg-transparent text-text-primary hover:bg-bg-action-secondary",
      danger: "bg-bg-danger text-text-on-color hover:bg-bg-danger-hover",
    };
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-[box-shadow,background-color] duration-[var(--duration-normal)] focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`}
        {...rest}
      >
        {loading && <Spinner size={14} />}
        {children}
      </button>
    );
  },
);

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning" | "informative";
}) {
  const tones: Record<string, string> = {
    neutral:
      "bg-bg-secondary text-text-secondary border-border-default",
    success: "bg-bg-success text-text-success border-transparent",
    danger: "bg-bg-danger text-text-on-color border-transparent",
    warning: "bg-bg-warning text-text-primary border-transparent",
    informative: "bg-bg-informative text-text-link border-transparent",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[var(--radius-sm)] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-block animate-spin rounded-full border-2 border-current border-r-transparent"
      role="status"
      aria-label="loading"
    />
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      {icon && <div className="text-icon-tertiary">{icon}</div>}
      <p className="ts-body-strong text-text-primary">{title}</p>
      {children && (
        <p className="ts-body-sm max-w-sm text-text-secondary">{children}</p>
      )}
    </div>
  );
}
