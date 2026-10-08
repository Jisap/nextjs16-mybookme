# MyBookMe — Documentación completa de la aplicación

> **SaaS multi-tenant de reservas de citas online para pequeños negocios** (peluquerías, barberías, estética, fisioterapia, tatuajes, etc.).
> Stack: **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + Prisma 6 + PostgreSQL + Supabase Auth + Zod 4 + date-fns-tz + Vitest**.
> Estado actual: producto funcional de extremo a extremo (onboarding → configuración → página pública → reserva → gestión → recordatorios). **Falta la implementación de Stripe en los pagos**: existe el modelo de datos y la UI de facturación/trial preparada, pero **no hay pasarela de pago real**; se implementará si se lleva a producción (ver §13).

---

## Índice

1. [Visión y áreas de la app](#1-visión-y-áreas-de-la-app)
2. [Arquitectura y principios](#2-arquitectura-y-principios)
3. [Stack y requisitos](#3-stack-y-requisitos)
4. [Instalación y puesta en marcha](#4-instalación-y-puesta-en-marcha)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Modelo de datos (Prisma + PostgreSQL)](#6-modelo-de-datos-prisma--postgresql)
7. [Autenticación, autorización y multi-tenancy](#7-autenticación-autorización-y-multi-tenancy)
8. [Availability Engine (núcleo del producto)](#8-availability-engine-núcleo-del-producto)
9. [Reglas de negocio transversales](#9-reglas-de-negocio-transversales)
10. [Rutas UI — qué hace cada una](#10-rutas-ui--qué-hace-cada-una)
11. [API — referencia completa](#11-api--referencia-completa)
12. [Flujos de extremo a extremo](#12-flujos-de-extremo-a-extremo)
13. [Facturación, trial y Stripe (pendiente)](#13-facturación-trial-y-stripe-pendiente)
14. [Notificaciones: email, recordatorios, ICS y cancelación](#14-notificaciones-email-recordatorios-ics-y-cancelación)
15. [Seguridad](#15-seguridad)
16. [Estructura de carpetas y capas de código](#16-estructura-de-carpetas-y-capas-de-código)
17. [Scripts, tests y QA](#17-scripts-tests-y-qa)
18. [Despliegue y cron](#18-despliegue-y-cron)
19. [Limitaciones conocidas y siguiente jornada](#19-limitaciones-conocidas-y-siguiente-jornada)

---

## 1. Visión y áreas de la app

MyBookMe tiene **dos grandes áreas**, tal como define `booking-saas-spec.md`:

| Área | Para quién | Qué permite |
|---|---|---|
| **Panel privado del negocio** (`/dashboard/*`, `/onboarding`) | Propietario / personal | Crear el negocio, configurar profesionales, servicios, horarios semanales, excepciones (vacaciones/festivos/bloqueos), ver KPIs, calendario día/semana, crear citas manuales, cambiar estados (confirmar/cancelar/completar/no-show), editar datos públicos y ver facturación. Requiere login Supabase + pertenencia `BusinessMember`. |
| **Página pública de reservas** (`/book/[slug]`, `/book/cancel/[token]`) | Cliente final | Sin cuenta: elige servicio → profesional (o “cualquiera”) → fecha → hora disponible → introduce nombre + teléfono/email → confirma. Recibe confirmación con botones Google/Outlook/ICS y enlace seguro de cancelación. Protegida con rate-limit + honeypot anti-bots. |

Más una **landing** (`/`) marketing y **login** (`/login`).

El principio fundamental del proyecto (spec §37) es: **no se diseña alrededor del calendario, sino alrededor del dominio**: `BUSINESS → SERVICES → STAFF → SCHEDULE → AVAILABILITY → APPOINTMENT`. El calendario es solo una vista.

---

## 2. Arquitectura y principios

Capas conceptuales (spec §3):

```text
UI (Server/Client Components en src/app + src/components)
  ↓
Application Services / Casos de uso (src/features/* con Prisma)
  ↓
Domain Services puros (src/domain/* sin I/O)
  ↓
Repository / Prisma (src/lib/db.ts → PostgreSQL)
  ↓
PostgreSQL (Supabase/Neon/local)
```

Reglas obligatorias para todo el código (spec §25, ADRs en `docs/ADR-*.md`):

1. **Lógica empresarial fuera de React.** El `Availability Engine` vive en `src/domain/availability/` puro y testeable; los componentes solo consumen API.
2. **Aislamiento multi-tenant estricto.** Todo está colgado de `Business`. El servidor nunca confía en un `businessId` enviado desde el navegador: lo resuelve desde sesión + `BusinessMember`.
3. **Validación server-side con Zod** en cada Route Handler.
4. **Disponibilidad mostrada ≠ garantía.** El frontend muestra slots, pero el servidor **recalcula/valida dentro de transacción** justo antes de crear la cita.
5. **Protección contra doble reserva** con doble defensa: `pg_advisory_xact_lock` por profesional/día + `EXCLUDE USING gist` en PostgreSQL (ver §6.3).
6. **Timezone por negocio**, nunca la del servidor. Todo se almacena en `timestamptz` y se convierte con `date-fns-tz`.
7. Documentar decisiones en ADRs:
   - `docs/ADR-001-auth-tenancy.md` → `User.id = auth.users.id (uuid)`, `businessId` siempre de membresía.
   - `docs/ADR-002-concurrencia.md` → advisory lock + exclusión + idempotencia + `blockedUntil`.
   - `docs/ADR-003-timezone-slots.md` → `fromZonedTime/formatInTimeZone`, `dayOfWeek = EXTRACT(DOW)`, tests DST Madrid.

---

## 3. Stack y requisitos

`package.json`:

- **Framework:** `next@^16.3.8`, `react@^19.2.3`, `react-dom@^19.2.3`.
- **Lenguaje:** `typescript@^5.9.3`.
- **Estilos:** `tailwindcss@^4.3.3`, `@tailwindcss/postcss`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-label`, `@radix-ui/react-slot`, `lucide-react`.
- **Datos/Auth:** `@prisma/client@^6.19.3`, `prisma@^6.19.3`, `@supabase/ssr`, `@supabase/supabase-js`.
- **Fechas:** `date-fns`, `date-fns-tz`.
- **Validación:** `zod@^4.6.5`.
- **Tests:** `vitest@^5.0.3`, `tsx` para scripts.

Requisitos para correr en local: Node 20+, PostgreSQL accesible (Supabase o local), cuenta Supabase (Auth), opcionalmente Resend para emails reales y `CRON_SECRET` para recordatorios.

Comandos (`package.json → scripts`):

```bash
npm run dev              # next dev
npm run build            # next build
npm run start            # next start
npm run lint             # eslint .
npm run typecheck        # tsc --noEmit
npm test                 # vitest run
npm run check            # typecheck + lint + test
npm run db:migrate       # prisma migrate dev
npm run db:studio        # prisma studio
npm run proof:booking    # tsx scripts/proof-booking.ts (prueba concurrencia E2E)
npm run link:owner       # tsx scripts/link-owner.ts (vincular usuario a negocio)
npm run qa:security      # tsx scripts/qa-security.ts (9 checks aislamiento)
npm run reminders        # tsx scripts/send-reminders.ts (envío manual recordatorios)
```

---

## 4. Instalación y puesta en marcha

1. Clonar e instalar:
   ```bash
   npm install
   cp .env.example .env   # y rellenar (ver §5)
   ```
2. Base de datos:
   ```bash
   npm run db:migrate
   # IMPORTANTE: aplicar prisma/manual-exclusion.sql a mano en la BD,
   # porque Prisma no genera EXCLUDE constraints.
   # Contiene: CREATE EXTENSION btree_gist + ALTER TABLE Appointment ADD CONSTRAINT no_overlap_per_staff ...
   ```
3. Seed demo (`prisma/seed.ts` + `prisma/seed-data.json`):
   Crea negocio `maria-nails` (“María Nails”), staff `María/Laura`, servicios `Manicura 45min / Pedicura 60min / Manicura+Pedicura 90min`, horario Lun–Vie `09:00-14:00` y `16:00-20:00`, `trialEndsAt = +30 días`.
4. Arrancar: `npm run dev` → `http://localhost:3000`.
   - Landing: `/`
   - Demo pública: `/book/maria-nails`
   - Login/registro: `/login`
   - Onboarding: `/onboarding`
   - Dashboard: `/dashboard`
5. Vincular un usuario a un negocio existente (si hace falta):
   ```bash
   npm run link:owner -- email=tu@email.com slug=maria-nails role=OWNER
   ```

`next.config.ts` está vacío (sin rewrites ni headers custom). `middleware.ts` solo refresca sesión (ver §7).

---

## 5. Variables de entorno

Ver `.env.example` (nunca commitear `.env` real):

```env
DATABASE_URL="postgresql://user:password@localhost:6543/mybookme?pgbouncer=true"
DIRECT_URL="postgresql://user:password@localhost:5432/mybookme"
SUPABASE_URL=""
SUPABASE_PUBLISHABLE_KEY=""
SUPABASE_SECRET_KEY=""
SUPABASE_JWKS_URL=""
AUTH_SECRET="cambiar-en-local"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
RESEND_API_KEY=""          # sin clave → modo dev: log en consola, no envía
EMAIL_FROM="MyBookMe <no-reply@mybookme.app>"
CRON_SECRET="cambiar-en-local"  # Bearer para /api/cron/reminders
```

- `DATABASE_URL` (pool 6543 pgbouncer) vs `DIRECT_URL` (5432 migraciones).
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` son los que usa realmente `middleware.ts` y `lib/supabase/*` (nombres `NEXT_PUBLIC_*`; en `.env.example` aparecen sin prefijo por brevedad, mapearlos al crear `.env`).
- `NEXT_PUBLIC_APP_URL` se usa para construir `cancelUrl` e `icsUrl` en emails.
- Sin `RESEND_API_KEY`, `sendEmail` devuelve `{ok, skipped:'no-key'}` y no rompe la reserva.
- Sin `CRON_SECRET`, el endpoint cron queda abierto (solo para dev); en prod siempre definirlo.

---

## 6. Modelo de datos (Prisma + PostgreSQL)

Fichero: `prisma/schema.prisma` (219 líneas). Todo cuelga de `Business`.

### 6.1 Enums

```prisma
enum BusinessMemberRole { OWNER STAFF }
enum ScheduleExceptionType { CLOSED OPEN BLOCKED }
enum AppointmentStatus { PENDING CONFIRMED CANCELLED COMPLETED NO_SHOW }
```

### 6.2 Entidades y relaciones

**`Business`** — raíz multi-tenant.
`id cuid, name, slug @unique, description?, phone?, email?, timezone @default("Europe/Madrid"), address?, trialEndsAt Timestamptz?, stripeCustomerId? (reservado Fase 8), subscriptionStatus @default("TRIAL") [TRIAL|ACTIVE|PAST_DUE|CANCELED], createdAt, updatedAt`.
1—N: `members, staff, services, customers, appointments, workingHours, exceptions`. 1—1: `settings`.

**`User`** — espejo de `auth.users` de Supabase.
`id String @id @db.Uuid (= auth.users.id, ver ADR-001), email @unique, name?, createdAt, updatedAt`. 1—N `memberships`. Se crea con `upsert` al crear negocio (`POST /api/businesses`).

**`BusinessMember`** — tabla de tenancy.
`id cuid, businessId, userId uuid, role @default(STAFF), createdAt`. `@@unique([businessId, userId])`, `@@index([userId])`. Relaciones `Cascade` a ambos lados.

**`BusinessSettings`** — reglas de reserva por negocio.
`businessId PK, slotIntervalMinutes @default(15), bufferMinutes @default(0), minimumAdvanceMinutes @default(60), maximumAdvanceDays @default(30), cancellationDeadlineMinutes @default(120)`.

**`Staff`** — profesional.
`id cuid, businessId, name, email?, phone?, active @default(true)`. `@@index([businessId, active])`. 1—N `services (StaffService), appointments, workingHours, exceptions`.

**`Service`** — servicio vendible.
`id cuid, businessId, name, description?, durationMinutes, priceCents @default(0), currency @default("EUR"), active`. `@@index([businessId, active])`.

**`StaffService`** — qué profesional puede hacer qué servicio. PK compuesta `(staffId, serviceId)`, ambas `Cascade`, `@@index([serviceId])`.

**`WorkingHours`** — horario recurrente semanal.
`id cuid, businessId, staffId? (null = general del negocio), dayOfWeek Int 0=Dom…6=Sáb (= EXTRACT(DOW)), startTime/endTime String "HH:mm" en hora local del negocio`. Permite varios intervalos por día (ej. `09:00-14:00` + `16:00-20:00`). Índices `[businessId, dayOfWeek]`, `[staffId, dayOfWeek]`.

**`ScheduleException`** — vacaciones/festivos/cierres/bloqueos/aperturas extra.
`id cuid, businessId, staffId? (null = todo el negocio), date Date @db.Date, startTime?/endTime? (null+CLOSED = día entero; obligatorias en BLOCKED/OPEN), type, reason?, createdAt`. Índices `[businessId, date]`, `[staffId, date]`.
- `CLOSED` → cierra (todo el día o franja).
- `BLOCKED` → franja ocupada (ej. `12:00-13:00`).
- `OPEN` → apertura extra aunque no haya `WorkingHours`.

**`Customer`** — cliente final, sin login en el MVP.
`id cuid, businessId, name, email?, phone?`. Índices `[businessId, phone]`, `[businessId, email]` para deduplicación por código (no hay unique DB; posible race documentada).

**`Appointment`** — cita.
`id cuid, businessId, serviceId, staffId, customerId, startAt/endAt/blockedUntil Timestamptz(6), status @default(PENDING), notes?, idempotencyKey? (uuid cliente), cancelToken @unique @default(cuid()) (enlace seguro), reminderSentAt? (recordatorio 24h), createdAt, updatedAt`.
- `blockedUntil = endAt + bufferMinutes`: **es lo que realmente bloquea** (ADR-002).
- `service/staff/customer → Restrict` (no se pueden borrar con citas), `business → Cascade`.
- `@@unique([businessId, idempotencyKey])` → idempotencia por tenant.
- Índices `[businessId, staffId, startAt]`, `[businessId, status, startAt]`, `[staffId, startAt]`.

### 6.3 Concurrencia a nivel DB

Prisma no genera `EXCLUDE`, por eso `prisma/manual-exclusion.sql` debe aplicarse a mano tras migrar:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Appointment" ADD CONSTRAINT no_overlap_per_staff
EXCLUDE USING gist ("staffId" WITH =, tstzrange("startAt","blockedUntil") WITH &&)
WHERE (status IN ('PENDING','CONFIRMED'));
```

Efecto: dos citas `PENDING/CONFIRMED` del mismo `staffId` cuyos rangos `[startAt, blockedUntil)` se solapen (`&&`) son rechazadas por Postgres. `CANCELLED/COMPLETED/NO_SHOW` liberan el hueco. En código (`src/features/booking/service.ts:mapPrismaToBookingError`) los errores `P2002 / 23P01 / no_overlap_per_staff` se traducen a `409 SLOT_TAKEN`.

Además, la creación pública usa `SELECT pg_advisory_xact_lock(hashtext(staffId:dateStr))` dentro de la transacción para serializar reservas del mismo profesional/día antes de recalcular disponibilidad (ver §8 y §11).

---

## 7. Autenticación, autorización y multi-tenancy

- **Proveedor:** Supabase Auth (email+password). Paquetes `@supabase/ssr` + `@supabase/supabase-js`.
- **`middleware.ts` (raíz):** crea `createServerClient` con `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, sincroniza cookies `getAll/setAll`, llama `supabase.auth.getUser()` para refrescar token y devuelve `NextResponse.next()`. **No protege rutas ni redirige.** Matcher: todo menos `_next/static|_next/image|favicon|svg|png|jpg|jpeg|gif|webp`.
- **`src/lib/supabase/server.ts`:** `createServerClient` con `next/headers cookies()` para RSC/Route Handlers (ignora `setAll` en Server Components, lo hace el middleware).
- **`src/lib/supabase/client.ts`:** `createBrowserClient` para Client Components (`/login`, `/book/[slug]`, managers del dashboard).
- **`src/lib/auth.ts`:**
  - `getSessionUser()` → `supabase.auth.getUser().user` (401 si no hay).
  - `requireBusinessAccess(userId, businessId, roles?)` → busca `BusinessMember[businessId_userId] + business`; si no existe → `403 FORBIDDEN`; si `roles` y `rol ∉ roles` → `403 FORBIDDEN_ROLE`. **El `businessId` siempre viene de la membresía verificada, nunca se confía en el enviado por el cliente** (ADR-001, verificado por `scripts/qa-security.ts`).
- **Roles:**
  - `OWNER`: todo (crear/editar servicios, staff, horarios, excepciones, datos negocio; ver facturación).
  - `STAFF`: lectura + cambiar estado de citas (`PATCH /api/dashboard/appointments/:id`); no puede modificar catálogo ni horarios.
- **Espejo `User`:** al crear negocio se hace `upsert User(id=auth.id, email)`.
- **Protección en páginas:** cada `page.tsx`/`layout.tsx` privada hace `getUser()` y `redirect("/login")` si no hay sesión; luego carga `businessMember.findMany({where:{userId}, include:{business}})` y elige `businessId` de query o la primera membresía.

---

## 8. Availability Engine (núcleo del producto)

Código puro sin I/O: `src/domain/availability/{types.ts, intervals.ts, engine.ts}` + `engine.test.ts` (16 tests, incluye DST, buffer y modo “any”).

### 8.1 Inputs / Outputs

```ts
WorkingHour { dayOfWeek:0-6, startTime:"HH:mm", endTime:"HH:mm", staffId?:null }
ScheduleException { date:"YYYY-MM-DD" (en tz negocio), startTime?, endTime?, type, staffId? }
BusyAppointment { staffId, startAt:Date|string, endAt:Date|string, status }
AvailabilityInput { dateStr, timezone, durationMinutes, slotIntervalMinutes?=15,
  bufferMinutes?=0, minimumAdvanceMinutes?=0, maximumAdvanceDays?=30,
  now?=new Date(), staffId, workingHours, exceptions, appointments }
Slot/Interval { start:Date, end:Date }
```

Salida: `Slot[]` (`{start, end}` donde `end = start + duration`; el buffer ya se exigió para que quepa pero no se incluye en `end` mostrado).

### 8.2 Algoritmo (`getAvailability`)

```text
1. Intervalos base:
   - Filtra excepciones de ese dateStr+staffId (staffId null = global afecta a todos).
   - Si hay CLOSED sin horas → [] (día entero cerrado).
   - Convierte cada WorkingHour con dow==DOW(dateStr) y (staffId==null || ==staff)
     de hora local a UTC con fromZonedTime(dateStr HH:mm, tz).
   - Las OPEN con horas se añaden como apertura extra.
2. Intervalos ocupados:
   - BLOCKED con horas → busy; BLOCKED sin horas → 00:00→00:00 día siguiente.
   - CLOSED parcial → busy.
   - Citas con staffId==staff && status∈{PENDING,CONFIRMED} → [startAt, endAt+buffer].
   - CANCELLED/COMPLETED/NO_SHOW no bloquean.
3. Resta: free = subtractIntervals(base, busy) ordenando y aplicando
   overlaps(a,b) = a.start<b.end && a.end>b.start (borde exacto 11:00-12:00 NO solapa).
4. Generación de slots:
   - totalMs=(duration+buffer)*60k, stepMs=slotInterval*60k.
   - minStart=now+minimumAdvance, maxStart=now+maximumAdvanceDays.
   - Por cada free: t=free.start; while t+totalMs<=free.end:
       si minStart<=t<=maxStart → push{start:t, end:t+duration}; t+=step.
   - Solo se devuelve un slot si TODO el servicio (+buffer) cabe.
   - Si duration/slot<=0 → [].
```

`getAvailabilityAny({staffIds})`: ejecuta el motor por cada profesional elegible (orden determinista), une por `start.getTime()`, deduplica y devuelve `{start, end, staffIds[]}` — así “cualquiera” ofrece un hueco si al menos un profesional válido lo tiene.

### 8.3 Reglas y casos cubiertos por tests

Día libre/ocupado, cita intermedia, varias citas, dos intervalos diarios, servicio que no cabe al final, excepción `BLOCKED 12:00-13:00` que parte el día, vacaciones `CLOSED`, profesional distinto (WH específico no afecta a otro), servicio no permitido por profesional, buffer (cita `10:00-11:00` con buffer 15 impide hasta `11:15`), `minimumAdvance` (filtra pasado), `maximumAdvanceDays` (filtra futuro), timezone `Europe/Madrid` con DST (otoño 2026-10-25 día 25h: `09:00 local=08:00Z CET` OK; verano `09:00=07:00Z CEST`).

Helpers: `dowOfDateStr = new Date(dateStrT12:00:00Z).getUTCDay()`, `dayBounds()` en `service.ts` con `fromZonedTime(date 00:00, tz)`.

---

## 9. Reglas de negocio transversales

Almacenadas en `BusinessSettings` (defaults: `slotInterval 15min, buffer 0, minimumAdvance 60min, maximumAdvanceDays 30d, cancellationDeadline 120min`):

- **`slotIntervalMinutes`:** paso entre inicios de slot (ej. cada 15min: `09:00, 09:15…`).
- **`bufferMinutes`:** colchón tras cada cita; se suma a `blockedUntil` y se exige al generar slots.
- **`minimumAdvanceMinutes`:** no se puede reservar con menos antelación (ej. 60min).
- **`maximumAdvanceDays`:** ventana máxima futura (ej. 30 días).
- **`cancellationDeadlineMinutes`:** el cliente solo puede cancelar online si `start - now >= deadline` (defecto 120min), si no `409 TOO_LATE`.
- **Transiciones de estado** (`src/features/appointments/transitions.ts` + test):
  `PENDING → CONFIRMED/CANCELLED`, `CONFIRMED → COMPLETED/CANCELLED/NO_SHOW`, terminales (`CANCELLED/COMPLETED/NO_SHOW`) sin salida. `PATCH` privado valida con `isValidTransition`, si no `400 INVALID_TRANSITION`.
- **Deduplicación `Customer`:** por `phone` primero, luego `email`, si no crea nuevo. Sin unique DB (deuda: posible race).
- **Idempotencia:** `idempotencyKey (uuid)` generado en cliente (`crypto.randomUUID()`); `@@unique([businessId, key])` → reintentos devuelven `{deduped:true}` sin duplicar.
- **Precio:** `priceCents + currency (EUR)`. Hoy informativo (“pagarás en local”); no hay cobro online (Stripe pendiente).

---

## 10. Rutas UI — qué hace cada una

Total: **12 páginas** + 2 layouts + 1 middleware. Convención Next 16: `searchParams` como `Promise<>`.

### 10.1 Shell global

- **`src/app/layout.tsx` → envoltorio de todo.** Server Component: `<html lang="es">`, `metadata` SEO, `globals.css` + fuentes `Inter + Outfit`, `theme-color #0a0914`. Renderiza `{children}` sin auth ni nav.
- **`middleware.ts` (raíz).** Ver §7. Solo refresca sesión Supabase.

### 10.2 Públicas (sin login)

**`GET /` — `src/app/page.tsx`.**
Landing marketing estática (sin fetch). Navbar (`/`, `/login`, `/onboarding`), Hero “Reservas online…”, CTAs a `/onboarding` y demo `/book/maria-nails`, stats, grid 6 features, 3 pasos negocio, flujo 4 pasos cliente, pricing dual (0€ cliente / 29€ negocio destacada), CTA final + footer. Puerta del funnel.

**`GET /login` — `src/app/login/page.tsx`.**
Client Component con card glass: `email+password`, botones `Iniciar Sesión` / `Crear cuenta de negocio`, `msg/isError`, spinner `loading`, nota trial, link inicio. Usa `createClient()` browser: `signInWithPassword → router.push("/dashboard")`, `signUp → "revisa correo"`. No llama a Prisma ni a `/api`. Nota: `/onboarding` redirige a `/login?next=/onboarding` pero el `next` hoy se ignora (siempre va a `/dashboard` tras login).

**`GET /book/:slug` — `src/app/book/[slug]/page.tsx`.** ⭐ Página pública principal.
Client wizard 3 pasos. `params: Promise<{slug}>` (ej. `maria-nails`).
1. Header negocio (inicial logo, `name/description/phone/address`, mapa Google embed si hay `address`).
2. Tracker `StepDot`: Servicio → Fecha/Hora → Confirmar.
3. Paso 1: `service-grid` + `select#book-staff` (`any` + `eligibleStaff` filtrado por `svc.staffIds`).
4. Paso 2: `input[type=date] (min=hoy)` + `slots-grid` pills `HH:mm` + banner selección.
5. Paso 3: `name* + phone + email` (exige `name && (phone||email)`), botón `Confirmar reserva →`, nota legal.
6. Confirmación: `¡Reserva confirmada!` con servicio/fecha/hora/negocio, aviso “pagarás en local”, botones Google/Outlook/`.ics`, enlace cancelación, “Hacer otra reserva”.
Llama a: `GET /api/public/:slug/services` (carga inicial, preselecciona `services[0]`), `GET /api/public/:slug/availability?serviceId&date&staffId` (maneja `TRIAL_EXPIRED`, `SLOT_TAKEN` recargando), `POST /api/public/:slug/appointments {serviceId,staffId,startAt,name,phone,email,idempotencyKey:crypto.randomUUID(),website:"" honeypot}` (guarda `cancelToken`). Utilidades `@/features/booking/calendar-links` + `Intl.DateTimeFormat es-ES` con `biz.timezone`.

**`GET /book/cancel/:token` — `src/app/book/cancel/[token]/page.tsx` + `button.tsx`.**
RSC pública por token secreto. `params: Promise<{token}> (= cancelToken)`. Busca `appointment.findUnique({where:{cancelToken}, include:{service,staff,business}})`. Si no existe → “Enlace no válido”; si `CANCELLED` → “Ya está cancelada”; si no muestra `servicio+profesional+fecha en tz negocio+negocio` + `<CancelButton token/>`. El botón (Client) hace `POST /api/public/appointments/by-token/:token/cancel`, maneja `TOO_LATE` y muestra “Reserva cancelada.”.

### 10.3 Onboarding (privada, primer negocio)

**`GET /onboarding` — `src/app/onboarding/page.tsx` + `form.tsx`.**
RSC: `createClient()` server + `getUser()`; si no email → `redirect("/login?next=/onboarding")`. Muestra `<main max-w-md>` “Crea tu negocio” + email + `<OnboardingForm/>`. El form (Client): inputs `name/slug/phone`, preview `effective = slug || previewSlug(name)` (normaliza NFD `a-z0-9-`, muestra `/book/{effective}`). `POST /api/businesses {name,slug?,phone?}` → `router.push(/dashboard?businessId=id)`. Errores `SLUG_TAKEN`. El backend crea negocio + settings + `OWNER` + horario base Lun–Vie.

### 10.4 Dashboard — shell privada

**`src/app/dashboard/layout.tsx`.** Layout de todo `/dashboard/*`: obtiene `user.email`, renderiza `<div.page-light.dash-surface><TopBar email/><children>`.
**`src/app/dashboard/top-bar.tsx`.** `TopBar` Client sticky blanco: logo → `/dashboard`, email truncado, `signOut() → /login`, o link Entrar.
**`src/app/dashboard/nav.tsx` (no ruta).** `DashboardNav({businessId,slug,current})`: pills `Citas /dashboard`, `Calendario /dashboard/calendar`, `Servicios /dashboard/services`, `Profesionales /dashboard/staff`, `Horarios /dashboard/schedule`, `Negocio /dashboard/business`, `Facturación /dashboard/billing` (todos con `?businessId=`), + `↗ Página pública /book/slug`. Resalta `current`.

Patrón común de todas las páginas dashboard: `getUser else redirect("/login")`, `businessMember.findMany({where:{userId}, include:{business}})`, si 0 → mensaje/redirect crear negocio, selección `memberships.find(businessId) ?? [0]`, header `Nombre — sección + badge Propietario/Personal + email` + `<DashboardNav current=…>`.

**`GET /dashboard` — `src/app/dashboard/page.tsx` (Citas).** `searchParams: {businessId?, estado?, pagina?, q?, staffId?}`.
- Header + `CreateAppointmentModal` (cita manual) + badge rol.
- `QuickShareBar` (link público + WhatsApp), `DashboardKpiCards` (hoy total/completadas/pendientes/ingresos `priceCents`, próximos `total`).
- Banners trial: `trialStatus()` → `EXPIRED` (rojo + link billing) / `TRIAL` (días restantes + link).
- Selector multi-negocio si `>1`, checklist setup si `!setupDone (services>0 && staff>0 && workingHours>0)` con links.
- `AppointmentsFilterBar` (búsqueda `q` nombre/tel/email + filtro `staffId`), pills estado `TODAS/PENDING/CONFIRMED/COMPLETED/CANCELLED/NO_SHOW`, `groupBy status`, lista agrupada por día (`Hoy/Mañana/fecha larga es-ES`), tarjeta por cita (hora en `business.timezone`, duración, servicio·staff, cliente, badge, `<StatusButtons/>`), paginación 20/pág (`pagina`, `totalPages`, preserva filtros con `buildQueryUrl`).
Queries: `upsert User espejo`, `count+findMany services/staff`, `count workingHours`, `groupBy appointments`, `findMany today + paginated where {businessId, startAt>=today, status?, staffId?, OR customer…}`.

**`GET /dashboard/calendar` — `src/app/dashboard/calendar/page.tsx` + `controls.tsx`.** `searchParams: {businessId?, date?:YYYY-MM-DD, view?:timeline|semana, staffId?}` (defecto `timeline`, `date=today en tz negocio`).
- Vista `semana`: calcula lunes, rango 7 días con `fromZonedTime`, `findMany` semana, agrupa `byDay`, grid 7 columnas, destaca Hoy, link a `timeline` ese día, mini-cards coloreadas por `STATUS_COLOR`.
- Vista `timeline`: `dayStart/dayEnd`, `findMany` día, agrupa por profesional (filtrado o todos), columnas por staff (avatar inicial, conteo), cards hora/badge/servicio(duración)/cliente+tel/`notes`/`<StatusButtons/>`. Header “Agenda Diaria/Semanal” + fecha larga + `CreateAppointmentModal`. `CalendarControls`: selector fecha, Hoy, toggle vista, filtro empleado.

**`GET /dashboard/services` — `src/app/dashboard/services/page.tsx` + `manager.tsx`.** Header + nav + `<ServicesManager businessId/>` (Client): `GET /api/dashboard/services?businessId`, `POST {businessId,name,durationMinutes,priceCents}`, `PATCH /:id {name,description,duration,price,active}` (toggle activo, editar). Solo `OWNER` (403 si no).

**`GET /dashboard/staff` — `src/app/dashboard/staff/page.tsx` + `manager.tsx`.** Header + nav + `<StaffManager/>`: `GET /api/dashboard/staff?businessId` (staff+services), `POST {businessId,name,serviceIds}`, `PATCH /:id {name,email,phone,active,serviceIds?}` (reasigna `StaffService` en transacción `deleteMany+create`). Valida servicios del mismo negocio. Solo `OWNER`.

**`GET /dashboard/schedule` — `src/app/dashboard/schedule/page.tsx` + `manager.tsx`.** Header + nav + `<ScheduleManager/>`: `GET /api/dashboard/schedule/working-hours?businessId` (workingHours + últimas 60 exceptions + staff), `POST …/working-hours {dayOfWeek 0-6,startTime,endTime HH:mm,staffId?}`, `DELETE …/working-hours/:id`, `POST …/exceptions {date YYYY-MM-DD,type:CLOSED|OPEN|BLOCKED,startTime/endTime,staffId?,reason}`, `DELETE …/exceptions/:id`. Gestiona horario semanal + excepciones. Solo `OWNER`.

**`GET /dashboard/business` — `src/app/dashboard/business/page.tsx` + `form.tsx`.** Header + nav + `<BusinessForm businessId slug initial{name,description,phone,address}/>` (lo visible en `/book/slug`): `PATCH /api/dashboard/business {businessId,name,description,phone,address}` + muestra link público. Solo `OWNER`.

**`GET /dashboard/billing` — `src/app/dashboard/billing/page.tsx`.** Header + nav. Card estado vía `trialStatus(business)` (`@/features/billing/trial`): `ACTIVE` (29$/mes), `TRIAL` (30 días hasta `trialEndsAt`), `EXPIRED` (pública bloqueada). Botón “Suscribirme (Pasarela Stripe próximamente)” **deshabilitado** + nota “disponible antes de fin de prueba”. **Sin integración de pago** (ver §13).

Componentes auxiliares (no rutas): `status-buttons.tsx` (Confirmar/Completar/Cancelar/No vino → `PATCH …/:id` + WhatsApp), `create-appointment-modal.tsx` (cita manual → `POST …/appointments`), `appointments-filter-bar.tsx`, `kpi-cards.tsx`, `quick-share-bar.tsx` + `share-link.tsx` + `business-bar.tsx`.

---

## 11. API — referencia completa

### 11.1 Públicas `/api/public/*` (sin login, con rate-limit + Zod + honeypot)

| Método y ruta (fichero) | Parámetros | Qué hace / caso de uso |
|---|---|---|
| `GET /api/public/:slug` — `src/app/api/public/[slug]/route.ts` | `slug` path | `getBusinessBySlug(slug)` → `{business:{name,slug,timezone,description,phone,address}}`. Ficha mínima. `404 NOT_FOUND`. |
| `GET /api/public/:slug/services` — `…/[slug]/services/route.ts` | `slug` | `getPublicServices(slug)` → `{business, services:{id,name,description,durationMinutes,priceCents,currency,staffIds}[], staff:{id,name}[]}`. Alimenta wizard. |
| `GET /api/public/:slug/availability?serviceId&date=YYYY-MM-DD&staffId=any\|id` — `…/availability/route.ts` | query Zod `availabilityQuery` + `rateLimit av:ip:slug` 60/min (429 + `Retry-After`) | `getPublicAvailability(slug,serviceId,date,staffId)` → `{slots:{start,end,staffId}[]}`. Respeta WH/excepciones/citas/buffer/reglas. `400 SERVICE_INVALID/STAFF_INVALID`, `402 TRIAL_EXPIRED`. |
| `POST /api/public/:slug/appointments` — `…/appointments/route.ts` | `slug` + body `createAppointmentBody {serviceId, staffId=default any, startAt datetime offset, name 1-120 trim, phone max40?, email email max160?, notes max1000?, idempotencyKey uuid?}` con refine `phone\|\|email` + `rateLimit book:ip:slug` 10/min + honeypot `website` (si relleno → `201 {appointment:null}` falso anti-bots) | `createPublicAppointment` en transacción con advisory lock + recálculo (ver §12.2). Idempotencia (`@@unique`), `409 SLOT_TAKEN`, `402 TRIAL_EXPIRED`. Si `!deduped && email` → `buildConfirmationEmail + sendEmail` best-effort con `bookingUrls(cancelToken)`. Devuelve `{appointment:{id,serviceId,staffId,startAt,endAt,status,cancelToken},deduped}` 200/201. Lo llama `/book/[slug]`. |
| `POST /api/public/appointments/by-token/:token/cancel` — `…/by-token/[token]/cancel/route.ts` | `token` path + `rateLimit cancel:ip` | `cancelByToken(token)` → `{id,status:CANCELLED}`. `404 NOT_FOUND`, `409 TOO_LATE`. Lo llama `CancelButton` y el enlace del email. |
| `GET /api/public/appointments/by-token/:token/ics` — `…/by-token/[token]/ics/route.ts` | `token` | `getByToken + buildIcs({uid,summary,description,location,start,end})` → `text/calendar` attachment `reserva-*.ics`. Lo usa la confirmación y el email. |

Errores públicos estándar: `VALIDATION 400 (+issues Zod)`, `NOT_FOUND 404`, `SERVICE_INVALID/STAFF_INVALID 400`, `SLOT_TAKEN 409`, `TRIAL_EXPIRED 402`, `TOO_LATE 409`, `RATE_LIMITED 429`, `INTERNAL 500`.

### 11.2 Privadas `/api/businesses` + `/api/dashboard/*` (Supabase + `BusinessMember`)

| Método y ruta | Auth | Qué hace |
|---|---|---|
| `POST /api/businesses` — `src/app/api/businesses/route.ts` | `getSessionUser` 401 | Onboarding: Zod `{name 2-80, slug? ^[a-z0-9-]{3,50}$, phone?}`, `slugify` o `base-N`, `409 SLUG_TAKEN`, `upsert User`, tx: `business{timezone:Europe/Madrid,trialEndsAt:+30d} + settings + member{OWNER} + WH Lun-Vie 09-14,16-20`. `201 {business:{id,slug,name}}`. Lo usa `OnboardingForm`. |
| `POST /api/dashboard/appointments` | miembro (cualquiera) | Cita manual: `{businessId,serviceId,staffId,startAt ISO,customerName,customerPhone?,customerEmail?,notes?,status:PENDING\|CONFIRMED def CONFIRMED}`, verifica servicio/staff activos del negocio, `endAt=start+duration`, `blockedUntil=end+buffer`, reutiliza/crea `Customer`, crea `Appointment`. `201`. Lo usa `CreateAppointmentModal`. Nota: no revalida `getAvailability` (confía en exclusión DB; deuda ver §19). |
| `PATCH /api/dashboard/appointments/:id` | miembro del negocio de la cita | Cambio estado: `{status enum}`, `isValidTransition` (`@/features/appointments/transitions`), `update`. `404/403/400 INVALID_TRANSITION`. Lo usan `StatusButtons`. |
| `GET+POST /api/dashboard/services` (+ `PATCH /:id`) | GET miembro, POST/PATCH solo `OWNER` | GET `?businessId` → `{services}`; POST `{businessId,name,duration 5-480,priceCents,currency=EUR}` → 201; PATCH `{name,description,duration,priceCents,active}`. Lo usa `ServicesManager`. |
| `GET+POST /api/dashboard/staff` (+ `PATCH /:id`) | GET miembro, POST/PATCH solo `OWNER` | GET `?businessId` → `{staff+services, services activos}`; POST `{businessId,name,email?,phone?,serviceIds[]}` (valida mismo negocio, crea `Staff+StaffService[]`); PATCH `{name,email,phone,active,serviceIds?}` (reemplazo en tx). Lo usa `StaffManager`. |
| `GET+POST /api/dashboard/schedule/working-hours` (+ `DELETE /:id`) | GET miembro, POST/DELETE solo `OWNER` | GET `?businessId` → `{workingHours, exceptions últimas 60, staff activos}`; POST `{businessId,dayOfWeek 0-6,startTime/endTime HH:mm,staffId?}` (`start<end`, staff del negocio); DELETE borra franja. |
| `POST /api/dashboard/schedule/exceptions` (+ `DELETE /:id`) | solo `OWNER` | Crea `{businessId,date YYYY-MM-DD,type:CLOSED\|OPEN\|BLOCKED,startTime/endTime,staffId?,reason}` (refine: `CLOSED` sin horas, `OPEN/BLOCKED` con `start<end`); DELETE borra. |
| `PATCH /api/dashboard/business` (y GET) | solo `OWNER` | Edita `{businessId,name,description,phone,address}`. Lo usa `BusinessForm`. |

### 11.3 Cron

**`GET /api/cron/reminders` — `src/app/api/cron/reminders/route.ts`.**
Auth: `Authorization: Bearer CRON_SECRET` o `?secret=` (si `CRON_SECRET` definido; si no, abierto solo para dev). Ejecuta `sendDueReminders()` (recordatorios 24h) y devuelve `{ok:true,…result}`. Programado en `vercel.json`: `0 6 * * * → /api/cron/reminders`. No es página.

---

## 12. Flujos de extremo a extremo

### 12.1 Owner: registro → negocio → configuración → primera cita visible

```text
/login (signUp/signIn) → /onboarding (POST /api/businesses: crea Business+Settings+Member OWNER+WH base)
→ /dashboard?businessId= (checklist: crea Services POST /dashboard/services,
   Staff POST /dashboard/staff con serviceIds, Schedule POST working-hours/exceptions)
→ /dashboard/business (PATCH datos públicos) → comparte /book/slug (QuickShareBar)
→ cliente reserva → owner la ve en /dashboard y /dashboard/calendar → gestiona con StatusButtons (PATCH estado)
```

### 12.2 Cliente: reserva pública (doble validación)

```text
/book/slug → GET services → elige servicio/profesional/fecha
→ GET availability?serviceId&date&staffId → slots
→ introduce name + phone/email → POST appointments {…, idempotencyKey, website:""}
Servidor en transacción por cada staffId candidato (any prueba en orden):
  1. requireBookable (trial), valida servicio tenant.
  2. Idempotencia temprana: si [businessId,key] existe → {deduped:true}.
  3. pg_advisory_xact_lock(staffId:dateStr) → recarga ctx dentro de tx (WH/exc/appts/settings).
  4. getAvailability(staffId) y exige slot exacto start==startDate; si no, prueba siguiente staff.
  5. Dedup Customer (phone→email→create), endAt=start+duration, blockedUntil=end+buffer, create PENDING.
  Si ninguno encaja → 409 SLOT_TAKEN (exclusión DB también lo garantiza).
→ email confirmación best-effort + UI confirmación con calendar links + cancelToken.
La disponibilidad del navegador nunca es garantía; el servidor recalcula.
```

### 12.3 Cancelación por enlace seguro

Email/confirmación → `/book/cancel/:token` (RSC muestra detalle) → `CancelButton POST …/cancel` → `cancelByToken` verifica `status∈{PENDING,CONFIRMED}` y `start-now >= cancellationDeadlineMinutes` (def. 120) → `CANCELLED` (libera hueco por la `WHERE` de la exclusión). Si tarde → `TOO_LATE`.

### 12.4 Recordatorios 24h

`vercel.json` cron diario `06:00` → `GET /api/cron/reminders` (Bearer) → `findDueReminders: startAt∈[now+23h,now+25h) && status∈{PENDING,CONFIRMED} && reminderSentAt==null && email!=null take100` → `buildReminderEmail + sendEmail` → marca `reminderSentAt` (también en modo dev `skipped` para no reintentar) → `{checked,sent,skipped,failed}`. Manual: `npm run reminders`.

### 12.5 Trial/billing (sin cobro)

`trialStatus(business)` (`@/features/billing/trial`): `ACTIVE` (pagado), `TRIAL` (dentro de 30d), `EXPIRED` (pasado). `EXPIRED` bloquea suave: se ve la pública pero `GET availability` y `POST appointments` devuelven `402 TRIAL_EXPIRED`; el dashboard muestra banner rojo + link a `/dashboard/billing` (botón Stripe deshabilitado).

---

## 13. Facturación, trial y Stripe (pendiente)

**Estado: Stripe NO implementado.** Solo está la preparación para cuando se lleve a producción:

Ya existe:
- `Business.trialEndsAt`, `stripeCustomerId?`, `subscriptionStatus (TRIAL|ACTIVE|PAST_DUE|CANCELED)`.
- `trialStatus()` + banners en `/dashboard` y bloqueo suave `402 TRIAL_EXPIRED` en API pública.
- Página `/dashboard/billing` con estados y botón “Suscribirme (Pasarela Stripe próximamente)” deshabilitado.
- Migraciones `…_trial_billing` + `…_backfill_trial`, seed con `trialEndsAt +30d`.
- Precio mostrado en landing (29$/mes negocio, 0$ cliente).

Falta para producción (no empezar sin decisión de producto):
- Elegir modelo (suscripción mensual por negocio 29€/$ vs. por sede, periodo gracia, `PAST_DUE`/`CANCELED`).
- Integrar `stripe` + webhook (`checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.*`) que actualice `subscriptionStatus/stripeCustomerId/trialEndsAt`.
- `POST /api/dashboard/billing/checkout` (solo `OWNER`, vía `requireBusinessAccess`) + `GET` estado real + customer portal.
- Probar expiración real, `TRIAL_EXPIRED` ya listo, rotar claves, RGPD/facturación UE.
- Sustituir rate-limit in-memory por Redis multi-instancia (necesario al escalar el checkout).

---

## 14. Notificaciones: email, recordatorios, ICS y cancelación

- **`src/features/notifications/send.ts`:** `sendEmail({to,subject,text,html?})` vía `fetch POST api.resend.com/emails` sin SDK, `from=EMAIL_FROM`. Sin `RESEND_API_KEY` → `console.log[email:dev]` + `{skipped:'no-key'}`; sin `to` → `no-recipient`. Nunca lanza; la reserva no se rompe por email.
- **`src/features/notifications/email.ts`:** `appBaseUrl()=NEXT_PUBLIC_APP_URL`, `bookingUrls(cancelToken)={cancelUrl:/book/cancel/token, icsUrl:/api/…/ics}`, `buildConfirmationEmail/buildReminderEmail({businessName,serviceName,staffName,startAt,endAt,timezone,customerName,cancelUrl,icsUrl})` con `Intl es-ES` en tz negocio, `escHtml`, enlace Google Calendar. La confirmación se envía en `POST appointments` best-effort `try/catch` solo si `!deduped && customer.email`.
- **`src/features/notifications/reminders.ts`:** ver §12.4.
- **ICS `src/features/booking/ics.ts`:** `buildIcs({uid,summary,description?,location?,start,end})` manual (`VCALENDAR/VEVENT, UID@mybookme, DTSTAMP/DTSTART/DTEND UTC YYYYMMDDTHHMMSSZ`, escape `\,;\n`). Ruta `GET …/ics` → `text/calendar` attachment.
- **`src/features/booking/calendar-links.ts`:** `googleCalendarUrl(TEMPLATE+text+dates+details+location)`, `outlookCalendarUrl(compose+rru addevent…)` usados en `/book/[slug]`.
- **Cancelación `src/features/booking/cancel.ts`:** `canCancel(status,startAt,deadline,now)`, `getByToken(+service+staff+business+settings)`, `cancelByToken` (lee `cancellationDeadlineMinutes ??120`).

---

## 15. Seguridad

Obligatorio por spec §17, auditado por `scripts/qa-security.ts`:

- Validación server-side Zod en todo: `features/booking/schema.ts` (`slugParam`, `availabilityQuery{serviceId,date YYYY-MM-DD,staffId def any}`, `createAppointmentBody{name 1-120, phone/email, notes max1000, idempotencyKey uuid?}.refine(phone||email)`); dashboard (`businesses POST`, `appointments POST/PATCH`, `working-hours`, `exceptions` con `start<end`); `400 {error:VALIDATION,issues}`.
- Autorización server-side: `requireBusinessAccess` en cada handler privado; roles `OWNER` vs `STAFF`; `businessId` nunca del cliente.
- Aislamiento multi-tenant: cross-service → `SERVICE_INVALID`, cross-staff → `STAFF_INVALID`, miembro A→B `403`, `STAFF→OWNER` `403 FORBIDDEN_ROLE` (9 checks QA).
- Anti-doble-reserva: advisory lock + `EXCLUDE` + idempotencia + `SLOT_TAKEN`.
- Rate-limit público (`src/lib/rate-limit.ts` in-memory `Map` ventana fija, `pruneRateLimit`, `clientIp=x-forwarded-for[0]??x-real-ip`): `availability 60/min (av:ip:slug)`, `createAppointment 10/min (book:ip:slug)`, `cancel` por IP; `429 + Retry-After`. Nota: para multi-instancia usar Upstash Redis.
- Anti-spam: honeypot `website` (relleno → `201` falso), `TRIAL_EXPIRED` frena abuso, emails best-effort.
- Privacidad: no exponer datos de otros clientes; API pública solo devuelve `name/slug/timezone/description/phone/address` + servicios/staff mínimos; no loggear PII innecesaria; secretos solo en env; diseño con RGPD/UE en mente (sin afirmaciones legales).
- Secretos: nunca en código; `.env` ignorado, `.env.example` como plantilla.

---

## 16. Estructura de carpetas y capas de código

```text
next16-mybookme/
├── booking-saas-spec.md      # especificación inicial (visión, MVP, fases, prompts agentes)
├── docs/                     # ADRs + bitácora pasos 01-28, PROGRESS.md, ROADMAP.md, siguiente-jornada.md
├── prisma/
│   ├── schema.prisma         # modelo (ver §6)
│   ├── manual-exclusion.sql  # EXCLUDE anti-solape (aplicar a mano)
│   ├── seed.ts + seed-data.json  # demo maria-nails
│   └── migrations/           # init + reminder_sent_at + trial_billing + backfill_trial
├── middleware.ts             # refresco sesión Supabase (no protege)
├── src/
│   ├── app/                  # App Router
│   │   ├── layout.tsx + globals.css + page.tsx (/)
│   │   ├── login/page.tsx
│   │   ├── onboarding/page.tsx + form.tsx
│   │   ├── book/[slug]/page.tsx + book/cancel/[token]/page.tsx + button.tsx
│   │   ├── dashboard/layout.tsx + top-bar.tsx + nav.tsx + page.tsx (citas)
│   │   │   + calendar/ + services/ + staff/ + schedule/ + business/ + billing/
│   │   │   + *.tsx auxiliares (status-buttons, create-appointment-modal, kpi-cards, …)
│   │   └── api/
│   │       ├── public/[slug]/ + by-token/[token]/ (6 handlers)
│   │       ├── businesses/route.ts + dashboard/*/ (12 handlers)
│   │       └── cron/reminders/route.ts
│   ├── domain/availability/   # puro: engine.ts, intervals.ts, types.ts, engine.test.ts
│   ├── features/
│   │   ├── booking/          # service.ts (339 lín), schema.ts, cancel.ts, ics.ts, calendar-links.ts + tests
│   │   ├── appointments/transitions.ts + test
│   │   ├── notifications/    # send.ts, email.ts, reminders.ts + tests
│   │   └── billing/trial.ts + test
│   ├── lib/                  # db.ts (Prisma), auth.ts, rate-limit.ts+test, utils.ts (cn), supabase/server|client
│   └── components/ui/        # shadcn mínimo: button.tsx, card.tsx, input.tsx, label.tsx
│       # /book usa <style> scoped propio (bookPageStyles), no shadcn
├── scripts/                  # proof-booking.ts, qa-security.ts, send-reminders.ts, link-owner.ts
├── vercel.json               # cron 0 6 * * * → /api/cron/reminders
├── components.json + eslint.config.mjs + postcss.config.mjs + vitest.config.ts
└── .env.example + next.config.ts (vacío)
```

`src/domain` = puro testeable sin I/O. `src/features` = casos de uso con Prisma. `src/lib` = transversal. `src/components` = solo shadcn base.

---

## 17. Scripts, tests y QA

| Script (`npm run …`) | Qué verifica |
|---|---|
| `proof:booking` (`scripts/proof-booking.ts`) | E2E concurrencia+idempotencia: crea `maria-nails-proof`, settings, staff+service+link, 2 WH próximo lunes, `getPublicAvailability` → `Promise.allSettled(2×create mismo slot distintas keys)` espera `1 ok +1 SLOT_TAKEN`, luego misma key 2× espera `count==1 && deduped`, `PROOF OK`, cleanup. Demuestra `Cliente A→RESERVED, B→REJECTED`, nunca doble. |
| `qa:security` (`scripts/qa-security.ts`) | 9 checks: 2 tenants `qa-tenant-a/b`, cross-service→`SERVICE_INVALID`, cross-staff→`STAFF_INVALID`, booking crea en A, miembro A→B `403`, `STAFF→OWNER` `403 FORBIDDEN_ROLE`, `PENDING→COMPLETED false / CONFIRMED→COMPLETED true`, Zod sin contacto falla. Cleanup. |
| `reminders` (`scripts/send-reminders.ts`) | Wrapper `sendDueReminders()` log `checked/sent/skipped/failed`. |
| `link:owner` (`scripts/link-owner.ts`) | `upsert BusinessMember` por `email+slug+role`. |
| `test` (Vitest) | `engine.test.ts` (16), `ics/cancel/calendar/email/transitions/rate-limit/trial` y booking (según bitácora `23/23, 25/25, 20/20`). Imprescindibles spec §21: día libre/ocupado, citas, doble intervalo, no cabe, excepción, vacaciones, profesional, buffer, DST, reserva válida/fuera horario/ocupado/inválida/otro tenant/concurrente/cancelación/transiciones. |

Definition of Done (spec §26): implementación + tipos + validación + autorización + tests + errores + responsive/accesibilidad + lint + typecheck + docs; para citas además disponibilidad/solapes/concurrencia/multi-tenant.

---

## 18. Despliegue y cron

- **Vercel:** `vercel.json` solo define cron `0 6 * * * → /api/cron/reminders`. Sin rewrites. Variables a configurar en dashboard Vercel: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL` (URL prod, para emails/ICS), `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`.
- Tras `prisma migrate deploy`, aplicar `manual-exclusion.sql` en la BD prod (Supabase SQL editor o `psql`).
- Cron alternativo: `pg_cron` o cron externo con `Authorization: Bearer $CRON_SECRET` (o `?secret=`).
- Observabilidad (spec §28): loggear errores de reservas/motor/DB/intentos `SLOT_TAKEN` sin PII; futuro Sentry/métricas/alertas.
- `docs/siguiente-jornada.md` + `PROGRESS.md` (28 pasos cerrados 2026-10-06): queda deploy, rotar Resend, higiene y Stripe.

---

## 19. Limitaciones conocidas y siguiente jornada

1. **Stripe sin implementar** (ver §13): no hay checkout, webhooks ni portal. La UI/bloqueo trial están listos para conectarlo.
2. `POST /api/dashboard/appointments` (cita manual) no revalida `getAvailability` y no mapea `P2002` → posible `500` en solape manual (la exclusión DB lo evita, pero el error no es limpio).
3. Rate-limit in-memory no sirve para multi-instancia (migrar a Upstash Redis al escalar).
4. `Customer` sin unique real (dedup solo por código, race posible).
5. `/login?next=` se ignora (siempre va a `/dashboard`).
6. Futuro (spec §29, no MVP): multi-local, recursos/salas, servicios encadenados, addons, precios variables, depósitos, SMS/WhatsApp, Google/Outlook sync, recurrentes, analítica (ocupación/ingresos/no-shows), automatizaciones.

Para entender el funcionamiento con el mínimo imprescindible: leer en este orden `booking-saas-spec.md §5-13` → `prisma/schema.prisma` → `src/domain/availability/engine.ts` → `src/features/booking/service.ts` → `src/app/book/[slug]/page.tsx` → `src/app/dashboard/page.tsx` → `docs/ADR-001`, `ADR-002`, `ADR-003`.

