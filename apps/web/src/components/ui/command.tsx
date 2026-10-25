import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import type * as React from 'react'
import { cn } from '~/lib/utils'

// The combobox primitive behind the plan popover's task search. cmdk owns the
// keyboard model and the active-descendant wiring; results arrive already
// filtered and ranked by Convex, so `shouldFilter` is off at the call site.
export function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn('bg-popover text-popover-foreground flex w-full flex-col', className)}
      {...props}
    />
  )
}

export function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-8 items-center gap-2 border-b border-white/6 px-2"
    >
      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'placeholder:text-muted-foreground flex h-8 w-full bg-transparent text-xs outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  )
}

export function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('max-h-48 overflow-y-auto overflow-x-hidden py-1', className)}
      {...props}
    />
  )
}

export function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn('text-caption py-3 text-center text-muted-foreground', className)}
      {...props}
    />
  )
}

export function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        'data-[selected=true]:bg-white/[0.04] flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-xs text-foreground/90 outline-hidden select-none',
        className
      )}
      {...props}
    />
  )
}
