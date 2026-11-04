import type { Metadata } from "next";

import {
  BookingScreen,
  type BookingSearchParams,
} from "@/components/booking/booking-screen";

/**
 * A página inicial é o próprio agendamento. Não existe landing page: quem abre
 * o site já escolhe serviços, vê horários livres e confirma.
 */
export const metadata: Metadata = {
  title: "Reserve seu horário",
  description:
    "Escolha manicure, pedicure ou unhas em gel, veja os horários realmente livres na agenda e confirme seu atendimento online.",
  alternates: { canonical: "/" },
};

export default function HomePage({
  searchParams,
}: {
  searchParams: BookingSearchParams;
}) {
  return <BookingScreen searchParams={searchParams} />;
}
