# Correcciones de seguridad — 21 de octubre de 2026

**Actualización:** consultar la [revalidación posterior](security-validation-2026-10-21.md), que incorpora escaneo real de las bases, reemplazo del runtime Debian 12, mitigación local de braces y gates de despliegue/CI.

Referencia: informe FORUS del 14 de octubre de 2026, revisión SAST/IaC/SCA sobre dcbd240. Se revisó el árbol local actual, con funcionalidades posteriores al commit auditado. Los cambios se implementaron localmente; no se desplegó ni certificó un entorno de producción.

## Estado por hallazgo

| ID | Corrección | Estado |
| --- | --- | --- |
| F-01 | POST /api/auth/email devuelve 410 sin cookie. Retirados el formulario por correo y la excepción de administrador local. Sesión versión 2 invalida cookies antiguas. | Corregido en código |
| F-02 | Proxy deniega API nuevas por defecto. Handlers de importaciones, países, usuarios, datos del portal, archivos y captura verifican sesión/usuario activo antes de consultar caché, fuente o respaldo. | Corregido y probado por HTTP |
| F-03 | Next.js 16.4.2, React/React DOM y RSC 19.3.1, lockfile actualizado. Superado el mínimo 16.3.8 del PDF por el aviso oficial posterior. Auditoría de producción sin vulnerabilidades reportadas. | Corregido localmente |
| F-04 | Default privado, flag explícito --no-allow-unauthenticated, cuenta de servicio/secreto/cliente OAuth/origen obligatorios. Excepción pública requiere justificación. | Código corregido; IAM/IAP real pendiente de despliegue y validación |
| F-05 | Creación y borrado de cookie con Secure en producción, HttpOnly y SameSite=Lax. HTTP solo en desarrollo local. | Corregido y probado |
| F-06 | Cliente OAuth obligatorio, fallo cerrado si falta o está deshabilitado. Verificador oficial comprueba firma, aud, iss y exp; se exige email_verified, sub y dominio Workspace hd=forus.cl. | Corregido y probado con mocks; falta login real del destino |
| F-07 | CSP con nonce por respuesta, HSTS en producción, nosniff, DENY, Referrer-Policy, Permissions-Policy. HTML dinámico y sin caché compartida. | Corregido; HTML, scripts y cabeceras verificados por HTTP |
| F-08 | Build y runtime fijados por digests de registros oficiales; runtime distroless no root. Cadencia semanal y comandos de escaneo documentados. | Implementado; escaneo de imagen final y automatización corporativa pendientes |
| F-09 | HMAC con crypto.subtle.verify. Cookies malformadas, expiradas o alteradas rechazadas. UTF-8 para nombres. | Corregido y probado |
| F-10 | *.log, tmp, output y .venv excluidos de Git/contexto Docker. Este árbol no tenía logs bajo control de Git; se conservaron los diagnósticos locales. | Corregido para cambios futuros; historial no reescrito |
| F-11 | xlsx 0.20.3 desde CDN oficial de SheetJS con integridad en lockfile. Conservados importación/exportación y script de datos; límites de tamaño, filas y valores finitos. | Corregido localmente; npm audit no cubre exhaustivamente el paquete externo al registro |
| F-12 | Tooling actualizado, correcciones transitivas y overrides esbuild/fflate. Persiste braces 3.0.3 sin versión corregida publicada en npm, vía lint/vinext. | Parcial: parche o sustitución compatible pendiente |
| F-13 | Mensajes genéricos con errorId y diagnóstico en servidor. Errores internos no reenviados al cliente, tampoco en respaldos. | Corregido y probado |

## Protección adicional de datos

Los snapshots de base, rentabilidad, m² y contratos se consumen desde /api/portal-data tras autenticar, mediante contexto React. Se retiraron imports de datos de componentes cliente y se conservaron cálculos y escenarios. Los CSV/PDF antes alojados en public/data están en private-data/assets y se sirven desde un handler autenticado con validación de ruta. El generador de datos usa el nuevo destino.

La comprobación de artefactos públicos compara 66 muestras de ambas bases financieras contra los archivos compilados. Es una regresión útil, no una prueba exhaustiva de ausencia de toda información comercial.

Las autorizaciones leen rol/estado activo de BigQuery en cada solicitud sensible; cambios de permisos y desactivaciones afectan sesiones vigentes. Login/escrituras validan Origin contra APP_ORIGIN. JSON se limita por bytes realmente leídos. Se conservan parámetros nombrados en BigQuery y se validan identificadores de tablas.

Las excepciones públicas explícitas son configuración OAuth, autenticación/sesión/logout e indicadores/dólar usados en la pantalla de acceso. Estos indicadores provienen de fuentes económicas públicas, sin consultar datos financieros internos. Una API nueva queda cerrada por defecto y debe verificar autorización en su handler.

## Verificaciones y límites

- 14 pruebas de autenticación, sesiones, permisos, CSRF, errores y rutas. Usan mocks de Google/BigQuery y no escriben en servicios reales.
- Build Next.js de producción, TypeScript y ESLint sin errores; persisten advertencias de UI en la salida de ESLint.
- Pruebas HTTP sobre el build: API/archivos privados 401, email 410, Google sin configurar 503 y origen externo 403. Nonce por respuesta y scripts HTML con el nonce correcto.
- npm audit --omit=dev --audit-level=low: 0 vulnerabilidades reportadas. No certifica ausencia absoluta de vulnerabilidades en SO, nube o paquetes fuera del catálogo npm.
- Auditoría completa: 0 críticas, 0 moderadas y 8 alertas altas correspondientes a braces y sus dependientes de desarrollo, sin parche publicado; fuera del árbol de producción. No se aplicaron degradaciones inseguras sugeridas por audit fix --force.
- Sin Docker ni Trivy en este equipo: no se ejecutó el escaneo de imagen final. Los digests no certifican ausencia de CVE.
- No se probó login con identidad real ni se modificaron IAM, IAP, secretos o servicios publicados. Configurar/verificar estas piezas y probar una cuenta corporativa es obligatorio antes de promover.

## Fuentes

- [Aviso oficial de Next.js del 14 de octubre](https://nextjs.org/blog/nextjs-security-update-october-14-2026).
- [Validación de ID tokens de Google](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
- [CSP de Next.js](https://nextjs.org/docs/app/guides/content-security-policy).
- [Distribución oficial de SheetJS](https://cdn.sheetjs.com/).
- [Alerta pendiente de braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

F-12 y las verificaciones pendientes de infraestructura impiden afirmar que el desarrollo está libre de vulnerabilidades o que ya cumple todo el Definition of Done de FORUS.
