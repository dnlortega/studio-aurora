"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { IconButton, IconSubmitButton } from "@/components/shared/icon-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "pending", label: "Pendente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
  { value: "no_show", label: "Não compareceu" },
];

export function AppointmentFilters({
  initialStatus,
  initialService,
  initialFrom,
  initialTo,
  initialQuery,
  services,
}: {
  initialStatus: string;
  initialService: string;
  initialFrom: string;
  initialTo: string;
  initialQuery: string;
  services: { id: string; name: string; isActive: boolean }[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus || "all");
  const [service, setService] = useState(initialService || "all");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [query, setQuery] = useState(initialQuery);

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (service !== "all") params.set("servico", service);
    if (from) params.set("de", from);
    if (to) params.set("ate", to);
    if (query.trim()) params.set("q", query.trim());
    const search = params.toString();
    router.push(search ? `/admin/agendamentos?${search}` : "/admin/agendamentos");
  }

  function clear() {
    setStatus("all");
    setService("all");
    setFrom("");
    setTo("");
    setQuery("");
    router.push("/admin/agendamentos");
  }

  return (
    <form
      onSubmit={apply}
      className="rounded-xl border border-border/70 bg-card p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[10rem_11rem_9.5rem_9.5rem_minmax(0,1fr)_auto]">
        <div className="space-y-1">
          <label htmlFor="filter-status" className="text-[0.68rem] text-muted-foreground">
            Status
          </label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(String(value ?? "all"))}
          >
            <SelectTrigger id="filter-status" className="w-full">
              <SelectValue>
                {(value) =>
                  STATUS_OPTIONS.find((item) => item.value === value)?.label ??
                  "Todos os status"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-service" className="text-[0.68rem] text-muted-foreground">
            Serviço
          </label>
          <Select
            value={service}
            onValueChange={(value) => setService(String(value ?? "all"))}
          >
            <SelectTrigger id="filter-service" className="w-full">
              <SelectValue>
                {(value) =>
                  services.find((item) => item.id === value)?.name ??
                  "Todos os serviços"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os serviços</SelectItem>
              {services.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                  {item.isActive ? "" : " (inativo)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-from" className="text-[0.68rem] text-muted-foreground">
            De
          </label>
          <Input
            id="filter-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-to" className="text-[0.68rem] text-muted-foreground">
            Até
          </label>
          <Input
            id="filter-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-query" className="text-[0.68rem] text-muted-foreground">
            Cliente
          </label>
          <Input
            id="filter-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, e-mail ou telefone"
          />
        </div>

        <div className="flex items-end gap-2">
          <IconSubmitButton label="Filtrar" icon={<Search className="size-4" />} />
          <IconButton
            label="Limpar"
            type="button"
            variant="ghost"
            onClick={clear}
          >
            <X className="size-4" />
          </IconButton>
        </div>
      </div>
    </form>
  );
}
