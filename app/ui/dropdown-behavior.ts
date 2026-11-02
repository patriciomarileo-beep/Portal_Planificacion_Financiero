const selector = "details[data-dropdown]";

export function installDropdownBehavior(root: Document) {
  const openDropdowns = () => Array.from(root.querySelectorAll<HTMLDetailsElement>(`${selector}[open]`));

  const closeOutside = (event: Event) => {
    if (!(event.target instanceof Node)) return;
    for (const dropdown of openDropdowns()) {
      if (!dropdown.contains(event.target)) dropdown.open = false;
    }
  };

  const closeOthers = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLDetailsElement) || !target.matches(selector) || !target.open) return;
    for (const dropdown of openDropdowns()) {
      if (dropdown !== target) dropdown.open = false;
    }
  };

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    const opened = openDropdowns();
    const focused = opened.find(dropdown => dropdown.contains(root.activeElement));
    for (const dropdown of opened) dropdown.open = false;
    focused?.querySelector<HTMLElement>(":scope > summary")?.focus();
  };

  root.addEventListener("pointerdown", closeOutside, true);
  root.addEventListener("focusin", closeOutside, true);
  root.addEventListener("toggle", closeOthers, true);
  root.addEventListener("keydown", closeOnEscape, true);
  return () => {
    root.removeEventListener("pointerdown", closeOutside, true);
    root.removeEventListener("focusin", closeOutside, true);
    root.removeEventListener("toggle", closeOthers, true);
    root.removeEventListener("keydown", closeOnEscape, true);
  };
}
