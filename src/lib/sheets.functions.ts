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
    const validationsRes = await supabase
      .from("validations").select("*").eq("sheet_id", sheet.id);
    return {
      sheet,
      entries: entries.data ?? [],
      dayNotes: dayNotes.data ?? [],
      validations: validationsRes.data ?? [],
    };
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
      statut: z.enum(["done", "in_progress", "postponed", "paused", "blocked"]),
      motif_report: z.string().optional().default(""),
      motif_pause: z.string().optional().default(""),
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
      supabase.from("weekly_sheets").select("*, daily_entries(day, statut)")
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
    const existing = await supabase.from("validations")
      .select("id").eq("sheet_id", data.sheet_id).eq("role", data.role).maybeSingle();
    if (existing.data) {
      const upd = await supabase.from("validations").update({
        validator_id: userId, statut: data.statut,
        commentaire: data.commentaire, validated_at: new Date().toISOString(),
      }).eq("id", existing.data.id);
      if (upd.error) throw upd.error;
    } else {
      const ins = await supabase.from("validations").insert({
        sheet_id: data.sheet_id, validator_id: userId, role: data.role,
        statut: data.statut, commentaire: data.commentaire,
        validated_at: new Date().toISOString(),
      });
      if (ins.error) throw ins.error;
    }
    await recomputeSheetStatus(supabase, data.sheet_id);
    return { ok: true };
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recomputeSheetStatus(supabase: any, sheetId: string) {
  const res = await supabase.from("validations").select("role,statut").eq("sheet_id", sheetId);
  const rows = (res.data ?? []) as Array<{ role: string; statut: string }>;
  const hr = rows.find((r) => r.role === "hr");
  const dir = rows.find((r) => r.role === "direction");
  let status = "submitted";
  if (hr?.statut === "rejected" || dir?.statut === "rejected") status = "rejected";
  else if (dir?.statut === "approved") status = "direction_validated";
  else if (hr?.statut === "approved") status = "hr_validated";
  await supabase.from("weekly_sheets").update({ status }).eq("id", sheetId);
}

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

export const requestSheetEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sheet_id: z.string(), reason: z.string().min(3) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const own = await supabase.from("weekly_sheets").select("id,user_id,status")
      .eq("id", data.sheet_id).maybeSingle();
    if (!own.data || own.data.user_id !== userId) throw new Error("Fiche introuvable");
    const { error } = await supabase.from("weekly_sheets").update({
      edit_request_status: "pending",
      edit_request_reason: data.reason,
      edit_requested_at: new Date().toISOString(),
      edit_resolved_at: null,
      edit_resolver_id: null,
    }).eq("id", data.sheet_id);
    if (error) throw error;
    return { ok: true };
  });

export const resolveEditRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    sheet_id: z.string(),
    decision: z.enum(["approved", "rejected"]),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const rolesRes = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (rolesRes.data ?? []).map((r) => r.role as string);
    const canDecide = roles.some((r) => r === "hr" || r === "direction" || r === "admin");
    if (!canDecide) throw new Error("Réservé au RH ou à la Direction.");
    const patch: {
      edit_request_status: "approved" | "rejected";
      edit_resolved_at: string;
      edit_resolver_id: string;
      status?: "draft";
    } = {
      edit_request_status: data.decision,
      edit_resolved_at: new Date().toISOString(),
      edit_resolver_id: userId,
    };
    if (data.decision === "approved") {
      // Reopen the sheet for editing and clear prior validations.
      patch.status = "draft";
      await supabase.from("validations").delete().eq("sheet_id", data.sheet_id);
    }
    const { error } = await supabase.from("weekly_sheets").update(patch).eq("id", data.sheet_id);
    if (error) throw error;
    return { ok: true };
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

    const meaningfulEntries = entries.filter(e => e.tache.trim().length > 0 && e.statut !== "paused");
    const avg = meaningfulEntries.length
      ? Math.round((meaningfulEntries.filter(e => e.statut === 'done').length / meaningfulEntries.length) * 100)
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
        avancement_moyen: (() => {
          const m = d.tasks.filter(t => t.tache.trim().length > 0 && t.statut !== "paused");
          return m.length ? Math.round((m.filter(t => t.statut === 'done').length / m.length) * 100) : 0;
        })(),
        taches: d.tasks.map((t) => ({
          heure: t.heure, tache: t.tache, resultat: t.resultat,
          statut: t.statut, resultats: t.resultat, motif_report: t.motif_report, motif_pause: t.motif_pause,
        })),
        note_du_jour: d.note ? {
          avancement: d.note.avancement_pct,
          motif_report: d.note.motif_report,
          remarque_additionnelle: d.note.observations,
        } : null,
      })),
      bilan: {
        realisations: sheet.bilan_realisations,
        dossiers: sheet.bilan_dossiers,
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
- Ne mentionne un risque QUE s'il est visible dans les données : tâche à faible avancement, tâche reportée sans motif, journée travaillée sans tâche, note du jour vide alors que des difficultés sont probables, tâche en statut "paused" (suspendue) sans motif ou depuis plusieurs jours.
- DÉTECTION DE PATTERNS : si tu vois plusieurs jours de suite avec peu de tâches ou si les tâches sont concentrées le vendredi, mentionne-le avec bienveillance dans "risques".
- Si des tâches sont suspendues ("paused") : suggère de les clôturer ou de les reporter si elles ne sont plus prioritaires dans "priorites".
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

export const generateAIBilan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sheet_id: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [sheetRes, entriesRes, notesRes] = await Promise.all([
      supabase.from("weekly_sheets").select("*").eq("id", data.sheet_id).eq("user_id", userId).single(),
      supabase.from("daily_entries").select("*").eq("sheet_id", data.sheet_id).order("day").order("position"),
      supabase.from("day_notes").select("*").eq("sheet_id", data.sheet_id),
    ]);
    if (!sheetRes.data) throw new Error("Fiche introuvable");
    const entries = entriesRes.data ?? [];
    const notes = notesRes.data ?? [];

    const summary = {
      taches: entries.map(e => ({ day: e.day, tache: e.tache, statut: e.statut, resultat: e.resultat, motif_pause: e.motif_pause })),
      notes: notes.map(n => ({ day: n.day, remarque_additionnelle: n.observations, motif_report: n.motif_report }))
    };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("IA indisponible.");

    const system = `Tu es un assistant RH. Ta mission est d'agréger les tâches journalières d'un employé pour générer un bilan hebdomadaire structuré.
Retourne UNIQUEMENT du JSON strict : { "realisations": string, "dossiers": string, "actions": string }
Base-toi sur les tâches, le champ "resultat" (observations de la tâche) et les "remarque_additionnelle" des notes du jour.
- realisations : Synthèse des tâches "done".
- dossiers : Synthèse des tâches "in_progress", "paused" (suspendues) et "blocked" (bloquées). Mentionne explicitement les blocages et les suspensions.
- actions : Déductions pour la semaine prochaine basées sur le travail en cours, bloqué ou suspendu, en intégrant les points de blocage à traiter.
Ce bilan sera relu par l'employé avant validation. Sois précis et professionnel.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(summary) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error("Erreur IA");
    const json = await res.json() as any;
    const content = JSON.parse(json.choices[0].message.content);
    return {
      realisations: content.realisations ?? "",
      dossiers: content.dossiers ?? "",
      actions: content.actions ?? "",
    };
  });

export const reportTaskToNextDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("report_task_to_next_day", { _task_id: data.id });
    if (error) throw error;
    if (!result) throw new Error("Impossible de reporter la tâche.");
    return { id: result };
  });
