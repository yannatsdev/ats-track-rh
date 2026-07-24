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

export const adminListUserSheets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const [sheetsRes, profileRes] = await Promise.all([
      supabase.from("weekly_sheets").select("*").eq("user_id", data.userId).order("week_start", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
    ]);
    if (sheetsRes.error) throw sheetsRes.error;
    return { sheets: sheetsRes.data ?? [], profile: profileRes.data ?? null };
  });

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (data.userId === userId) throw new Error("Impossible de supprimer votre propre compte.");
    const { data: isDir } = await supabase.rpc("has_role", { _user_id: userId, _role: "direction" });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isDir && !isAdmin) throw new Error("Réservé à la Direction.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    return { ok: true };
  });

export const getCoachAdvice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sheet_id: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    // Staff (hr/direction/admin) may analyze any employee's sheet.
    const rolesRes = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (rolesRes.data ?? []).map((r) => r.role as string);
    const isStaff = roles.some((r) => r === "hr" || r === "direction" || r === "admin");
    const [sheetRes, entriesRes, notesRes, profileRes] = await Promise.all([
      isStaff
        ? supabase.from("weekly_sheets").select("*").eq("id", data.sheet_id).maybeSingle()
        : supabase.from("weekly_sheets").select("*").eq("id", data.sheet_id).eq("user_id", userId).maybeSingle(),
      supabase.from("daily_entries").select("*").eq("sheet_id", data.sheet_id).order("day").order("position"),
      supabase.from("day_notes").select("*").eq("sheet_id", data.sheet_id),
      supabase.from("profiles").select("first_name,last_name,fonction,service").eq("id", userId).maybeSingle(),
    ]);
    if (!sheetRes.data) throw new Error("Fiche introuvable");
    const sheet = sheetRes.data;
    const entries = entriesRes.data ?? [];
    const notes = notesRes.data ?? [];
    // For staff, load the sheet owner's profile for the AI context.
    let profile = profileRes.data;
    if (isStaff && sheet.user_id !== userId) {
      const ownerRes = await supabase
        .from("profiles")
        .select("first_name,last_name,fonction,service")
        .eq("id", sheet.user_id)
        .maybeSingle();
      profile = ownerRes.data ?? profile;
    }

    const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
    const today = new Date();
    const dow = today.getDay();
    const todayLabel = dow >= 1 && dow <= 5 ? DAYS[dow - 1] : "week-end";

    const perDay = DAYS.map((label, i) => {
      const day = i + 1;
      const de = entries.filter((e) => e.day === day);
      const note = notes.find((n) => n.day === day);
      return { label, tasks: de, note };
    });

    const avg = entries.length
      ? Math.round(entries.reduce((a, b) => a + (b.avancement_pct ?? 0), 0) / entries.length)
      : 0;
    const summary = {
      employe: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""} — ${profile?.fonction ?? "?"} / ${profile?.service ?? "?"}`,
      semaine: sheet.week_start,
      statut: sheet.status,
      aujourdhui: todayLabel,
      avancement_global: avg,
      total_taches: entries.length,
      taches_terminees: entries.filter((e) => e.statut === "done").length,
      taches_reportees: entries.filter((e) => e.statut === "postponed").length,
      jours: perDay.map((d) => ({
        jour: d.label,
        nb_taches: d.tasks.length,
        avancement_moyen: d.tasks.length
          ? Math.round(d.tasks.reduce((a, b) => a + (b.avancement_pct ?? 0), 0) / d.tasks.length)
          : 0,
        taches: d.tasks.map((t) => ({
          heure: t.heure, tache: t.tache, resultat: t.resultat,
          statut: t.statut, avancement: t.avancement_pct, motif_report: t.motif_report,
        })),
        note_du_jour: d.note ? {
          avancement: d.note.avancement_pct,
          motif_report: d.note.motif_report,
          difficultes: d.note.difficultes,
          observations: d.note.observations,
        } : null,
      })),
      bilan: {
        realisations: sheet.bilan_realisations,
        dossiers: sheet.bilan_dossiers,
        difficultes: sheet.bilan_difficultes,
        actions: sheet.bilan_actions,
      },
    };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Coach indisponible : LOVABLE_API_KEY manquant.");

    const system = `Tu es "Coach ATS", assistant RH bienveillant et pragmatique pour un employé qui remplit sa fiche de suivi hebdomadaire.
Ta mission : analyser UNIQUEMENT les tâches réellement saisies et donner un retour utile, ancré dans les faits.

Règles strictes :
- Réponds en français, ton chaleureux mais professionnel.
- Retourne UNIQUEMENT du JSON strict, sans markdown, sans texte hors JSON.
- Format : { "resume": string (1 phrase factuelle sur ce qui a été fait), "score": number (0-100, basé sur l'avancement réel), "priorites": string[] (0-4 actions concrètes UNIQUEMENT si utile ; sinon []), "risques": string[] (0-3 points UNIQUEMENT s'il y a un vrai signal ; sinon []), "encouragement": string (1 phrase, dis "Bravo" quand l'avancement est bon) }
- INTERDIT : conseils génériques, banalités, remplissage. Si tout va bien, "priorites" et "risques" doivent être des tableaux vides [] et l'encouragement doit féliciter explicitement.
- Ne mentionne un risque QUE s'il est visible dans les données : tâche à faible avancement, tâche reportée sans motif, journée travaillée sans tâche, note du jour vide alors que des difficultés sont probables.
- Ne recommande une priorité QUE si elle cible une tâche précise (cite-la brièvement) ou un manque précis.
- Si aucune tâche n'a été saisie du tout : resume factuel, score 0, une seule priorité = "Commencer à saisir les tâches de la semaine", pas de faux risques.
- Si toutes les tâches sont "done" à 100% : dis Bravo, score élevé, priorites=[], risques=[].
- Ne répète jamais la donnée brute telle quelle ; transforme-la en observation ou conseil ciblé.`;

    const userMsg = `Voici les données de ma semaine (JSON) :\n${JSON.stringify(summary, null, 2)}\n\nDonne-moi tes recommandations.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Coach: limite atteinte, réessayez dans un instant.");
      if (res.status === 402) throw new Error("Coach: crédits IA épuisés.");
      throw new Error(`Coach indisponible (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      resume?: string; score?: number; priorites?: string[]; risques?: string[]; encouragement?: string;
    } = {};
    try { parsed = JSON.parse(content); } catch { parsed = { resume: content }; }
    return {
      resume: parsed.resume ?? "",
      score: typeof parsed.score === "number" ? parsed.score : avg,
      priorites: Array.isArray(parsed.priorites) ? parsed.priorites : [],
      risques: Array.isArray(parsed.risques) ? parsed.risques : [],
      encouragement: parsed.encouragement ?? "",
      avancement_global: avg,
    };
  });