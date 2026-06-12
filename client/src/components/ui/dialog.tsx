"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { OverlayContext } from "@/components/ui/overlay-context"
import { useEscapeKey } from "@/hooks/use-escape-key"
import { cn } from "@/lib/utils"

function Dialog({
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const restoreFocusRef = React.useRef<HTMLElement | null>(null)

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        restoreFocusRef.current = document.activeElement as HTMLElement | null
      }
      onOpenChange?.(nextOpen)
    },
    [onOpenChange],
  )

  const contextValue = React.useMemo(
    () => ({ onOpenChange: handleOpenChange, restoreFocusRef }),
    [handleOpenChange],
  )

  return (
    <OverlayContext.Provider value={contextValue}>
      <DialogPrimitive.Root
        data-slot="dialog"
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </OverlayContext.Provider>
  )
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onEscapeKeyDown,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const { onOpenChange, restoreFocusRef } = React.useContext(OverlayContext)

  const dismiss = React.useCallback(() => {
    onOpenChange?.(false)
  }, [onOpenChange])

  useEscapeKey(dismiss, Boolean(onOpenChange))

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onEscapeKeyDown={(event) => {
          onEscapeKeyDown?.(event)
          if (!event.defaultPrevented) {
            dismiss()
          }
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)
          if (!event.defaultPrevented && restoreFocusRef.current) {
            event.preventDefault()
            restoreFocusRef.current.focus()
          }
        }}
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-semibold leading-none", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
