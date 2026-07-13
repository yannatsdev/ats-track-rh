import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "employee" | "hr" | "direction" | "admin";

export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
    return {
      userId,
      roles,
      isStaff: roles.some((r) => r === "hr" || r === "direction" || r === "admin"),
      profile: profileRes.data ?? null,
    };
  });