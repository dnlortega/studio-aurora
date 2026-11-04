import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function PainelLoading() {
  return <PageSkeleton cards={3} label="Carregando sua agenda" />;
}
