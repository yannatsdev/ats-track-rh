import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ScopeEnum = z.enum(["individual", "service", "organization"]);

export const listOkrs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      monthStart: z.string(),
      ownerId: z.string().optional(),
      scope: ScopeEnum.optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    let q = supabase.from("okrs").select("*, key_results(*)").eq("month_start", data.monthStart);
    if (data.scope) q = q.eq("scope", data.scope);
    if (data.ownerId) q = q.eq("owner_id", data.ownerId);
    const { data: okrs, error } = await q.order("scope").order("created_at");
    if (error) throw error;
    return { okrs: okrs ?? [], userId };
  });

export const listMyOkrs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ monthStart: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: mine } = await supabase
      .from("okrs").select("*, key_results(*)")
      .eq("month_start", data.monthStart).eq("owner_id", userId)
      .order("created_at");
    const { data: shared } = await supabase
      .from("okrs").select("*, key_results(*)")
      .eq("month_start", data.monthStart).in("scope", ["service", "organization"])
      .order("scope").order("created_at");
    return { mine: mine ?? [], shared: shared ?? [] };
  });

export const createOkr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      title: z.string().min(3),
      description: z.string().optional().default(""),
      scope: ScopeEnum.default("individual"),
      service: z.string().optional().nullable(),
      monthStart: z.string(),
      ownerId: z.string().optional(),
      alignedTo: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const ownerId = data.scope === "individual" ? (data.ownerId ?? userId) : null;
    const { data: row, error } = await supabase.from("okrs").insert({
      title: data.title,
      description: data.description,
      scope: data.scope,
      service: data.service ?? null,
      month_start: data.monthStart,
      owner_id: ownerId,
      aligned_to: data.alignedTo ?? null,
      created_by: userId,
      status: "draft",
    }).select().single();
    if (error) throw error;
    return row;
  });

export const updateOkr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      progress_pct: z.number().int().min(0).max(100).optional(),
      status: z.enum(["draft", "submitted", "hr_validated", "direction_validated", "rejected"]).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { id, status, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest };
    if (status) {
      patch.status = status;
      if (status === "submitted") patch.submitted_at = new Date().toISOString();
    }
    const { error } = await context.supabase.from("okrs").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteOkr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("okrs").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const upsertKeyResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().optional(),
      okr_id: z.string(),
      title: z.string().min(2),
      metric_unit: z.string().optional().default(""),
      target_value: z.number().nullable().optional(),
      current_value: z.number().nullable().optional(),
      progress_pct: z.number().int().min(0).max(100).default(0),
      position: z.number().int().default(0),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await supabase.from("key_results").update(patch).eq("id", id);
      if (error) throw error;
    } else {
      const { id: _o, ...ins } = data;
      const { error } = await supabase.from("key_results").insert(ins);
      if (error) throw error;
    }
    // Recompute parent progress
    const { data: krs } = await supabase.from("key_results").select("progress_pct").eq("okr_id", data.okr_id);
    const avg = krs && krs.length
      ? Math.round(krs.reduce((a, k) => a + (k.progress_pct ?? 0), 0) / krs.length)
      : 0;
    await supabase.from("okrs").update({ progress_pct: avg }).eq("id", data.okr_id);
    return { ok: true, progress: avg };
  });

export const deleteKeyResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string(), okr_id: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.from("key_results").delete().eq("id", data.id);
    if (error) throw error;
    const { data: krs } = await supabase.from("key_results").select("progress_pct").eq("okr_id", data.okr_id);
    const avg = krs && krs.length
      ? Math.round(krs.reduce((a, k) => a + (k.progress_pct ?? 0), 0) / krs.length)
      : 0;
    await supabase.from("okrs").update({ progress_pct: avg }).eq("id", data.okr_id);
    return { ok: true };
  });

export const validateOkr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      okr_id: z.string(),
      role: z.enum(["hr", "direction"]),
      statut: z.enum(["approved", "rejected"]),
      commentaire: z.string().optional().default(""),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("okr_validations").insert({
      okr_id: data.okr_id, validator_id: userId, role: data.role,
      statut: data.statut, commentaire: data.commentaire,
    });
    if (error) throw error;
    const newStatus = data.statut === "rejected"
      ? "rejected" : data.role === "hr" ? "hr_validated" : "direction_validated";
    await supabase.from("okrs").update({ status: newStatus }).eq("id", data.okr_id);
    return { ok: true };
  });

// ============ AI ============

async function callAI(system: string, user: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("IA indisponible : LOVABLE_API_KEY manquant.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("IA : limite atteinte, réessayez.");
    if (res.status === 402) throw new Error("IA : crédits épuisés.");
    throw new Error(`IA (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(content); } catch { return {}; }
}

export const aiGenerateKeyResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ title: z.string(), description: z.string().optional().default("") }).parse(d),
  )
  .handler(async ({ data }) => {
    const system = `Tu es un expert OKR. À partir d'un objectif, propose 3 Key Results SMART, mesurables, ambitieux mais réalistes sur 1 mois.
Réponds UNIQUEMENT en JSON strict : { "key_results": [ { "title": string, "target_value": number|null, "metric_unit": string } ] }
- 3 KR maximum, en français.
- target_value numérique quand mesurable, sinon null.
- metric_unit court (ex: "%", "clients", "dossiers", "heures").`;
    const user = `Objectif: ${data.title}\nDescription: ${data.description || "(aucune)"}\n\nPropose les Key Results.`;
    const parsed = await callAI(system, user);
    const list = Array.isArray(parsed.key_results) ? parsed.key_results.slice(0, 3) : [];
    return {
      key_results: list.map((k: { title?: string; target_value?: number | null; metric_unit?: string }) => ({
        title: String(k.title ?? "").slice(0, 200),
        target_value: typeof k.target_value === "number" ? k.target_value : null,
        metric_unit: String(k.metric_unit ?? "").slice(0, 30),
      })),
    };
  });

export const aiAnalyzeOkr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ okr_id: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const okrRes = await supabase.from("okrs").select("*, key_results(*)").eq("id", data.okr_id).maybeSingle();
    if (!okrRes.data) throw new Error("OKR introuvable.");
    const okr = okrRes.data as {
      title: string; description: string | null; progress_pct: number; owner_id: string | null; month_start: string;
      key_results: Array<{ title: string; target_value: number | null; current_value: number | null; metric_unit: string | null; progress_pct: number }>;
    };
    // Pull recent tasks for context if individual OKR
    let recentTasks: Array<{ tache: string; statut: string; avancement_pct: number }> = [];
    if (okr.owner_id) {
      const sheets = await supabase.from("weekly_sheets").select("id").eq("user_id", okr.owner_id)
        .gte("week_start", okr.month_start).order("week_start", { ascending: false }).limit(5);
      const sheetIds = (sheets.data ?? []).map((s) => s.id);
      if (sheetIds.length) {
        const entries = await supabase.from("daily_entries").select("tache, statut, avancement_pct").in("sheet_id", sheetIds);
        recentTasks = (entries.data ?? []).slice(0, 40);
      }
    }

    const system = `Tu es "Coach OKR", assistant IA bienveillant et exigeant.
Analyse l'OKR et son alignement avec les tâches réellement effectuées.
Réponds UNIQUEMENT en JSON strict :
{ "score": number (0-100), "verdict": string (1 phrase), "recommandations": string[] (0-3 actions concrètes), "risques": string[] (0-3), "encouragement": string }
- Base-toi UNIQUEMENT sur les données fournies.
- Si l'avancement des KR est bon, félicite explicitement et laisse recommandations/risques vides.
- Sois concret : cite un KR ou une tâche précise plutôt que du blabla.`;
    const payload = {
      objectif: okr.title,
      description: okr.description,
      avancement_okr: okr.progress_pct,
      mois: okr.month_start,
      key_results: okr.key_results.map((k) => ({
        titre: k.title, cible: k.target_value, actuel: k.current_value, unite: k.metric_unit, avancement: k.progress_pct,
      })),
      taches_recentes: recentTasks,
    };
    const parsed = await callAI(system, `Analyse cet OKR :\n${JSON.stringify(payload, null, 2)}`);
    const result = {
      score: typeof parsed.score === "number" ? parsed.score : okr.progress_pct,
      verdict: String(parsed.verdict ?? ""),
      recommandations: Array.isArray(parsed.recommandations) ? parsed.recommandations.slice(0, 3) : [],
      risques: Array.isArray(parsed.risques) ? parsed.risques.slice(0, 3) : [],
      encouragement: String(parsed.encouragement ?? ""),
    };
    await supabase.from("okrs").update({ ai_score: result.score, ai_feedback: result }).eq("id", data.okr_id);
    return result;
  });

export const aiScoreOkrQuality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ okr_id: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const okrRes = await context.supabase.from("okrs").select("*, key_results(*)").eq("id", data.okr_id).maybeSingle();
    if (!okrRes.data) throw new Error("OKR introuvable.");
    const okr = okrRes.data;
    const system = `Tu es un expert RH en OKR. Évalue la qualité d'un OKR soumis pour validation.
Réponds UNIQUEMENT en JSON strict :
{ "qualite": number (0-100), "clair": boolean, "mesurable": boolean, "ambitieux": boolean, "aligne": boolean, "commentaire": string (2 phrases max), "suggestions": string[] (0-3) }`;
    const parsed = await callAI(system, `OKR à évaluer :\n${JSON.stringify({
      objectif: okr.title, description: okr.description, key_results: okr.key_results,
    }, null, 2)}`);
    return {
      qualite: typeof parsed.qualite === "number" ? parsed.qualite : 50,
      clair: !!parsed.clair, mesurable: !!parsed.mesurable, ambitieux: !!parsed.ambitieux, aligne: !!parsed.aligne,
      commentaire: String(parsed.commentaire ?? ""),
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
    };
  });

export const aiSuggestAlignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ okr_id: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const okrRes = await context.supabase.from("okrs").select("*").eq("id", data.okr_id).maybeSingle();
    if (!okrRes.data) throw new Error("OKR introuvable.");
    const okr = okrRes.data;
    const parents = await context.supabase.from("okrs").select("id, title, scope")
      .in("scope", ["service", "organization"]).eq("month_start", okr.month_start);
    if (!parents.data || parents.data.length === 0) {
      return { aligned_to: null, raison: "Aucun OKR de service ou d'organisation défini pour ce mois." };
    }
    const system = `Choisis l'OKR parent le mieux aligné avec un OKR individuel. Réponds JSON strict : { "aligned_to": string|null (id), "raison": string }`;
    const parsed = await callAI(system, `OKR individuel : ${JSON.stringify(okr)}\nParents disponibles : ${JSON.stringify(parents.data)}`);
    return {
      aligned_to: typeof parsed.aligned_to === "string" ? parsed.aligned_to : null,
      raison: String(parsed.raison ?? ""),
    };
  });