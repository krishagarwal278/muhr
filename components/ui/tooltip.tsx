"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={250} skipDelayDuration={100}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function SimpleTooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          className="z-overlay max-w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-white/15 bg-neutral-900 px-2.5 py-2 text-xs leading-snug text-zinc-100 shadow-xl"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-neutral-900" width={10} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
