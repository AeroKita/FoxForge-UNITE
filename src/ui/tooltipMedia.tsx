import { createContext, useContext, type ReactElement, type ReactNode } from "react";

const TooltipMediaContext = createContext(false);

/** True only while this tooltip's content is actually on screen. */
export function TooltipMediaProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return <TooltipMediaContext.Provider value={active}>{children}</TooltipMediaContext.Provider>;
}

export function useTooltipMediaActive(): boolean {
  return useContext(TooltipMediaContext);
}

/** Wrap tooltip content so its clip plays. */
export function activeTooltipMedia(node: ReactNode): ReactElement {
  return <TooltipMediaProvider active>{node}</TooltipMediaProvider>;
}
