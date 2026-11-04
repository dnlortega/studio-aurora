import type { Metadata } from "next";

import {
  BookingScreen,
  bookingMetadata,
  type BookingSearchParams,
} from "@/components/booking/booking-screen";

/**
 * `/agendar` é o atalho histórico da tela de agendamento — hoje a própria
 * página inicial. Continua existindo para links antigos (e-mails, painel do
 * cliente) e aponta para a mesma tela, com o canonical resolvido na raiz.
 */
export const metadata: Metadata = {
  ...bookingMetadata,
  alternates: { canonical: "/" },
};

export default function BookingPage({
  searchParams,
}: {
  searchParams: BookingSearchParams;
}) {
  return <BookingScreen searchParams={searchParams} />;
}
