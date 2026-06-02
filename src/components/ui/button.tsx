import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useButtonSync } from "@/lib/button-sync-manager"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Optional element ID for tracking */
  elementId?: string
  /** Custom action type for button sync */
  actionType?: string
  /** Custom target for button sync */
  target?: string
  /** Custom parameters for button sync */
  parameters?: Record<string, any>
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    elementId,
    actionType,
    target,
    parameters,
    ...props
  }, ref) => {
    const { handleButtonClick, updateContext } = useButtonSync()

    // Generate element ID if not provided
    const finalElementId = elementId || `btn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    // Update context with button info on mount
    React.useEffect(() => {
      updateContext({
        registeredButtons: [
          ...(JSON.parse(localStorage.getItem('registeredButtons') || '[]') as string[]),
          finalElementId
        ].filter((id, index, self) => self.indexOf(id) === index) // Remove duplicates
      })
      localStorage.setItem('registeredButtons', JSON.stringify([
        ...(JSON.parse(localStorage.getItem('registeredButtons') || '[]') as string[]),
        finalElementId
      ]))
    }, [finalElementId, updateContext])

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      // Call original onClick handler if provided
      if (props.onClick) {
        await Promise.resolve(props.onClick(event))
      }

      // Handle button sync
      try {
        await handleButtonClick(
          finalElementId,
          props.type || "button",
          typeof window !== 'undefined' ? window.location.pathname : "/",
          actionType || props.type || "button",
          target || "#",
          parameters || {},
          "user"
        )
      } catch (error) {
        console.error("Button sync error:", error)
      }
    }

    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
