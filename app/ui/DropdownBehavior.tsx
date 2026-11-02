"use client";

import { useEffect } from "react";
import { installDropdownBehavior } from "./dropdown-behavior";

export default function DropdownBehavior() {
  useEffect(() => installDropdownBehavior(document), []);
  return null;
}
