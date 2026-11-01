import { z } from "zod";

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido (HH:MM).");

const dayString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");

export const emailSchema = z
  .string()
  .trim()
  .min(5, "Informe seu e-mail.")
  .email("E-mail inválido.")
  .transform((value) => value.toLowerCase());

const strongPassword = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .max(72, "A senha é muito longa.")
  .regex(/[A-Za-zÀ-ÿ]/, "Inclua ao menos uma letra.")
  .regex(/\d/, "Inclua ao menos um número.");

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Informe seu nome completo.")
      .max(80, "Nome muito longo."),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value.replace(/\D/g, "") : undefined))
      .refine(
        (value) => !value || value.length >= 10,
        "Informe um telefone com DDD.",
      ),
    password: strongPassword,
    confirmPassword: z.string(),
    next: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "Token inválido."),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo.").max(80),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.replace(/\D/g, "") : undefined))
    .refine(
      (value) => !value || value.length >= 10,
      "Informe um telefone com DDD.",
    ),
  notifyEmail: z.boolean().default(true),
  notifyWhatsapp: z.boolean().default(false),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export const bookingSchema = z.object({
  day: dayString,
  startMinute: z.coerce.number().int().min(0).max(1439),
  serviceIds: z
    .array(z.string().uuid("Serviço inválido."))
    .min(1, "Selecione pelo menos um serviço.")
    .max(6, "Selecione menos serviços."),
  notes: z.string().trim().max(400, "Observação muito longa.").optional(),
});

export const rescheduleSchema = bookingSchema.extend({
  appointmentId: z.string().uuid(),
});

export const cancelSchema = z.object({
  appointmentId: z.string().uuid(),
  reason: z.string().trim().max(300).optional(),
});

export const adminBookingSchema = bookingSchema.extend({
  clientId: z.string().uuid("Selecione uma cliente."),
});

export const statusSchema = z.object({
  appointmentId: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]),
  reason: z.string().trim().max(300).optional(),
});

export const paymentSchema = z.object({
  appointmentId: z.string().uuid(),
  paid: z.boolean(),
});

export const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(3, "Informe o nome do serviço.").max(80),
  description: z.string().trim().max(500).optional(),
  price: z.coerce
    .number()
    .min(0, "O preço não pode ser negativo.")
    .max(100000, "Preço acima do limite."),
  durationMin: z.coerce
    .number()
    .int()
    .min(5, "Duração mínima de 5 minutos.")
    .max(480, "Duração máxima de 8 horas."),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine(
      (value) => !value || value.startsWith("/") || /^https?:\/\//.test(value),
      "Informe uma URL válida ou um caminho interno.",
    ),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

export const businessHourSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    isOpen: z.boolean(),
    open: timeString,
    close: timeString,
    breakStart: z.string().optional(),
    breakEnd: z.string().optional(),
  })
  .refine(
    (data) => !data.isOpen || data.close > data.open,
    "O fechamento deve ser depois da abertura.",
  )
  .refine(
    (data) =>
      !data.isOpen ||
      !data.breakStart ||
      !data.breakEnd ||
      data.breakEnd > data.breakStart,
    "O fim do intervalo deve ser depois do início.",
  );

export const businessHoursSchema = z
  .array(businessHourSchema)
  .length(7, "Envie os sete dias da semana.");

export const blockSchema = z
  .object({
    day: dayString,
    start: timeString,
    end: timeString,
    reason: z.string().trim().min(3, "Descreva o motivo.").max(200),
  })
  .refine((data) => data.end > data.start, "O fim deve ser depois do início.");

export const settingsSchema = z.object({
  salonName: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(120),
  description: z.string().trim().max(800).optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  email: z.string().trim().max(120).optional(),
  instagram: z.string().trim().max(80).optional(),
  timezone: z.string().trim().min(3).max(60),
  slotGranularityMin: z.coerce.number().int().min(5).max(120),
  minLeadMinutes: z.coerce.number().int().min(0).max(20160),
  maxLeadDays: z.coerce.number().int().min(1).max(365),
  cancelMinHours: z.coerce.number().int().min(0).max(720),
  rescheduleMinHours: z.coerce.number().int().min(0).max(720),
  maxServicesPerBooking: z.coerce.number().int().min(1).max(6),
  autoConfirm: z.boolean().default(true),
  publicNotice: z.string().trim().max(300).optional(),
});

export const adminClientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(3, "Informe o nome.").max(80),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.replace(/\D/g, "") : undefined)),
  password: z.string().optional(),
  isActive: z.boolean().default(true),
});

export function flattenFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
