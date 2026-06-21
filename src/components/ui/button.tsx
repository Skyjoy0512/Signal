import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-950 text-white shadow-sm hover:bg-slate-800",
        outline: "border-slate-300 bg-white/80 text-slate-950 hover:bg-white",
        ghost: "border-transparent bg-transparent text-slate-700 hover:bg-slate-900/5",
      },
      size: {
        sm: "min-h-8 px-3 text-xs",
        default: "min-h-9 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
