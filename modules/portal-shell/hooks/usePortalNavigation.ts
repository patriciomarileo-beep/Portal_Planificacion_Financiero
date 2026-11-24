"use client";

import { useCallback, useMemo, useState } from "react";

import type { AuthUser } from "@/modules/identity/domain/auth-user";
import {
  canAccessMenu,
  type PortalMenu,
} from "@/modules/identity/domain/menu-access";

import {
  menuForSection,
  portalGroups,
} from "../model/portal-navigation";

type UsePortalNavigationOptions = {
  role: AuthUser["role"];
  initialSection?: string;
};

export function usePortalNavigation({
  role,
  initialSection = "home",
}: UsePortalNavigationOptions) {
  const [requestedPortalSection, setPortalSection] =
    useState(initialSection);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [openTopnavGroup, setOpenTopnavGroup] =
    useState<PortalMenu | null>(null);

  const visiblePortalGroups = useMemo(
    () =>
      portalGroups.filter((group) =>
        canAccessMenu(role, group.id),
      ),
    [role],
  );

  const canViewHome = canAccessMenu(role, "home");

  const canViewSalesMargin =
    canAccessMenu(role, "sales-margin");

  const canManageUsers =
    canAccessMenu(role, "users");

  const defaultSection = canViewHome
    ? "home"
    : visiblePortalGroups[0]?.items[0]?.id ?? "";

  const requestedMenu =
    menuForSection(requestedPortalSection);

  const portalSection =
    requestedMenu && canAccessMenu(role, requestedMenu)
      ? requestedPortalSection
      : defaultSection;

  const selectedPortalItem = useMemo(() => {
    if (portalSection === "home") {
      return {
        id: "home",
        label: "Portada",
        enabled: true,
      };
    }

    if (portalSection === "sales-margin") {
      return {
        id: "sales-margin",
        label: "Venta & Margen",
        enabled: true,
      };
    }

    if (portalSection === "users") {
      return {
        id: "users",
        label: "Usuarios",
        enabled: true,
      };
    }

    return (
      portalGroups
        .flatMap((group) => group.items)
        .find((item) => item.id === portalSection) ??
      portalGroups[0].items[0]
    );
  }, [portalSection]);

  const selectedPortalGroup = useMemo(
    () =>
      portalGroups.find((group) =>
        group.items.some(
          (item) => item.id === portalSection,
        ),
      ) ?? portalGroups[0],
    [portalSection],
  );

  const openPortalSection = useCallback(
    (groupId: string, itemId: string) => {
      const group = visiblePortalGroups.find(
        (candidate) => candidate.id === groupId,
      );

      if (
        !group?.items.some((item) => item.id === itemId)
      ) {
        return;
      }

      setPortalSection(itemId);
      setOpenTopnavGroup(null);
    },
    [visiblePortalGroups],
  );

  return {
    portalSection,
    setPortalSection,

    visiblePortalGroups,
    selectedPortalGroup,
    selectedPortalItem,
    defaultSection,

    canViewHome,
    canViewSalesMargin,
    canManageUsers,

    mobileNavOpen,
    setMobileNavOpen,

    openTopnavGroup,
    setOpenTopnavGroup,

    openPortalSection,
  };
}