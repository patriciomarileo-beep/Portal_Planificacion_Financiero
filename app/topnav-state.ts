import type { PortalMenu } from "./menu-access";

/**
 * Keeps the compressed navigation as an exclusive accordion: selecting a new
 * module replaces the currently expanded one, while selecting the same module
 * again collapses it.
 */
export function nextCompressedTopnavGroup(
  current: PortalMenu | null,
  selected: PortalMenu,
): PortalMenu | null {
  return current === selected ? null : selected;
}
