import type { AppRole } from "./roles.functions";

export const ROLE_LABEL: Record<AppRole, string> = {
  employee: "Employé",
  hr: "Service RH",
  direction: "Direction",
  admin: "Administrateur",
};

export function primaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("direction")) return "direction";
  if (roles.includes("hr")) return "hr";
  return "employee";
}