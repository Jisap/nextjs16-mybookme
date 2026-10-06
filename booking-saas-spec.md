# Booking SaaS — Especificación inicial del proyecto

## 1. Visión

Aplicación web SaaS multi-tenant para que pequeños negocios ofrezcan reservas de citas online. Casos de uso: peluquerías, barberías, uñas, masajes, fisioterapia, quiropráctica, estética, podología, tatuajes y otros negocios basados en servicios.

El producto tendrá dos áreas:

- **Panel privado del negocio**: configuración y gestión.
- **Página pública de reservas**: el cliente consulta disponibilidad y reserva sin crear una cuenta.

El núcleo del producto es un **Availability Engine** que calcula correctamente los huecos teniendo en cuenta horarios, profesionales, servicios, citas, excepciones, buffers y reglas de reserva.

---

## 2. Objetivo del MVP

El propietario debe poder:

1. Crear su negocio.
2. Configurar profesionales.
3. Crear servicios y duración/precio.
4. Configurar horarios.
5. Configurar excepciones y vacaciones.
6. Publicar una página de reservas.
7. Consultar y gestionar citas.
8. Cancelar, confirmar y completar citas.

El cliente debe poder:

1. Abrir una URL pública.
2. Elegir servicio.
3. Elegir profesional o «cualquiera».
4. Elegir fecha.
5. Ver solamente horas disponibles.
6. Introducir nombre, teléfono y/o email.
7. Confirmar una reserva.
8. Recibir confirmación.

El cliente **no necesita una cuenta en el MVP**.

---

## 3. Stack propuesto

- Next.js 16
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- PostgreSQL
- Supabase
- Prisma
- Zod
- Librería especializada para fechas/zonas horarias
- Testing unitario, integración y E2E

La lógica empresarial debe estar separada de React.

Arquitectura conceptual:

```text
UI
 ↓
Application Services
 ↓
Domain Services
 ↓
Repository / Prisma
 ↓
PostgreSQL
```

---

## 4. Multi-tenancy

Entidad raíz:

```text
Business
 ├── Users / Members
 ├── Staff
 ├── Services
 ├── Customers
 ├── Appointments
 ├── WorkingHours
 ├── ScheduleExceptions
 └── Settings
```

Todas las entidades deben quedar aisladas por negocio.

Nunca confiar en un `businessId` enviado desde el navegador. El servidor debe determinar el tenant mediante la sesión/autorización.

---

## 5. Entidades principales

### Business

```text
id
name
slug
description
phone
email
timezone
address
createdAt
updatedAt
```

`slug` debe ser único.

Ejemplo:

```text
/book/maria-nails
```

### User

Usuario autenticado.

```text
id
email
name
createdAt
updatedAt
```

### BusinessMember

Relación usuario-negocio.

```text
id
businessId
userId
role
createdAt
```

Roles iniciales:

```text
OWNER
STAFF
```

Preparar la arquitectura para futuros roles.

### Staff

Profesional que puede atender servicios.

```text
id
businessId
name
email
phone
active
createdAt
updatedAt
```

### Service

```text
id
businessId
name
description
durationMinutes
price
active
createdAt
updatedAt
```

Ejemplos:

```text
Manicura             45 min
Pedicura             60 min
Manicura + Pedicura  90 min
```

### StaffService

Relación entre profesionales y servicios:

```text
staffId
serviceId
```

### WorkingHours

Horario recurrente:

```text
id
businessId
staffId nullable
dayOfWeek
startTime
endTime
```

Debe soportar varios intervalos por día:

```text
09:00 - 14:00
16:00 - 20:00
```

### ScheduleException

Para vacaciones, festivos, cierres y cambios excepcionales:

```text
id
businessId
staffId nullable
date
startTime nullable
endTime nullable
type
reason
```

Tipos posibles:

```text
CLOSED
OPEN
BLOCKED
```

### Customer

No necesita autenticación en el MVP.

```text
id
businessId
name
email nullable
phone nullable
createdAt
updatedAt
```

### Appointment

```text
id
businessId
serviceId
staffId
customerId
startAt
endAt
status
notes
createdAt
updatedAt
```

Estados:

```text
PENDING
CONFIRMED
CANCELLED
COMPLETED
NO_SHOW
```

---

# 6. Availability Engine

Es la parte más importante del proyecto.

Debe recibir, conceptualmente:

```text
business
service
staff
date
working hours
exceptions
existing appointments
booking rules
timezone
```

Y devolver slots completos:

```text
[
  {
    start: "...",
    end: "..."
  }
]
```

## Algoritmo

### Paso 1 — Horario

Ejemplo:

```text
09:00 - 14:00
16:00 - 20:00
```

### Paso 2 — Excepciones

Ejemplo:

```text
12:00 - 13:00 bloqueado
```

Resultado:

```text
09:00 - 12:00
13:00 - 14:00
16:00 - 20:00
```

### Paso 3 — Citas

Ejemplo:

```text
10:00 - 10:45
17:00 - 18:00
```

### Paso 4 — Restar intervalos ocupados

### Paso 5 — Generar slots según duración

Para un servicio de 45 minutos:

```text
09:00
09:45
10:45
11:30
13:00
...
```

Solo devolver un slot si **todo el servicio cabe**.

---

# 7. Solapamientos

Utilizar una regla de dominio clara:

```text
A.start < B.end
AND
A.end > B.start
```

Ejemplo:

```text
10:00 - 11:00
10:30 - 11:30
```

Solapamiento: sí.

```text
10:00 - 11:00
11:00 - 12:00
```

Solapamiento: no.

---

# 8. Concurrencia y doble reserva

Nunca hacer solamente:

```text
consultar disponibilidad
→ si está libre
→ insertar
```

Dos clientes podrían consultar simultáneamente.

La creación de la cita debe utilizar una estrategia robusta de PostgreSQL, por ejemplo:

- exclusión de rangos
- transacciones
- locks
- Serializable
- o combinación de varias técnicas

La solución debe documentarse y probarse.

Objetivo:

```text
Cliente A ─┐
           ├── 11:30
Cliente B ─┘

A → RESERVED
B → REJECTED
```

Nunca:

```text
A → RESERVED
B → RESERVED
```

---

# 9. Profesionales

Un profesional puede realizar determinados servicios.

Ejemplo:

```text
María → Manicura
María → Pedicura
Laura → Manicura
```

Si el cliente selecciona «cualquier profesional», el sistema debe ofrecer un slot si existe al menos un profesional válido.

La asignación definitiva del profesional debe producirse dentro de una operación protegida contra concurrencia.

---

# 10. Reglas de reserva

Preparar el dominio para:

```text
minimumAdvanceMinutes
maximumAdvanceDays
cancellationDeadlineMinutes
slotIntervalMinutes
```

Ejemplo:

```text
minimumAdvanceMinutes = 60
maximumAdvanceDays = 30
slotIntervalMinutes = 15
```

---

# 11. Buffer

Debe poder existir tiempo entre citas.

Ejemplo:

```text
Servicio = 60 min
Buffer = 15 min
```

Una cita:

```text
10:00 - 11:00
```

impide otra hasta:

```text
11:15
```

Puede comenzar como regla global y evolucionar posteriormente a regla por servicio.

---

# 12. Zona horaria

Cada negocio debe tener timezone:

```text
Europe/Madrid
```

No asumir la timezone del servidor.

Las fechas almacenadas y mostradas deben gestionarse de forma consistente.

Crear tests específicos para:

- Europe/Madrid
- horario de verano
- horario de invierno
- cambio DST

---

# 13. Flujo de reserva

```text
Cliente
  ↓
Página pública
  ↓
Servicio
  ↓
Profesional
  ↓
Fecha
  ↓
Availability Engine
  ↓
Slots
  ↓
Datos cliente
  ↓
Validación final en servidor
  ↓
Transacción
  ↓
Customer + Appointment
  ↓
Confirmación
```

La disponibilidad mostrada en el navegador **nunca es garantía de reserva**.

El servidor debe recalcular/validar justo antes de crear la cita.

---

# 14. Dashboard

MVP:

### Dashboard

- citas de hoy
- próximas citas
- resumen básico

### Calendario

- día
- semana

### Citas

- ver
- confirmar
- cancelar
- completar
- no-show

### Servicios

CRUD.

### Profesionales

CRUD.

### Horarios

Configuración semanal.

### Excepciones

Vacaciones, festivos y bloqueos.

---

# 15. Página pública

Ruta conceptual:

```text
/book/[businessSlug]
```

Debe ser:

- responsive
- mobile-first
- rápida
- accesible
- sencilla

Flujo:

```text
Servicio
→ Profesional
→ Fecha
→ Hora
→ Datos
→ Confirmación
```

---

# 16. Confirmación

Ejemplo:

```text
¡Reserva confirmada!

Manicura
5 de octubre
11:30
María Nails

Cliente:
Jorge

[ Añadir al calendario ]
```

Futuras posibilidades:

- email
- SMS
- WhatsApp
- recordatorios
- cancelación mediante enlace seguro
- ICS

---

# 17. Seguridad

Obligatorio:

- validación server-side con Zod
- autorización server-side
- aislamiento multi-tenant
- no confiar en IDs enviados por cliente
- no confiar en roles enviados por cliente
- protección contra doble reserva
- rate limiting en endpoints públicos
- protección contra spam
- no exponer datos de otros clientes
- secretos únicamente mediante variables de entorno

La aplicación debe diseñarse considerando RGPD/UE, sin realizar afirmaciones legales sin revisión profesional.

---

# 18. Estructura de carpetas propuesta

```text
src/
├── app/
│   ├── (public)/
│   │   └── book/
│   ├── (dashboard)/
│   │   └── dashboard/
│   └── api/
│
├── components/
│   ├── ui/
│   ├── booking/
│   ├── calendar/
│   └── dashboard/
│
├── features/
│   ├── booking/
│   ├── availability/
│   ├── businesses/
│   ├── staff/
│   ├── services/
│   └── appointments/
│
├── domain/
│   ├── availability/
│   ├── appointments/
│   └── scheduling/
│
└── lib/
    ├── auth/
    ├── db/
    ├── validation/
    └── utils/
```

La estructura definitiva puede cambiar si el agente de arquitectura encuentra una alternativa mejor.

---

# 19. Casos de uso

Crear servicios claramente identificables:

```text
CreateBusiness
CreateStaff
CreateService
CreateAppointment
CancelAppointment
ConfirmAppointment
CompleteAppointment
GetAvailability
UpdateWorkingHours
CreateScheduleException
```

La lógica empresarial no debe vivir en componentes React.

---

# 20. API conceptual

Pública:

```text
GET  /api/public/:businessSlug
GET  /api/public/:businessSlug/services
GET  /api/public/:businessSlug/availability
POST /api/public/:businessSlug/appointments
```

Privada:

```text
GET    /api/dashboard/appointments
POST   /api/dashboard/appointments
PATCH  /api/dashboard/appointments/:id

GET    /api/dashboard/services
POST   /api/dashboard/services
PATCH  /api/dashboard/services/:id

GET    /api/dashboard/staff
POST   /api/dashboard/staff
PATCH  /api/dashboard/staff/:id
```

La API final debe definirse según los casos de uso reales.

---

# 21. Tests imprescindibles

## Availability

Probar:

1. día libre
2. día ocupado
3. una cita intermedia
4. varias citas
5. dos intervalos diarios
6. servicio que no cabe
7. excepción
8. vacaciones
9. profesional diferente
10. servicio no realizado por profesional
11. buffer
12. cambio horario
13. timezone
14. DST

## Booking

Probar:

1. reserva válida
2. fuera de horario
3. slot ocupado
4. servicio inexistente
5. profesional inválido
6. acceso de otro tenant
7. reserva concurrente
8. cancelación
9. transiciones de estado

---

# 22. Seed

Crear un seed reproducible:

```text
Business:
Maria Nails

Staff:
Maria
Laura

Services:
Manicura 45
Pedicura 60
Manicura + Pedicura 90

Horario:
L-V
09:00-14:00
16:00-20:00
```

Incluir citas de prueba.

---

# 23. Fases de desarrollo

## Fase 0 — Arquitectura

Antes de programar:

- estructura
- autenticación
- Prisma schema
- tenancy
- Availability Engine
- estrategia de concurrencia
- ADRs

## Fase 1 — Fundación

- Next.js
- TypeScript
- Tailwind
- shadcn
- Prisma
- PostgreSQL
- auth
- multi-tenancy
- lint
- format
- testing

## Fase 2 — Dominio

- Business
- Staff
- Service
- StaffService
- WorkingHours
- ScheduleException
- Customer
- Appointment

## Fase 3 — Availability Engine

Primero tests, después implementación.

## Fase 4 — Booking

- flujo público
- disponibilidad
- cliente
- transacción
- confirmación

## Fase 5 — Dashboard

- calendario
- citas
- servicios
- profesionales
- horarios
- excepciones

## Fase 6 — UX

- responsive
- mobile
- loading
- errores
- accesibilidad

## Fase 7 — Notificaciones

- email
- recordatorios
- cancelación
- ICS

## Fase 8 — Monetización

- planes
- Stripe
- límites
- facturación

---

# 24. Agentes de IA recomendados

## Architect

Responsable de:

- arquitectura
- estructura
- decisiones tecnológicas
- ADRs
- revisión de dependencias

## Database / Backend

Responsable de:

- Prisma
- PostgreSQL
- repositorios
- casos de uso
- API
- autorización
- transacciones

## Availability

Responsable exclusivo de:

- intervalos
- slots
- horarios
- excepciones
- buffers
- timezone
- concurrencia

Debe tener una batería fuerte de tests.

## Frontend

Responsable de:

- dashboard
- calendario
- formularios
- página pública
- componentes
- responsive
- accesibilidad

No debe duplicar el motor de disponibilidad.

## QA

Responsable de:

- tests
- edge cases
- regresiones
- multi-tenancy
- concurrencia

## Security

Auditar:

- auth
- autorización
- aislamiento
- validación
- datos personales
- rate limiting
- secretos
- dependencias

---

# 25. Reglas para todos los agentes

1. Leer README y documentación antes de modificar código.
2. Inspeccionar la arquitectura existente.
3. No asumir funcionalidades.
4. No modificar archivos innecesarios.
5. No añadir dependencias sin justificar.
6. Ejecutar tests tras cambios.
7. No desactivar tests para hacerlos pasar.
8. No ignorar errores TypeScript.
9. Evitar `any`.
10. Documentar decisiones arquitectónicas.
11. Mantener aislamiento multi-tenant.
12. Validar entradas en servidor.
13. No confiar en datos del cliente.
14. Mantener dominio fuera de UI.
15. Añadir tests para lógica crítica.
16. Evitar sobreingeniería.
17. No implementar funcionalidades futuras sin necesidad.

---

# 26. Definition of Done

Una funcionalidad está terminada cuando cumple:

```text
[ ] Implementación
[ ] Tipos correctos
[ ] Validación
[ ] Autorización
[ ] Tests
[ ] Manejo de errores
[ ] Responsive si aplica
[ ] Accesibilidad razonable
[ ] Lint
[ ] Typecheck
[ ] Documentación necesaria
```

Para citas:

```text
[ ] disponibilidad
[ ] solapamientos
[ ] concurrencia
[ ] multi-tenant
```

---

# 27. Variables de entorno

Ejemplo:

```env
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=
```

Crear `.env.example`.

Nunca commitear `.env`.

---

# 28. Observabilidad

Registrar errores relacionados con:

- reservas
- Availability Engine
- base de datos
- intentos de reservar slots ocupados

No registrar información personal innecesaria.

Posteriormente:

- Sentry
- métricas
- trazas
- alertas

---

# 29. Funcionalidades futuras

Diseñar para poder añadir:

- varios locales
- recursos físicos
- salas/cabinas
- servicios encadenados
- addons
- precios variables
- pagos con Stripe
- depósitos
- email/SMS/WhatsApp
- Google Calendar
- Outlook
- ICS
- clientes recurrentes
- historial
- analítica
- ocupación
- ingresos
- cancelaciones
- no-shows
- automatizaciones

No implementar estas funciones en el MVP.

---

# 30. Primera milestone

La primera milestone debe ser:

**Una reserva real de extremo a extremo.**

```text
Owner crea negocio
        ↓
Crea profesional
        ↓
Crea servicio
        ↓
Configura horario
        ↓
Cliente abre página pública
        ↓
Selecciona servicio
        ↓
Selecciona fecha
        ↓
Availability Engine calcula slots
        ↓
Cliente selecciona slot
        ↓
Servidor valida nuevamente
        ↓
Transacción
        ↓
Appointment creada
        ↓
Slot deja de estar disponible
        ↓
Confirmación
        ↓
Owner ve la cita
```

Además, intentar reservar simultáneamente el mismo slot debe demostrar que solamente una operación puede ganar.

---

# 31. Prompt maestro para el agente principal

```text
Eres el agente principal de desarrollo de un SaaS de reservas de citas multi-tenant.

Lee primero toda la documentación del repositorio antes de realizar cambios.

El objetivo es construir una plataforma donde pequeños negocios configuren servicios, profesionales y horarios y donde sus clientes puedan reservar citas online.

La pieza crítica es el Availability Engine. Debe calcular slots válidos teniendo en cuenta horarios, excepciones, citas existentes, duración del servicio, profesionales disponibles, buffers, reglas de reserva y zona horaria.

Las reservas deben estar protegidas contra dobles reservas concurrentes.

El sistema debe mantener aislamiento estricto entre tenants.

Stack objetivo:
- Next.js 16
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- PostgreSQL
- Prisma
- Zod

Prioridades:
1. Corrección del dominio.
2. Seguridad.
3. Integridad de reservas.
4. Tests.
5. Mantenibilidad.
6. UX.

No implementes funcionalidades futuras innecesarias.

No introduzcas dependencias sin justificar.

No coloques lógica empresarial compleja en componentes React.

Toda entrada externa debe validarse.

Toda operación privada debe comprobar autorización y tenant.

Antes de modificar código, analiza la arquitectura existente.

Después de cada tarea ejecuta tests, lint y typecheck relevantes.

Si una decisión arquitectónica importante no está documentada, crea un ADR.

Si detectas una ambigüedad importante, documenta la decisión necesaria en lugar de inventar una solución arbitraria.
```

---

# 32. Prompt para Availability Agent

```text
Tu responsabilidad exclusiva es diseñar e implementar el Availability Engine.

Debes tratar la disponibilidad como lógica de dominio independiente de React y UI.

Debes soportar:
- horarios recurrentes
- múltiples intervalos diarios
- excepciones
- vacaciones
- citas existentes
- duración del servicio
- buffers
- profesionales
- servicios permitidos por profesional
- intervalo de slots
- antelación mínima
- límite máximo de reserva
- timezone
- cambios DST

Primero diseña tests.

Demuestra que:
- no se generan slots parcialmente fuera del horario
- no se generan slots ocupados
- los solapamientos se detectan correctamente
- las excepciones se respetan
- los profesionales no atienden servicios no permitidos
- las zonas horarias funcionan correctamente
- la concurrencia no produce doble reserva

No implementes UI.
```

---

# 33. Prompt para Backend Agent

```text
Tu responsabilidad es implementar backend y persistencia.

Diseña Prisma schema, relaciones, índices, autorización y casos de uso.

La aplicación es multi-tenant y el aislamiento entre negocios es obligatorio.

Las reservas deben ser atómicas y resistentes a condiciones de carrera.

No confíes en businessId, staffId, serviceId ni permisos proporcionados por el navegador.

Valida todas las entradas.

Escribe tests para autorización y concurrencia.

No implementes componentes UI salvo que sea estrictamente necesario para integración.
```

---

# 34. Prompt para Frontend Agent

```text
Tu responsabilidad es construir la experiencia de usuario.

Debes crear:
- dashboard
- calendario
- servicios
- profesionales
- horarios
- página pública
- selector de fecha
- selector de slots
- formulario de cliente
- confirmación

Utiliza Tailwind CSS v4 y shadcn/ui.

La interfaz debe ser responsive y mobile-first.

No dupliques la lógica del Availability Engine en frontend.

El frontend debe consumir los casos de uso/API existentes.

No soluciones problemas de dominio modificando la UI.
```

---

# 35. Prompt para QA/Security Agent

```text
Revisa el proyecto como auditor independiente.

Busca:
- fuga de datos entre tenants
- autorización incorrecta
- doble reserva
- race conditions
- validación insuficiente
- IDs manipulables
- exposición de información personal
- errores timezone
- estados de cita inválidos
- secretos en código
- dependencias vulnerables

Crea tests que reproduzcan las vulnerabilidades encontradas.

No corrijas silenciosamente problemas importantes: documenta primero el problema y después aplica la corrección.
```

---

# 36. Orden recomendado de trabajo

```text
Architect
   ↓
Database / Backend
   ↓
Availability
   ↓
Booking Backend
   ↓
Frontend
   ↓
QA
   ↓
Security Review
```

Una vez estabilizadas las interfaces, los agentes pueden trabajar en paralelo.

---

# 37. Principio fundamental

No diseñar la aplicación alrededor del calendario.

Diseñarla alrededor del dominio:

```text
BUSINESS
   ↓
SERVICES
   ↓
STAFF
   ↓
SCHEDULE
   ↓
AVAILABILITY
   ↓
APPOINTMENT
```

El calendario es una representación visual del dominio.

El verdadero núcleo del producto es responder correctamente:

> **¿Quién puede atender este servicio, en qué momento, teniendo en cuenta todas las reglas del negocio, y puedo garantizar que ese hueco queda reservado para este cliente?**
