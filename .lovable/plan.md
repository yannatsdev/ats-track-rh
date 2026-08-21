# Functional Architecture Upgrade

Modernizing the application architecture to unify task management, reporting, and AI-driven coaching into a cohesive system.

## Proposed Changes

### 1. Data Model & Backend (Supabase)
- Add `public.tags` table for light categorization (Client, Project, Folder).
- Add `public.daily_entry_tags` join table.
- Implement a `report_task` database function to clone a task to the next working day.
- Update `public.sheet_status` enum to include `closed`.

### 2. Task Management UI (Employee Fiche)
- **Dynamic Avancement:** Replace `avancement_pct` with a context-aware field:
  - If "Done" -> "Résultat obtenu"
  - If "In Progress" -> "Point d'avancement"
  - If "Suspended" -> "Motif de suspension"
- **Report Feature:** Add a "Reporter" button to incomplete tasks that clones them to the next day.
- **Auto-Calculated Progress:** Daily and weekly progress will be derived solely from task status counts.

### 3. Reporting & AI Integration
- **Unified Daily Note:** Merge "Difficultés" and "Observations" into a single "Note du jour" text field in the UI (schema remains separate for compatibility, but UI handles as one).
- **Mandatory Review:** AI-generated weekly bilan will be editable and require user validation before submission.
- **Submission Guard:** Prevent submission unless at least one task is recorded per active day, with a clear error message.

### 4. Admin & Manager Experience
- **Consolidated Dashboard:** Team-wide completion rates and comparative week-over-week trends.
- **Enhanced Validation:** Support for rich comments during the validation workflow.
- **Analytics:** Initial implementation of monthly/quarterly trends and basic PDF/Excel export preparation.

### 5. Coach ATS Enhancements
- **Behavioral Detection:** Detect patterns like "Friday rush" or long-suspended tasks.
- **Contextual Alerts:** Suggest actions based on real-time task patterns.

## Technical Details

### Database Migrations
```sql
-- Tagging system
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.tags TO authenticated;

CREATE TABLE public.daily_entry_tags (
  entry_id uuid REFERENCES public.daily_entries(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

GRANT ALL ON public.daily_entry_tags TO authenticated;

-- Next day reporter helper
CREATE OR REPLACE FUNCTION public.report_task_to_next_day(task_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
-- Logic to find the next day's sheet/entry slot and clone the task
$$;
```

### AI Prompt Updates
- Refine Gemini prompts in `sheets.functions.ts` to enforce fact-based summarization and behavioral pattern recognition.

### UI Components
- **`BilanSection.tsx`:** Update to include "Validate AI Summary" step.
- **`AdminDashboard.tsx`:** Add comparison charts and team completion metrics.
