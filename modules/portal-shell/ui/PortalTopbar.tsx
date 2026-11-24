"use client";

import type {
  Dispatch,
  ReactNode,
  SetStateAction,
} from "react";

import Image from "next/image";

import {
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Menu,
  Users,
} from "lucide-react";

import type { PortalMenu } from "@/modules/identity/domain/menu-access";
import type { PortalGroup } from "../model/portal-types";

const salesMarginNavigationItems = [
  ["summary", "Consolidado"],
  ["channel", "Canal"],
  ["brand", "Marca"],
  ["brandChannel", "Marca × Canal"],
  ["brandClass", "Marca × Clase"],
  ["chainBrand", "Cadena × Marca"],
] as const;

type SalesMarginTargetView =
  (typeof salesMarginNavigationItems)[number][0];

type PortalTopbarProps = {
  portalSection: string;
  defaultSection: string;

  canViewHome: boolean;
  canViewSalesMargin: boolean;
  canManageUsers: boolean;

  visiblePortalGroups: readonly PortalGroup[];

  mobileNavOpen: boolean;
  setMobileNavOpen: Dispatch<SetStateAction<boolean>>;

  openTopnavGroup: PortalMenu | null;
  setOpenTopnavGroup: Dispatch<
    SetStateAction<PortalMenu | null>
  >;

  setPortalSection: Dispatch<SetStateAction<string>>;

  openPortalSection: (
    groupId: string,
    itemId: string,
  ) => void;

  openSalesMargin: (
    targetView: SalesMarginTargetView,
  ) => void;

  userMenu: ReactNode;
};

export function PortalTopbar({
  portalSection,
  defaultSection,
  canViewHome,
  canViewSalesMargin,
  canManageUsers,
  visiblePortalGroups,
  mobileNavOpen,
  setMobileNavOpen,
  openTopnavGroup,
  setOpenTopnavGroup,
  setPortalSection,
  openPortalSection,
  openSalesMargin,
  userMenu,
}: PortalTopbarProps) {
  const closeNavigation = () => {
    setOpenTopnavGroup(null);
    setMobileNavOpen(false);
  };

  const openHome = () => {
    setPortalSection("home");
    closeNavigation();
  };

  const openUsers = () => {
    setPortalSection("users");
    closeNavigation();
  };

  const openDefaultSection = () => {
    setPortalSection(defaultSection);
    closeNavigation();
  };

  return (
    <header className="portal-topbar">
      <button
        className="portal-brand"
        type="button"
        onClick={openDefaultSection}
        aria-label={
          canViewHome
            ? "Ir a la portada"
            : "Ir a Comex"
        }
      >
        <Image
          src="/forus.png"
          alt="Forus"
          width={54}
          height={34}
          preload
        />

        <span>
          <b>Accountability Portal</b>
          <small>Planificación · Forus</small>
        </span>
      </button>

      <button
        className="portal-mobile-toggle"
        type="button"
        onClick={() => {
          setMobileNavOpen((current) => !current);
          setOpenTopnavGroup(null);
        }}
        aria-expanded={mobileNavOpen}
        aria-label="Abrir menú"
      >
        <Menu />
      </button>

      <nav
        className={`portal-topnav ${
          mobileNavOpen ? "open" : ""
        }`}
        aria-label="Informes financieros"
      >
        {canViewHome && (
          <button
            type="button"
            className={
              portalSection === "home"
                ? "active"
                : ""
            }
            onMouseEnter={() =>
              setOpenTopnavGroup(null)
            }
            onClick={openHome}
          >
            Inicio
          </button>
        )}

        {canViewSalesMargin && (
          <div
            className={
              `portal-topnav-group ` +
              `sales-margin-topnav-group ${
                openTopnavGroup === "sales-margin"
                  ? "open"
                  : ""
              }`
            }
            onMouseEnter={() =>
              setOpenTopnavGroup("sales-margin")
            }
            onMouseLeave={() =>
              setOpenTopnavGroup((current) =>
                current === "sales-margin"
                  ? null
                  : current,
              )
            }
            onBlur={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              ) {
                setOpenTopnavGroup((current) =>
                  current === "sales-margin"
                    ? null
                    : current,
                );
              }
            }}
          >
            <button
              type="button"
              className={
                portalSection === "sales-margin"
                  ? "active"
                  : ""
              }
              aria-haspopup="true"
              aria-expanded={
                openTopnavGroup === "sales-margin"
              }
              onClick={() =>
                setOpenTopnavGroup("sales-margin")
              }
            >
              <CircleDollarSign />
              <span>Venta &amp; Margen</span>
              <ChevronDown />
            </button>

            <div className="portal-mega-menu">
              <div className="portal-mega-intro">
                <CircleDollarSign />
                <small>ÁREA</small>
                <strong>Venta &amp; Margen</strong>
                <p>
                  Ventas, margen y variaciones por
                  período, canal, marca y clase.
                </p>
              </div>

              <div className="portal-mega-links">
                {salesMarginNavigationItems.map(
                  ([targetView, label]) => (
                    <button
                      type="button"
                      className="available"
                      key={targetView}
                      onClick={() =>
                        openSalesMargin(targetView)
                      }
                    >
                      <span>
                        <b>{label}</b>
                        <small>Disponible</small>
                      </span>

                      <ChevronRight />
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {visiblePortalGroups.map((group) => {
          const GroupIcon = group.icon;
          const groupOpen =
            openTopnavGroup === group.id;

          return (
            <div
              className={`portal-topnav-group ${
                groupOpen ? "open" : ""
              }`}
              key={group.id}
              onMouseEnter={() =>
                setOpenTopnavGroup(group.id)
              }
              onMouseLeave={() =>
                setOpenTopnavGroup((current) =>
                  current === group.id
                    ? null
                    : current,
                )
              }
              onBlur={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                ) {
                  setOpenTopnavGroup((current) =>
                    current === group.id
                      ? null
                      : current,
                  );
                }
              }}
            >
              <button
                type="button"
                className={
                  group.items.some(
                    (item) =>
                      item.id === portalSection,
                  )
                    ? "active"
                    : ""
                }
                aria-haspopup="true"
                aria-expanded={groupOpen}
                onClick={() =>
                  setOpenTopnavGroup(group.id)
                }
              >
                <GroupIcon />
                <span>{group.label}</span>
                <ChevronDown />
              </button>

              <div className="portal-mega-menu">
                <div className="portal-mega-intro">
                  <GroupIcon />
                  <small>ÁREA</small>
                  <strong>{group.label}</strong>
                  <p>{group.description}</p>
                </div>

                <div className="portal-mega-links">
                  {group.items.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={
                        item.enabled
                          ? "available"
                          : ""
                      }
                      onClick={() => {
                        openPortalSection(
                          group.id,
                          item.id,
                        );

                        setMobileNavOpen(false);
                      }}
                    >
                      <span>
                        <b>{item.label}</b>
                        <small>
                          {item.enabled
                            ? "Disponible"
                            : "Próximamente"}
                        </small>
                      </span>

                      <ChevronRight />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {canManageUsers && (
          <button
            type="button"
            className={
              portalSection === "users"
                ? "active"
                : ""
            }
            aria-current={
              portalSection === "users"
                ? "page"
                : undefined
            }
            onMouseEnter={() =>
              setOpenTopnavGroup(null)
            }
            onClick={openUsers}
          >
            <Users />
            Usuarios
          </button>
        )}
      </nav>

      {userMenu}
    </header>
  );
}