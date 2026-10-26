# Revalidación de seguridad FORUS — 21 de octubre de 2026

Se contrastaron los 13 hallazgos con el PDF original de 12 páginas, SHA-256 `ea47306075b57a778d7b1f9e798de228f41eccc84706d28c27e72a846327e699`, y el árbol local actual. «Audit-only» describe la revisión histórica; los cambios actuales responden a la solicitud del usuario. No se modificaron datos de personas, IAM, secretos ni servicios de nube. Este documento actualiza el estado de la primera revisión local.

## Estado por hallazgo

| ID | Resultado de la revalidación | Estado |
| --- | --- | --- |
| F-01 | Correo sin credenciales devuelve 410 sin cookie. Google Workspace, correo verificado y usuario activo obligatorios. Cookies antiguas rechazadas. | Resuelto en código/pruebas. |
| F-02 | Proxy privado por defecto y autorización en handlers antes de consultar fuente, caché o respaldo. Archivos y snapshots financieros autenticados. | Resuelto en código y pruebas unitarias/HTTP. |
| F-03 | Next 16.4.2, React/React DOM/RSC 19.3.1, sharp 0.35.5. Auditoría npm de producción sin alertas. | Dependencias de producción actualizadas. |
| F-04 | Despliegue privado por defecto; cuenta de servicio, secreto, cliente OAuth y origen HTTPS obligatorios. Se exige imagen por digest y escaneo previo. Excepción pública requiere justificación. | Código corregido; IAM/IAP real pendiente. |
| F-05 | Cookie creada y borrada con Secure en producción, HttpOnly, SameSite=Lax y expiración limitada. | Resuelto y probado. |
| F-06 | Verificador oficial con firma, audiencia, emisor y expiración; falla cerrado sin cliente OAuth. Exige identidad Workspace `hd=forus.cl`. | Resuelto en código; login del destino de nube pendiente. |
| F-07 | CSP con nonce por respuesta, HSTS, nosniff, DENY, Referrer-Policy y Permissions-Policy. Datos privados sin caché compartida. | Implementado y probado por HTTP. |
| F-08 | Detectado OpenSSL vulnerable en runtime Debian 12 anterior; sustituido por distroless Node 22/Debian 13 no root, fijado por digest y escaneado. | Base de runtime corregida; imagen final pendiente. |
| F-09 | HMAC verificado con `crypto.subtle.verify`. Rechazo de cookies alteradas, vencidas, antiguas y malformadas. | Resuelto y probado. |
| F-10 | Logs, temporales, `.venv`, `.vinext` y credenciales excluidos. `.aws`, `.agents` y `.codex` fuera del contexto Docker. Gitleaks sobre historial y archivos publicables. | Sin claves reales detectadas en el alcance revisado; historial sin reescribir. |
| F-11 | SheetJS oficial 0.20.3 desde CDN con integridad en lockfile; controles existentes de tamaño, filas y números finitos. | Paquete vulnerable sustituido; npm no cubre exhaustivamente paquetes externos a su registro. |
| F-12 | Versiones del informe actualizadas. Backport local verificado para limitar profundidad de braces 3.0.3. Permanecen ocho alertas npm de desarrollo y alertas del builder. | Mitigación comprobada; no se declara cierre upstream ni aceptación de riesgo. |
| F-13 | Mensajes genéricos con errorId; diagnóstico solo en servidor. Autorización fallida no devuelve respaldos financieros. | Resuelto y probado. |

## Cambios adicionales

- Solo ADMINISTRADOR y ANALISTA FINANCIERO habilitan acceso. Cuentas activas con otro rol son rechazadas.
- Administración de usuarios: estado activo booleano, clave escalar y rol permitido. Retirar el rol exige desactivar la cuenta. Consultas conservan parámetros nombrados.
- Parche de braces basado en la propuesta upstream: límites de 100 niveles en parser/AST, comprobación SHA-256 antes/después, preservación de stringify y rechazo de estados inesperados. Se conservan nombre/versión originales y visibilidad de la alerta.
- El backport se verificó tras instalación limpia aislada mediante `npm ci --ignore-scripts` y ejecución explícita de postinstall. Pruebas de límites 100/101, 5000 niveles, AST, límites fraccionarios, expansión, escapes y consumidores glob.
- Se corrigió un falso positivo de Gitleaks provocado por marcadores PEM literales del parser, sin excluir archivos de autenticación ni cambiar la validación de llaves.
- Directorios temporales de auditoría fuera de TypeScript, Git y Docker.

## Escaneos de imágenes y dependencias

Herramientas oficiales: Trivy 0.76.1 y Gitleaks 8.30.1; descargas verificadas por SHA-256. Reportes locales en `tmp/security-*.json`, fuera de Git/Docker.

| Alcance | Resultado |
| --- | --- |
| Runtime anterior Debian 12, digest `13593b…` | Trivy: 1 CRITICAL y 6 HIGH de OpenSSL. Clasificación del escáner, sin explotación demostrada en esta aplicación. |
| Runtime nuevo `gcr.io/distroless/nodejs22-debian13:nonroot@sha256:6c19627684167feb45e7ab0b4938e01a4922fc4abd9abd430df07606a6ab0e26` | 0 HIGH/CRITICAL en la base Linux amd64. |
| Builder `node:22-trixie-slim@sha256:2e40f0b0227d54ea99362e190cc13331f023fc1eef064d3d73d23d9434e8b86f` | Alertas HIGH en sistema y herramientas npm, varias sin parche indicado. Este sistema y su npm global no se copian al runtime distroless. Requiere mantenimiento y evaluación formal de alcance. |
| Imagen final de la aplicación | Pendiente: no hay Docker disponible en este equipo. Escanear una base no sustituye el escaneo final. |
| `npm audit --omit=dev` | 0 alertas reportadas. |
| `npm audit` completo | 8 HIGH, relacionadas con braces/consumidores de desarrollo, con backport local aplicado. |

## Gates preparados

`.gitlab-ci.yml` añade plantilla oficial SAST, regresiones, auditoría completa y Gitleaks con imágenes fijadas por digest. El gate SAST exige un informe Semgrep exitoso y bloquea HIGH/CRITICAL. Si la instancia corporativa usa Advanced SAST debe adaptar la obtención del informe: su ausencia bloquea la promoción. La auditoría completa actualmente falla por las ocho alertas de desarrollo; no se añadió una excepción automática ni `allow_failure` para ocultarlas.

`cloudbuild.security.yaml` construye, guarda y escanea la imagen final con Trivy antes de publicarla. Bloquea HIGH/CRITICAL; JSON del escaneo en la salida de Cloud Build. Requiere repositorio Artifact Registry y permisos adecuados.

`deploy-cloudrun.mjs` exige `CLOUD_RUN_IMAGE` con digest, vuelve a escanear esa misma imagen y bloquea si el escáner falta o falla. Ya no despliega directamente desde fuente. `--dry-run` muestra los comandos sin ejecutar operaciones remotas.

Los archivos CI se validaron localmente; no se ejecutó un pipeline remoto. Integración con `ci-cd-templates`, aprobación corporativa, runners, cadencia semanal e IAM/IAP requieren configuración en FORUS. No se inventó una URL de plantilla interna ni se crearon despliegues o tareas programadas.

## Evidencias y límites

- 16 pruebas de autenticación, autorización, cookies, CSRF, errores y rutas.
- 4 pruebas del backport, también desde instalación limpia aislada.
- 3 pruebas del despliegue y gate SAST, sin operaciones remotas.
- Build productivo/TypeScript, lint, pruebas HTTP y búsqueda de snapshots privados en artefactos públicos.
- Comprobaciones en navegador de acceso rápido, carga diferida, cierre de sesión y visualización del dólar.

No se certifica ausencia absoluta de vulnerabilidades ni el cierre del Definition of Done corporativo. Antes de promover: escanear imagen final, tratar formalmente alertas de desarrollo/build, ejecutar CI y revisar IAM/IAP, Secret Manager y permisos mínimos.

## Fuentes primarias

- [Actualización de seguridad de Next.js](https://nextjs.org/blog/nextjs-security-update-october-14-2026).
- [Aviso braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) y [propuesta upstream](https://github.com/micromatch/braces/pull/72).
- [Distroless oficial](https://github.com/GoogleContainerTools/distroless) y [estado Debian de CVE-2026-31789](https://security-tracker.debian.org/tracker/CVE-2026-31789).
- [SAST GitLab](https://docs.gitlab.com/user/application_security/sast/).
