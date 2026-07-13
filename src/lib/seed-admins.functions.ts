import { createServerFn } from "@tanstack/react-start";

const ADMINS = [
  { email: "adminrh1@gmail.com", password: "JesuisadminpassRH$", first_name: "Admin", last_name: "RH 1" },
  { email: "adminrh2@gmail.com", password: "WellprotectedadminpassRH$", first_name: "Admin", last_name: "RH 2" },
];

export const seedAdmins = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const results: Array<{ email: string; status: string; id?: string }> = [];

  for (const a of ADMINS) {
    let userId: string | undefined;
    const created = await supabaseAdmin.auth.admin.createUser({
      email: a.email,
      password: a.password,
      email_confirm: true,
      user_metadata: { first_name: a.first_name, last_name: a.last_name },
    });
    if (created.error) {
      // Likely already exists — look it up
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users.find((u) => u.email?.toLowerCase() === a.email.toLowerCase());
      if (!found) { results.push({ email: a.email, status: "error: " + created.error.message }); continue; }
      userId = found.id;
      // reset password to requested value
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: a.password, email_confirm: true });
      results.push({ email: a.email, status: "updated", id: userId });
    } else {
      userId = created.data.user!.id;
      results.push({ email: a.email, status: "created", id: userId });
    }

    // ensure admin role
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "admin" },
      { onConflict: "user_id,role" },
    );
    // ensure profile
    await supabaseAdmin.from("profiles").upsert(
      { id: userId, first_name: a.first_name, last_name: a.last_name },
      { onConflict: "id" },
    );
  }
  return { results };
});
