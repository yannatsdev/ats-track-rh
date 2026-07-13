import { createFileRoute } from "@tanstack/react-router";
import { seedAdmins } from "@/lib/seed-admins.functions";

export const Route = createFileRoute("/api/public/seed-admins")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-seed-token");
        if (token !== "ats-seed-2026-once") {
          return new Response("forbidden", { status: 403 });
        }
        const result = await seedAdmins();
        return new Response(JSON.stringify(result), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
