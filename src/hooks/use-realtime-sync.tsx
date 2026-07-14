import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TABLES = ["weekly_sheets", "daily_entries", "day_notes", "validations", "profiles"] as const;

/**
 * Abonne l'application aux changements en temps réel sur les tables clés.
 * Toute mutation côté DB déclenche l'invalidation du cache React Query pour
 * que les dashboards et fiches se rafraîchissent automatiquement.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel("app-realtime-sync");
    for (const table of TABLES) {
      channel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        () => {
          qc.invalidateQueries();
        },
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}