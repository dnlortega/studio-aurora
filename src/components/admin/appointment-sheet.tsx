"use client";

import { useRouter } from "next/navigation";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function AppointmentSheet({
  closeHref,
  dayLabel,
  children,
}: {
  closeHref: string;
  dayLabel: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.push(closeHref, { scroll: false });
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border/70 px-5 py-4">
          <SheetTitle>Detalhes do agendamento</SheetTitle>
          <SheetDescription className="tabular-nums">
            {dayLabel}
          </SheetDescription>
        </SheetHeader>
        <div className="p-4 sm:p-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
