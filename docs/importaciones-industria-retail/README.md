# Paquete de implementación

Preparación para incorporar **Mercado → Importaciones Industria Retail** al portal.

- `PROMPT_MAESTRO.md`: instrucción completa para la sesión desde la red Forus.
- `REGLAS_NEGOCIO.json`: reglas entregadas, normalizadas y legibles por código.
- `DIAGNOSTICO_BIGQUERY.sql`: descubrimiento de esquema y consultas de conciliación.
- `DECISIONES_Y_PRUEBAS.md`: ambigüedades detectadas, controles y criterio de habilitación.

No contiene credenciales, datos descargados ni valores simulados. La implementación debe permanecer dentro del proyecto actual; una segunda aplicación aumentaría mantenimiento y riesgo de divergencia sin aportar aislamiento útil.
