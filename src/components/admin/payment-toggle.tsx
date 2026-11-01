"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { setPaymentAction } from "@/actions/admin";
import { IconButton } from "@/components/shared/icon-button";

export function PaymentToggle({
  appointmentId,
  paid,
}: {
  appointmentId: string;
  paid: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await setPaymentAction({ appointmentId, paid: !paid });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message ?? "Pagamento atualizado.");
      router.refresh();
    });
  }

  return (
    <IconButton
      label={paid ? "Marcar como não pago" : "Registrar pagamento recebido"}
      variant="outline"
      size="icon-sm"
      disabled={pending}
      onClick={handleToggle}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : paid ? (
        <Undo2 className="size-4" />
      ) : (
        <CircleDollarSign className="size-4" />
      )}
    </IconButton>
  );
}
