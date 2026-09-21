import { useMutation } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

export function useConfirmBooking(onSuccess?: () => void) {
  return useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await fetch(getApiUrl(`api/bookings/${bookingId}/confirm`), {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Error al confirmar reserva");
      }
      return res.json();
    },
    onSuccess,
  });
}

export function useRejectBooking(onSuccess?: () => void) {
  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: number; reason?: string }) => {
      const res = await fetch(getApiUrl(`api/bookings/${bookingId}/reject`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason ?? "" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Error al rechazar reserva");
      }
      return res.json();
    },
    onSuccess,
  });
}
