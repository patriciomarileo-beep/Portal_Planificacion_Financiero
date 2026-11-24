import type { LucideIcon } from "lucide-react";
import type { PortalMenu } from "@/modules/identity/domain/menu-access";

export type PortalSection = {
  id: string;
  label: string;
  enabled?: boolean;
};

export type PortalGroup = {
  id: PortalMenu;
  label: string;
  description: string;
  icon: LucideIcon;
  items: PortalSection[];
};