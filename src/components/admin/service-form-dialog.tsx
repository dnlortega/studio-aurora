"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { deleteServiceAction, saveServiceAction } from "@/actions/admin";
import { IconButton, IconSubmitButton } from "@/components/shared/icon-button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Service } from "@/lib/db/schema";

export function ServiceFormDialog({
  trigger,
  service,
}: {
  trigger: React.ReactElement;
  service?: Service;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(service);

  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [price, setPrice] = useState(
    service ? (service.priceCents / 100).toFixed(2) : "",
  );
  const [duration, setDuration] = useState(
    service ? String(service.durationMin) : "60",
  );
  const [imageUrl, setImageUrl] = useState(service?.imageUrl ?? "");
  const [sortOrder, setSortOrder] = useState(String(service?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setName(service?.name ?? "");
    setDescription(service?.description ?? "");
    setPrice(service ? (service.priceCents / 100).toFixed(2) : "");
    setDuration(service ? String(service.durationMin) : "60");
    setImageUrl(service?.imageUrl ?? "");
    setSortOrder(String(service?.sortOrder ?? 0));
    setIsActive(service?.isActive ?? true);
    setErrors({});
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    startTransition(async () => {
      const result = await saveServiceAction({
        id: service?.id,
        name,
        description: description.trim() || undefined,
        price: price.replace(",", "."),
        durationMin: duration,
        imageUrl: imageUrl.trim() || undefined,
        isActive,
        sortOrder,
      });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar serviço" : "Novo serviço"}
          </DialogTitle>
          <DialogDescription>
            Alterações de preço e duração valem para novos agendamentos. Os
            atendimentos já registrados preservam os valores originais.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="service-name">Nome do serviço</Label>
            <Input
              id="service-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Corte autoral"
              maxLength={80}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="service-description">Descrição</Label>
            <textarea
              id="service-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Como o serviço é apresentado no site."
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive"
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="service-price">Preço (R$)</Label>
              <Input
                id="service-price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="0,00"
                aria-invalid={Boolean(errors.price)}
              />
              {errors.price ? (
                <p className="text-xs text-destructive">{errors.price}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-duration">Duração (min)</Label>
              <Input
                id="service-duration"
                type="number"
                min="5"
                max="480"
                step="5"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                aria-invalid={Boolean(errors.durationMin)}
              />
              {errors.durationMin ? (
                <p className="text-xs text-destructive">{errors.durationMin}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-order">Ordem</Label>
              <Input
                id="service-order"
                type="number"
                min="0"
                max="999"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                aria-invalid={Boolean(errors.sortOrder)}
              />
              {errors.sortOrder ? (
                <p className="text-xs text-destructive">{errors.sortOrder}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="service-image">Imagem (URL ou caminho interno)</Label>
            <Input
              id="service-image"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="/imagens/servico.jpg ou https://…"
              aria-invalid={Boolean(errors.imageUrl)}
            />
            {errors.imageUrl ? (
              <p className="text-xs text-destructive">{errors.imageUrl}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
            <div>
              <p className="text-sm font-medium">Serviço ativo</p>
              <p className="text-xs text-muted-foreground">
                Inativos ficam ocultos no site e não podem ser agendados.
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked)}
              aria-label="Serviço ativo"
            />
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Cancelar"
                  title="Cancelar"
                  disabled={pending}
                >
                  <X className="size-4" />
                </Button>
              }
            />
            <IconSubmitButton
              label={editing ? "Salvar serviço" : "Criar serviço"}
              pending={pending}
              icon={
                editing ? <Save className="size-4" /> : <Plus className="size-4" />
              }
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteServiceButton({
  serviceId,
  serviceName,
}: {
  serviceId: string;
  serviceName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteServiceAction(serviceId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-destructive"
            aria-label={`Excluir ${serviceName}`}
            title={`Excluir ${serviceName}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir “{serviceName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            O serviço será removido definitivamente do banco de dados. Os
            agendamentos antigos preservam nome, preço e duração registrados no
            momento da reserva.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            size="icon"
            aria-label="Cancelar"
            title="Cancelar"
            disabled={pending}
          >
            <X className="size-4" />
          </AlertDialogCancel>
          <IconButton
            label="Confirmar"
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </IconButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
