export const userRoles = ["ADMINISTRADOR", "ANALISTA FINANCIERO"] as const;
export const normalizedUserRole = (value: unknown) => {
  if (typeof value !== "string") return null;
  const role = value.trim().toUpperCase();
  return userRoles.find(allowed => allowed === role) ?? null;
};
