export const portalMenus = ["home", "toolbox", "forecast", "mercado", "comex", "kpi", "users"] as const;
export type PortalMenu = typeof portalMenus[number];

export const menusForRole = (role: string): readonly PortalMenu[] => {
  switch (role.trim().toUpperCase()) {
    case "ADMINISTRADOR": return portalMenus;
    case "ANALISTA FINANCIERO": return ["home", "forecast", "mercado", "kpi"];
    case "PLANIFICADOR FINANCIERO": return ["home", "toolbox", "forecast", "mercado", "comex", "kpi"];
    case "COMEX": return ["comex"];
    default: return [];
  }
};

export const canAccessMenu = (role: string, menu: PortalMenu) => menusForRole(role).includes(menu);
