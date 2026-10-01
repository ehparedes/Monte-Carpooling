import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import type { CommunityStatus } from "./community-gate";

export function InviteCallout() {
  const { data } = useQuery({
    queryKey: ["community-status"],
    queryFn: async (): Promise<CommunityStatus> => {
      const res = await fetch("/api/community/status", { credentials: "include" });
      if (!res.ok) throw new Error("community-status");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  if (!data || data.status !== "active") return null;
  const remaining = data.invitesRemaining ?? 0;
  const open = data.openInvites ?? 0;
  if (!data.isAdmin && remaining <= 0 && open <= 0) return null;

  const detail = data.isAdmin
    ? "Invitaciones ilimitadas"
    : remaining > 0
      ? `Te ${remaining === 1 ? "queda 1 invitación" : `quedan ${remaining} invitaciones`}`
      : `Tenés ${open === 1 ? "1 invitación generada" : `${open} invitaciones generadas`} sin usar`;

  return (
    <Link href="/invitar">
      <div
        className="flex cursor-pointer items-center gap-3 rounded-2xl p-4 text-white shadow-lg transition-transform active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, #1A8EA3, #3D7A28)" }}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <UserPlus className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">Invitá a tus vecinos</p>
          <p className="text-sm text-white/85">{detail}. Compartila por WhatsApp.</p>
        </div>
        <span className="text-2xl leading-none text-white/80">›</span>
      </div>
    </Link>
  );
}
