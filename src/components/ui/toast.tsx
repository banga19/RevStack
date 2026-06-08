"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cn } from "@/lib/utils"
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react"

const ToastProvider = ToastPrimitives.Provider
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:max-w-[420px] sm:flex-col gap-2",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

type ToastVariant = "default" | "success" | "error" | "warning" | "info" | "loading"

const variantStyles: Record<ToastVariant, { root: string; icon: React.ReactNode; iconBg: string }> = {
  default: {
    root: "border-border bg-background",
    icon: <Info className="h-4 w-4 text-muted-foreground" />,
    iconBg: "bg-muted",
  },
  success: {
    root: "border-emerald-500/30 bg-emerald-500/5",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    iconBg: "bg-emerald-500/10",
  },
  error: {
    root: "border-red-500/30 bg-red-500/5",
    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
    iconBg: "bg-red-500/10",
  },
  warning: {
    root: "border-amber-500/30 bg-amber-500/5",
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    iconBg: "bg-amber-500/10",
  },
  info: {
    root: "border-blue-500/30 bg-blue-500/5",
    icon: <Info className="h-4 w-4 text-blue-500" />,
    iconBg: "bg-blue-500/10",
  },
  loading: {
    root: "border-primary/30 bg-primary/5",
    icon: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
    iconBg: "bg-primary/10",
  },
}

interface ToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> {
  variant?: ToastVariant
  title?: string
  description?: string
  onDismiss?: () => void
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastProps
>(({ className, variant = "default", title, description, onDismiss, children, ...props }, ref) => {
  const styles = variantStyles[variant]

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out",
        "data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-right-full",
        "data-[state=closed]:slide-out-to-right-full data-[swipe=cancel]:translate-x-0",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
        styles.root,
        className
      )}
      {...props}
    >
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", styles.iconBg)}>
        {styles.icon}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        {title && (
          <ToastPrimitives.Title className="text-sm font-semibold">
            {title}
          </ToastPrimitives.Title>
        )}
        {description && (
          <ToastPrimitives.Description className="text-xs text-muted-foreground mt-0.5">
            {description}
          </ToastPrimitives.Description>
        )}
        {children}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </ToastPrimitives.Root>
  )
})
Toast.displayName = "Toast"

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-xs font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

export type { ToastVariant }
export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastAction,
  ToastClose,
}
