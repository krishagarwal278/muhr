import { cva } from "class-variance-authority";

/** Top-of-page chrome: title row + optional actions (dashboard-style). */
export const appPageHeaderVariants = cva(
  "flex flex-col gap-5 border-b border-neutral-200/80 pb-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8",
);

export const appPageTitleVariants = cva(
  "text-2xl font-semibold tracking-tight text-neutral-950",
);
