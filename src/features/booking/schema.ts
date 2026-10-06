import { z } from "zod";

export const slugParam = z.string().min(1).max(80);

export const availabilityQuery = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date debe ser YYYY-MM-DD"),
  staffId: z.string().min(1).default("any"),
});

export const createAppointmentBody = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().min(1).default("any"),
  startAt: z.string().datetime({ offset: true }),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(160).optional(),
  notes: z.string().trim().max(1000).optional(),
  idempotencyKey: z.string().uuid().optional(),
}).refine((v) => v.phone || v.email, {
  message: "phone o email requerido",
  path: ["phone"],
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentBody>;
