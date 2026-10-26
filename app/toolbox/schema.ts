import { z } from "zod";

export const planningEntrySchema = z.object({
  jerarquia: z.enum(["Marca", "Clase", "Género"]),
  canal: z.enum(["Retail", "Ecommerce", "Wholesale"]),
  periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Selecciona un mes válido."),
  valorProyectado: z.number().finite().min(0, "El valor debe ser mayor o igual a cero."),
  comentarios: z.string().trim().max(500, "Máximo 500 caracteres."),
});

export type PlanningEntry = z.infer<typeof planningEntrySchema>;
