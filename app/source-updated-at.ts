const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const formatSourceUpdatedAt = (value: string | null | undefined) => {
  if (!value) return "Sin fecha informada";

  if (dateOnlyPattern.test(value)) {
    const date = new Date(`${value}T12:00:00Z`);
    return `${new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(date)} · hora no informada`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha informada";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(date);
};
