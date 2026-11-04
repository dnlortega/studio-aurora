import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function AdminLoading() {
  return (
    <PageSkeleton cards={4} label="Carregando o painel administrativo" />
  );
}
