# ATS TRACK RH — Plan de construction

Application web/mobile responsive (pas de landing) de suivi hebdomadaire des tâches RH, avec 2 rôles (Employé / Admin RH), design premium façon dashboard SaaS (sidebar bleu marine, accents or, cartes arrondies, graphiques).

## 1. Design system & identité

- Palette (tokens sémantiques dans `src/styles.css`, format oklch) :
  - `--sidebar` bleu marine `#1C2333` → `#232A3D`
  - `--primary` or `#E3A93D` (hover `#EFB94A`), `--primary-foreground` bleu marine
  - `--accent-blue` `#1E4E8C` (secondaire)
  - `--background` `#F5F6FA`, `--card` blanc, textes `#2E2E2E`
  - Statuts : vert (Terminée), or (En cours), rouge/orange (Reportée)
- Typo : Inter (via `@fontsource-variable/inter`), titres bold, hiérarchie claire
- Composants : cartes `rounded-2xl shadow-lg`, transitions 200–300ms, icônes Lucide fines
- Logo ATS (étoile dorée + silhouette diplômée) généré via `imagegen` en haut de sidebar ; footer sidebar « Africa Talent Solution — Agréé FDFD »

## 2. Backend (Lovable Cloud)

Activation Cloud puis migrations :

- `profiles` (id → auth.users, nom, prénom, fonction, service, avatar_url, manager_id, active)
- `app_role` enum (`employee`, `hr`, `direction`, `admin`) + table `user_roles` + fonction `has_role` SECURITY DEFINER
- `weekly_sheets` (id, user_id, week_start, avancement_global, difficultes, observations, bilan_realisations, bilan_dossiers, bilan_difficultes, bilan_actions, submitted_at, status : draft/submitted/hr_validated/direction_validated/rejected)
- `daily_entries` (id, sheet_id, day 1..5, heure, tache, resultat, statut, motif_report, avancement_pct)
- `validations` (id, sheet_id, validator_id, role, commentaire, statut, validated_at)
- RLS : employé voit ses propres fiches ; HR/admin voient tout via `has_role`
- Grants explicites `authenticated` + `service_role`
- Trigger `handle_new_user` → crée profile + rôle `employee` par défaut

## 3. Auth & routing

- Route publique `/auth` (email/password + Google via broker Lovable)
- Layout protégé `src/routes/_authenticated/route.tsx` (managed, `ssr:false`)
- Redirection après login selon rôle principal ; menu « Changer de vue » si multi-rôles
- `src/routes/index.tsx` → redirige vers `/dashboard` (employé) ou `/admin` selon rôle

## 4. Layout (3 zones)

`_authenticated/route.tsx` rend :
- **Sidebar gauche** (shadcn Sidebar, `collapsible="icon"`, thème sombre) : logo, nav dynamique selon rôle, badges de notification, footer ATS
- **Zone centrale** : header (titre + recherche + CTA or) + `<Outlet />`
- **Panneau droit** (fond bleu marine, `rounded-2xl`) : profil, cartes contextuelles (fiches en attente / onboarding), bouton « Voir tout » or. Masqué en mobile (drawer).

## 5. Routes Employé

- `/dashboard` — KPIs (donuts), courbe hebdo dégradé or (Recharts AreaChart), donut statuts, histogramme jours
- `/fiche` — Fiche semaine : onglets L→V avec coches, tableau dynamique (Heure/Tâche/Résultat/Statut), champ « Motif du report » conditionnel, slider avancement, textareas, barre progression globale ; brouillon en localStorage
- `/fiche/bilan` — 4 blocs (réalisations, dossiers, difficultés, actions)
- `/historique` — Liste fiches passées + mini-graph tendance perso
- `/parametres`

## 6. Routes Admin RH

- `/admin` — Dashboard global : KPIs (fiches attendues vs soumises, taux statuts, retards, en attente validation), courbe agrégée avec filtre service, donut org, histogramme par service, panneau droit « dernières soumissions / retards »
- `/admin/employes` — Table filtrable/triable (avatar, nom, service, statut fiche, %, tâches, dernière MAJ, bouton « Voir »/« Relancer »), export PDF/Excel (jspdf + xlsx), pastilles retard
- `/admin/employes/$id` — Fiche individuelle lecture seule + historique + mini-graph + zone commentaire/validation inline
- `/admin/validation` — Fiches groupées (À valider RH / Direction / Validées), actions valider/rejeter/demander correction, historique traçable
- `/admin/gestion` — CRUD employés (assign service, poste, manager, rôle) via Supabase Auth Admin (server function protégée)
- `/admin/statistiques` — Comparatif services, évolution reports, export rapports

## 7. Composants clés

- `KpiRingCard` (donut Recharts + % évolution)
- `WeeklyTrendChart` (AreaChart dégradé or)
- `StatusDonut`, `DayBarChart`
- `StatusBadge` (vert/or/rouge)
- `DayTabs` avec indicateur complétion
- `TaskRowsEditor` (ajout/suppression lignes, motif conditionnel)
- `ValidationCard` (RH / Direction, toggle statut)
- `EmployeeTable` (tri, filtre, recherche, export)
- `RightProfilePanel`

## 8. Détails techniques

- Data : `createServerFn` + `requireSupabaseAuth` pour toutes les lectures/écritures ; TanStack Query (`ensureQueryData` + `useSuspenseQuery`)
- Gestion privilèges admin (CRUD employés) : server fn protégée avec check `has_role('admin'|'hr')` + `supabaseAdmin` chargé dans le handler
- Recharts pour graphiques (dégradé or via `<linearGradient>`), Lucide icons
- Responsive : sidebar drawer < md, panneau droit → sheet, tables → cards empilées mobile
- `head()` par route (titres FR spécifiques), favicon = logo ATS

## 9. Ordre d'implémentation

1. Activer Lovable Cloud + migrations (schéma, RLS, grants, trigger, has_role)
2. Design tokens + font + logo ATS généré
3. Auth (`/auth`) + layout `_authenticated` + sidebar/header/panneau droit + routing par rôle
4. Fiche semaine + bilan + historique (Employé)
5. Dashboard employé (KPIs + graphiques)
6. Dashboard admin + suivi employés + fiche individuelle
7. Validation + gestion employés + statistiques avancées
8. Export PDF/Excel, relances, paramètres, polish responsive
