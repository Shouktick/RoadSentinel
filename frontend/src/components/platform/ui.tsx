"use client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { healthSchema, metadataSchema } from "@/lib/contracts";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api("health", healthSchema),
    refetchInterval: 60000,
  });
}
export function useMetadata() {
  return useQuery({
    queryKey: ["metadata"],
    queryFn: () => api("model/metadata", metadataSchema),
  });
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {children}
    </header>
  );
}
export function Panel({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Status({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <span className={`status ${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}
export function Loading({
  message = "Reading live service data…",
}: {
  message?: string;
}) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={21} />
      <span>{message}</span>
    </div>
  );
}
export function Failure({
  error,
  retry,
}: {
  error: Error;
  retry?: () => void;
}) {
  return (
    <div className="notice error" role="alert">
      <AlertTriangle size={20} />
      <div>
        <strong>Service unavailable</strong>
        <p>{error.message}</p>
        {retry && (
          <button className="button small" onClick={retry}>
            <RefreshCw size={14} /> Retry connection
          </button>
        )}
      </div>
    </div>
  );
}
export function Limitation({ children }: { children: React.ReactNode }) {
  return (
    <div className="notice">
      <AlertTriangle size={18} />
      <div>{children}</div>
    </div>
  );
}
export function Empty({
  title,
  children,
  href,
  action,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-line" />
      <h3>{title}</h3>
      <p>{children}</p>
      {href && (
        <Link className="button" href={href}>
          {action}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function Stat({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        {label}
        {icon}
      </div>
      <div className="stat-value">{value}</div>
      <p>{note}</p>
    </div>
  );
}
