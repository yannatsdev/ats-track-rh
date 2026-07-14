import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getOrCreateCurrentSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ weekStart: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const existing = await supabase
      .from("weekly_sheets").select("*").eq("user_id", userId).eq("week_start", data.weekStart).maybeSingle();
    let sheet = existing.data;
    if (!sheet) {
      const ins = await supabase.from("weekly_sheets")
        .insert({ user_id: userId, week_start: data.weekStart, status: "draft" })
        .select().single();
      if (ins.error) throw ins.error;
      sheet = ins.data;
    }
    const [entries, dayNotes] = await Promise.all([
      supabase.from("daily_entries").select("*").eq("sheet_id", sheet.id).order("day").order("position"),
      supabase.from("day_notes").select("*").eq("sheet_id", sheet.id),
    ]);
    return { sheet, entries: entries.data ?? [], dayNotes: dayNotes.data ?? [] };
  });

export const upsertDailyEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().optional(),
      sheet_id: z.string(),
      day: z.number().int().min(1).max(5),
      heure: z.string().optional().default(""),
      tache: z.string(),
      resultat: z.string().optional().default(""),
      statut: z.enum(["done", "in_progress", "postponed"]),
      motif_report: z.string().optional().default(""),
      avancement_pct: z.number().int().min(0).max(100),
      position: z.number().int().default(0),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await supabase.from("daily_entries").update(patch).eq("id", id);
      if (error) throw error;
      return { ok: true };
    }
    const { id: _o, ...ins } = data;
    const { error } = await supabase.from("daily_entries").insert(ins);
    if (error) throw error;
    return { ok: true };
  });

export const deleteDailyEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("daily_entries").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const upsertDayNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      sheet_id: z.string(),
      day: z.number().int().min(1).max(5),
      motif_report: z.string().optional().default(""),
      avancement_pct: z.number().int().min(0).max(100).default(0),
      difficultes: z.string().optional().default(""),
      observations: z.string().optional().default(""),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("day_notes")
      .upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: "sheet_id,day" });
    if (error) throw error;
    return { ok: true };
  });

export const updateSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string(),
      avancement_global: z.number().int().min(0).max(100).optional(),
      difficultes: z.string().optional(),
      observations: z.string().optional(),
      bilan_realisations: z.string().optional(),
      bilan_dossiers: z.string().optional(),
      bilan_difficultes: z.string().optional(),
      bilan_actions: z.string().optional(),
      status: z.enum(["draft", "submitted"]).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { id, status, ...rest } = data;
    const patch = {
      ...rest,
      ...(status ? { status, ...(status === "submitted" ? { submitted_at: new Date().toISOString() } : {}) } : {}),
    };
    const { error } = await context.supabase.from("weekly_sheets").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const listMySheets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("weekly_sheets").select("*")
      .eq("user_id", context.userId).order("week_start", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const listAllEmployeesTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ weekStart: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const [profilesRes, sheetsRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("active", true),
      supabase.from("weekly_sheets").select("*, daily_entries(day, statut, avancement_pct)")
        .eq("week_start", data.weekStart),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (profilesRes.error) throw profilesRes.error;
    const rolesByUser = new Map<string, string[]>();
    (rolesRes.data ?? []).forEach((r) => {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role);
      rolesByUser.set(r.user_id, list);
    });
    const profiles = (profilesRes.data ?? []).map((p) => ({ ...p, roles: rolesByUser.get(p.id) ?? [] }));
    return { profiles, sheets: sheetsRes.data ?? [] };
  });

export const adminGetSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const [sheetRes, entriesRes, validationsRes, dayNotesRes] = await Promise.all([
      supabase.from("weekly_sheets").select("*").eq("id", data.id).single(),
      supabase.from("daily_entries").select("*").eq("sheet_id", data.id).order("day").order("position"),
      supabase.from("validations").select("*").eq("sheet_id", data.id),
      supabase.from("day_notes").select("*").eq("sheet_id", data.id),
    ]);
    if (sheetRes.error) throw sheetRes.error;
    const profileRes = await supabase.from("profiles").select("*").eq("id", sheetRes.data.user_id).maybeSingle();
    return {
      sheet: sheetRes.data,
      entries: entriesRes.data ?? [],
      profile: profileRes.data ?? null,
      validations: validationsRes.data ?? [],
      dayNotes: dayNotesRes.data ?? [],
    };
  });

export const submitValidation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      sheet_id: z.string(),
      role: z.enum(["hr", "direction"]),
      statut: z.enum(["approved", "rejected"]),
      commentaire: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const ins = await supabase.from("validations").insert({
      sheet_id: data.sheet_id, validator_id: userId, role: data.role,
      statut: data.statut, commentaire: data.commentaire,
      validated_at: new Date().toISOString(),
    });
    if (ins.error) throw ins.error;
    const newStatus = data.statut === "rejected"
      ? "rejected" : data.role === "hr" ? "hr_validated" : "direction_validated";
    await supabase.from("weekly_sheets").update({ status: newStatus }).eq("id", data.sheet_id);
    return { ok: true };
  });

export const listPendingValidations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("weekly_sheets").select("*")
      .in("status", ["submitted", "hr_validated"]).order("submitted_at", { ascending: false });
    if (error) throw error;
    const userIds = [...new Set((data ?? []).map((s) => s.user_id))];
    const profiles = userIds.length
      ? (await context.supabase.from("profiles").select("*").in("id", userIds)).data ?? []
      : [];
    return { sheets: data ?? [], profiles };
  });

export const listActiveEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profiles, roles] = await Promise.all([
      context.supabase.from("profiles").select("*").order("last_name"),
      context.supabase.from("user_roles").select("*"),
    ]);
    if (profiles.error) throw profiles.error;
    return { profiles: profiles.data ?? [], roles: roles.data ?? [] };
  });