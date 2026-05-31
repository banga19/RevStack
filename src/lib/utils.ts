import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-200",
    "in-progress": "bg-blue-500/10 text-blue-600 border-blue-200",
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    cancelled: "bg-red-500/10 text-red-600 border-red-200",
    draft: "bg-gray-500/10 text-gray-600 border-gray-200",
    paused: "bg-amber-500/10 text-amber-600 border-amber-200",
    lead: "bg-blue-500/10 text-blue-600 border-blue-200",
    qualified: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
    proposal: "bg-purple-500/10 text-purple-600 border-purple-200",
    onboarding: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
    done: "bg-gray-500/10 text-gray-600 border-gray-200",
    idea: "bg-gray-500/10 text-gray-600 border-gray-200",
    drafting: "bg-amber-500/10 text-amber-600 border-amber-200",
    scheduled: "bg-blue-500/10 text-blue-600 border-blue-200",
    published: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  }
  return colors[status] || "bg-gray-500/10 text-gray-600 border-gray-200"
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function daysBetween(date1: Date, date2: Date): number {
  const diff = Math.abs(date2.getTime() - date1.getTime())
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
