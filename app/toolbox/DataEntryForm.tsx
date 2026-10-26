"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2, LoaderCircle, Send, XCircle } from "lucide-react";
import { planningEntrySchema, type PlanningEntry } from "./schema";

type Toast = { kind: "success" | "error"; message: string } | null;

export default function DataEntryForm({ toast, setToast }: { toast: Toast; setToast: (toast: Toast) => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PlanningEntry>({
    resolver: zodResolver(planningEntrySchema),
    defaultValues: { jerarquia: "Marca", canal: "Retail", periodo: "2027-01", valorProyectado: 0, comentarios: "" },
  });
  const onSubmit = async (values: PlanningEntry) => {
    setToast(null);
    try {
      const response = await fetch("/api/ingesta-bigquery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json() as { ok?: boolean; error?: string; details?: string[] };
      if (!response.ok) throw new Error(payload.details?.join(" · ") || payload.error || "No se pudo guardar el registro.");
      setToast({ kind: "success", message: "Proyección enviada correctamente a BigQuery." });
      reset({ ...values, valorProyectado: 0, comentarios: "" });
    } catch (error) {
      setToast({ kind: "error", message: error instanceof Error ? error.message : "Error inesperado al enviar." });
    }
  };
  return <section className="toolbox-entry-card">
    <header><div><span>CAPTURA RÁPIDA</span><h2>Nueva proyección</h2></div><small>Streaming Insert · BigQuery</small></header>
    <form onSubmit={handleSubmit(onSubmit)}>
      <label>JERARQUÍA<select {...register("jerarquia")}><option>Marca</option><option>Clase</option><option>Género</option></select>{errors.jerarquia && <em>{errors.jerarquia.message}</em>}</label>
      <label>CANAL<select {...register("canal")}><option>Retail</option><option>Ecommerce</option><option>Wholesale</option></select>{errors.canal && <em>{errors.canal.message}</em>}</label>
      <label>PERÍODO<input type="month" {...register("periodo")} />{errors.periodo && <em>{errors.periodo.message}</em>}</label>
      <label>VALOR PROYECTADO<input type="number" min="0" step="0.01" {...register("valorProyectado", { valueAsNumber: true })} />{errors.valorProyectado && <em>{errors.valorProyectado.message}</em>}</label>
      <label className="wide">COMENTARIOS<textarea rows={3} placeholder="Supuestos, drivers o contexto de la proyección…" {...register("comentarios")} />{errors.comentarios && <em>{errors.comentarios.message}</em>}</label>
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="spin" /> : <Send />}{isSubmitting ? "ENVIANDO…" : "ENVIAR A BIGQUERY"}</button>
    </form>
    {toast && <div className={`toolbox-toast ${toast.kind}`}>{toast.kind === "success" ? <CheckCircle2 /> : <XCircle />}<span>{toast.message}</span><button type="button" onClick={() => setToast(null)}>×</button></div>}
  </section>;
}
