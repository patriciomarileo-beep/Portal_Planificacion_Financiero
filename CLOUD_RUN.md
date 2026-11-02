# Despliegue en Cloud Run

La aplicación usa Next.js standalone y Google Workspace. El acceso por correo sin credenciales está retirado, también en desarrollo. Las sesiones anteriores deben iniciar sesión nuevamente.

## Despliegue por GitLab

El despliegue usa la plantilla `forus-corp/planificacion-comercial/ci-templates` (ref v2):

- En el MR corren SAST, dependencias, contenedor, secretos y `security-regression`. La SCAN POLICY del grupo exige que pasen.
- En `main`, Cloud Build publica la imagen en Artifact Registry y el job manual `deploy` actualiza la imagen del servicio `plataforma-planificacion-financiera` en `forus-cl-planificacion`, región `us-east4`.
- El pipeline solo cambia la imagen. La cuenta de servicio, las variables, el secreto e IAP se configuran una vez en el servicio y se conservan entre despliegues.
- El acceso pasa primero por IAP, solo para cuentas de `forus.cl`, y después por el login de Google del portal con su tabla de usuarios.

El despliegue manual descrito más abajo queda solo como respaldo.

## Si la SCAN POLICY bloquea el MR

El pipeline puede quedar en verde y el MR seguir bloqueado. El motivo está en el comentario de `GitLab-Security-Bot` del MR, en "Violations blocking this merge request".

- "Newly detected" significa que el hallazgo no estaba en el último pipeline de `main`, no que lo haya traído el MR. Una CVE publicada después de ese pipeline bloquea aunque el MR no toque dependencias.
- Si el hallazgo indica versión corregida ("Upgrade to ..."), súbela. Si es una dependencia indirecta, fuérzala en `overrides` de `package.json` bajo el paquete que la trae (por ejemplo `miniflare` con `undici`) y regenera el lock con `npm install --package-lock-only`. En el diff del lock solo debe cambiar esa dependencia.
- Si no hay versión corregida, pide una aprobación al grupo `forus-corp/ciberseguridad` explicando por qué no aplica. La aprobación se pierde con cada push.
- No uses `npm audit fix --force` ni bajes versiones de frameworks para cerrar un hallazgo.

Para evitarlo:

- Antes de abrir el MR, corre `npm audit --audit-level=high`. Usa otra base de vulnerabilidades que GitLab, pero detecta la mayoría de los casos de dependencias.
- `wrangler`, `miniflare` y `@cloudflare/vite-plugin` solo los usa `npm run dev` (vinext) y la imagen de Cloud Run no los incluye. Pasar el desarrollo local a `next dev` y sacarlos de `devDependencies` elimina buena parte de los hallazgos de dependencias.

## Configuración obligatoria

Crea `.env.cloudrun` desde `cloudrun.env.example` y configura:

- `CLOUD_RUN_PROJECT` y `CLOUD_RUN_REGION`.
- `CLOUD_RUN_SERVICE_ACCOUNT`: cuenta de servicio dedicada.
- `CLOUD_RUN_AUTH_SECRET`: referencia de Secret Manager, por ejemplo `AUTH_SESSION_SECRET:3`. Genera al menos 32 bytes aleatorios; no reutilices secretos de ejemplo.
- `GOOGLE_OAUTH_CLIENT_ID`: cliente web propio, con el origen HTTPS registrado en Google Identity Services y cuentas Workspace de `forus.cl`.
- `APP_ORIGIN`: origen exacto HTTPS sin ruta ni barra final. Ejemplo: `https://portal.empresa.cl`.
- `CLOUD_RUN_IMAGE`: imagen de Artifact Registry/GCR identificada por `@sha256:...`. Los tags mutables no se aceptan.
- Trivy oficial disponible en `PATH` o mediante `TRIVY_BINARY`. El despliegue falla si no puede completar el escaneo o encuentra HIGH/CRITICAL.

En desarrollo, usa `.env.local`, un secreto independiente y el cliente OAuth con el origen local autorizado. Para iniciar sesión, Google debe estar configurado y `DISABLE_GOOGLE_LOGIN` debe ser false. La cookie Secure se exige en producción; HTTP se permite solo para desarrollo.

En producción se usa la cuenta de servicio adjunta mediante ADC/Workload Identity. No empaquetes credenciales ni refresh tokens de personas. Limita BigQuery Job User al proyecto de consultas, lectura a las tablas necesarias y escritura a las tablas que administran usuarios/capturan planificación. Concede acceso al secreto solamente a esa cuenta. Google Sheets también requiere compartir la hoja con la identidad usada.

## Verificaciones

```bash
npm ci
npm run audit:production
npm run test:security
npm run test:security:patches
npm run test:security:deployment
npm run lint
npm run build:cloudrun
npm run test:security:http
npm run test:security:assets
```

Revisa también `npm audit`: conserva ocho alertas de desarrollo con backport local de braces, detalladas en `docs/security-validation-2026-10-21.md`. La auditoría completa de CI continúa bloqueada por ellas; el parche no constituye una excepción corporativa. No usar `npm audit fix --force` para degradar frameworks sin revisión.

## Despliegue privado

Primero construye y escanea la imagen en un agente con Docker, o utiliza `cloudbuild.security.yaml` con un repositorio Artifact Registry existente:

```bash
gcloud builds submit --config cloudbuild.security.yaml --substitutions _IMAGE=REGION-docker.pkg.dev/PROJECT/REPOSITORY/portal:security .
```

El pipeline publica la imagen solo tras superar el escaneo de la imagen final. Obtén su digest desde Artifact Registry y configura `CLOUD_RUN_IMAGE=REGION-docker.pkg.dev/PROJECT/REPOSITORY/portal@sha256:DIGEST` en `.env.cloudrun`. El script vuelve a escanear ese mismo digest antes de desplegar; necesita acceso de lectura al registro. La cuenta de Cloud Build requiere permisos mínimos para construir, registrar resultados y publicar en ese repositorio.

```bash
npm run deploy:cloudrun -- --dry-run
npm run deploy:cloudrun
```

El script despliega la imagen ya construida con `--image` y pasa explícitamente `--no-allow-unauthenticated`, solicitando retirar el permiso público incluso si el servicio ya existía. El modo dry-run muestra el escaneo y el despliegue sin ejecutarlos. Cambiar el código no modifica un servicio publicado por sí solo.

Configura los invocadores IAM autorizados o un balanceador con IAP para el acceso de colaboradores desde navegador. IAM/IAP y el login de la aplicación son controles independientes. Comprueba las políticas IAM y el acceso al dominio run.app después del despliegue.

La excepción pública exige `CLOUD_RUN_ALLOW_UNAUTHENTICATED=true` y `CLOUD_RUN_PUBLIC_ACCESS_REASON`. La justificación no instala IAP ni una defensa de red: infraestructura debe verificar el control equivalente y bloquear accesos directos que lo evadan.

## Imagen y mantenimiento

El Dockerfile fija por digest las imágenes oficiales de build y runtime Debian 13. El runtime distroless no incluye shell ni npm y usa el usuario 65532. Los archivos privados se copian fuera de public. El parche verificado de braces se aplica en la etapa de dependencias. Se retiró el runtime Debian 12 cuyo digest conservaba alertas de OpenSSL.

En un agente con Docker y Trivy:

```bash
docker build --pull --no-cache -t rentabilidad-tiendas-2027:security .
trivy image --scanners vuln --severity HIGH,CRITICAL --exit-code 1 rentabilidad-tiendas-2027:security
```

Actualizar los digests, reconstruir y escanear al menos semanalmente y ante avisos de seguridad. Reconstruir un digest fijo no incorpora parches de la base. `.gitlab-ci.yml` prepara SAST, auditoría y secretos; `cloudbuild.security.yaml` bloquea imágenes finales con HIGH/CRITICAL. No omitir CVE sin evaluar alcance y aprobación según la norma de FORUS. Los controles ya están conectados al pipeline del grupo; falta definir la cadencia semanal de reconstrucción. La base nueva del builder conserva alertas altas; su tratamiento está registrado en la revalidación.
## Acceso local y renovación de BigQuery

La autenticación del portal y la credencial con la que el servidor consulta BigQuery son independientes. Iniciar sesión en Google en el portal no renueva automáticamente las credenciales ADC del equipo.

En PowerShell, desde la carpeta del proyecto:

```powershell
$env:CLOUDSDK_CONFIG = Join-Path (Get-Location).Path '.gcloud'
gcloud.cmd auth application-default login --project=forus-cl-planificacion
npm.cmd run bigquery:smoke
npm.cmd run start:local
```

Completa la ventana de Google con la cuenta corporativa que tenga acceso al proyecto y a las tablas. El archivo ADC permanece en `.gcloud`, excluido de Git y del contenedor. El arranque local busca archivos existentes y conserva una ruta explícita válida. `.env.local` debe apuntar al ADC del equipo actual y usar `APP_ORIGIN=http://localhost:3000` para ese acceso local.

Si aparece `invalid_rapt` o `invalid_grant`, la política corporativa requiere iniciar sesión otra vez; no se soluciona con un token fijo ni deshabilitando el control de acceso. Después de renovar o cambiar la ruta de credenciales, reinicia el servidor para que cargue la configuración.

El diagnóstico `bigquery:smoke` usa GoogleAuth, igual que el servidor productivo, y solo cuenta filas; no imprime tokens ni contenido de usuarios. Una consulta correcta valida la lectura con la identidad del servidor. El portal seguirá exigiendo Google Workspace y una cuenta activa en su tabla de usuarios.
