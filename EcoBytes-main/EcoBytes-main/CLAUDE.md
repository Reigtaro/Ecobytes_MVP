# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EcoBytes** es una plataforma digital para la gestión y reutilización responsable de residuos electrónicos (e-waste) en Chile. El problema central que resuelve es la falta de trazabilidad y control en el ciclo de vida de los equipos electrónicos: empresas, municipios y gestores ambientales no tienen herramientas integradas para registrar, seguir y reportar el destino de sus residuos electrónicos, lo que dificulta el cumplimiento de la **Ley REP (Ley 20.920)** y genera opacidad en la cadena de gestión ambiental.

**La solución:** EcoBytes centraliza el registro de equipos electrónicos en desuso, conecta a los actores del ciclo (generadores, transportistas, gestores, recicladores) y genera la trazabilidad necesaria para acreditar la gestión responsable ante las autoridades competentes. La plataforma también permite generar reportes de cumplimiento normativo, gestionar puntos de recolección y consolidar métricas de impacto ambiental.

Construida como un monorepo TypeScript full-stack con Express + Prisma en el backend y Next.js en el frontend.

---

## Architecture

**Monorepo structure:**
- `backend/` - Express API con Prisma ORM, base de datos MySQL
- `frontend/` - Next.js 16 App Router con TypeScript, Tailwind CSS, Radix UI

**Backend (`backend/src/`):**
- `index.ts` - Entry point Express (port 3001, CORS habilitado para desarrollo, arranca el sync scheduler)
- `routes/` - auth.ts, roles.ts, users.ts, account.ts, collectionPoints.ts, reports.ts
- `controllers/` - authController.ts, roleController.ts, userController.ts, accountController.ts
- `db/` - prisma.ts, userModel.ts, roleModel.ts, permissionModel.ts, adminUserModel.ts
- `middleware/` - auth.ts (JWT), requirePermission.ts (RBAC)
- `services/` - emailService.ts, collectionPointsSync.ts, syncScheduler.ts
- `utils/` - logger.ts
- `prisma/schema.prisma` - Modelos de usuarios, roles, permisos y CollectionPoint

**Frontend (`frontend/src/`):**
- `app/` - Páginas Next.js App Router (dashboard/, login/, register/, recoleccion/puntos/, forbidden/, unauthorized/, etc.)
- `components/` - Sidebar, PublicLayout, AppFooter, UserAvatar, Toast, ConfirmDialog, Tooltip, TiptapEditor
- `contexts/` - ThemeContext.tsx (modo oscuro/claro)
- `lib/` - auth.ts, api.ts, permissions.ts, types.ts
- `proxy.ts` - Proxy Next.js para auth y redirección (Next.js 16 reemplazó `middleware.ts` con `proxy.ts`; exporta `proxy` en lugar de `middleware`)

**Modelos de base de datos:**
- `User` - Usuarios del sistema con rol asignado
- `Role` - Roles con sessionTimeout configurable
- `Permission` - Permisos con estructura jerárquica menu/submenu
- `RolePermission` - Join table rol-permiso
- `PendingVerification` - Códigos de verificación de email para registro
- `AccountActionToken` - Tokens para acciones de cuenta (desactivar/reactivar)
- `CollectionPoint` - Puntos de recolección RAEE con coordenadas, materiales y origen (mma/manual)
- `SearchLog` - Log de búsquedas en el mapa de puntos de recolección (usado en reportes)

---

## Common Commands

**Backend:**
```bash
cd backend
npm install
npm run dev              # Desarrollo con hot reload (port 3001), logs visibles
npm run build            # Compilar TypeScript a dist/
npm run start            # Ejecutar servidor compilado
npm run start:prod       # Ejecutar en producción (sin logs de debug)
npx tsc --noEmit         # Type-check sin compilar
npm run db:push          # Push Prisma schema a MySQL
npm run db:seed          # Seed database con datos iniciales
npm run db:reset         # Reset database completo y reseed
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev              # Next.js dev server on port 3000
npm run build            # Production build
npm run start            # Run production server
npm run lint             # ESLint
```

**Después de cambiar el schema Prisma:**
```bash
cd backend
# Detener el servidor si está corriendo (libera el DLL de Prisma en Windows)
npx prisma generate      # Regenerar cliente
npm run db:push          # Sincronizar con MySQL
# o npm run db:reset para resetear completamente con seed
```

---

## Development Workflow

1. Ambos paquetes tienen `node_modules` separados — siempre hacer `cd` al paquete correcto antes de `npm install`
2. Arrancar backend primero (`cd backend && npm run dev`), luego frontend (`cd frontend && npm run dev`)
3. Backend corre en http://localhost:3001, frontend en http://localhost:3000
4. Auth usa JWT almacenados en cookies httpOnly con permisos basados en roles
5. Frontend usa alias `@/*` para imports (apunta a `frontend/src/*`)
6. Backend usa CommonJS (`module: "commonjs"` en tsconfig), frontend usa ESNext

**Cuentas de desarrollo (después de `npm run db:reset`):**
- SuperAdmin: `superadmin@ecobytes.cl` / `EcoB!t3s@SuperAdm1n#2026`
- Admin: `admin@example.com` / `admin123`
- Moderador: `moderador@example.com` / `mod123`
- Usuario test: `test@example.com` / `test123`

---

## Key Technical Patterns

**Auth Flow:**
- JWT generado en `backend/src/routes/auth.ts` al login
- Almacenado como cookie httpOnly (`accessToken`)
- Validado por middleware `authenticateToken` en `backend/src/middleware/auth.ts`
- Permisos verificados via middleware `requirePermission`
- Proxy de frontend (`frontend/src/proxy.ts`) redirige usuarios no autenticados (convención Next.js 16)

**RBAC:**
- Permisos definidos en tabla `permissions` con estructura `menu.submenu.accion`
- Roles tienen muchos permisos via tabla `role_permissions`
- Cada rol tiene `sessionTimeout` configurable (minutos)
- Verificar permisos en rutas: `router.post('/path', authenticateToken, requirePermission('permiso'), handler)`
- El JWT **no** incluye `roleName` — para verificar rol en controllers usar query directa a Prisma (join User → Role)

**Jerarquía de roles (ROLE_RANK en frontend):**
```
SuperAdmin    = 4  (1 cuenta, intocable — protegida en backend y frontend)
Administrador = 3
Moderador     = 2
Usuario       = 1
```
- Un usuario no puede editar/eliminar a alguien con rango ≥ al suyo (verificado en UI y backend)
- El rol SuperAdmin no puede ser asignado ni modificado por nadie
- En el dropdown de roles del modal de usuarios solo aparecen roles con rango < al del usuario logueado

**Protección SuperAdmin (doble barrera):**
1. **UI:** botones de editar/eliminar/toggle deshabilitados con `cursor-not-allowed` + tooltip explicativo
2. **Backend:** `roleController` y `userController` retornan 403 si el target es SuperAdmin

**Logger (Desarrollo vs Producción):**
- Utilidad en `backend/src/utils/logger.ts`
- `devLog()` - Solo muestra logs cuando `NODE_ENV !== 'production'`
- `devWarn()`, `devError()` - Igual comportamiento para warn/error de debug
- `console.error` se mantiene para errores reales que siempre deben registrarse

**Session Timeout:**
- El rol define `sessionTimeout` en minutos
- El frontend muestra un modal de advertencia antes de expirar la sesión
- Al expirar, redirige a `/login`

**Páginas de error:**
- `/forbidden` — 403 Acceso Denegado: usuario autenticado sin permiso. Botón "Volver al Inicio" (`/`)
- `/unauthorized` — 401 No Autenticado: usuario no logueado o sesión expirada. Botón "Iniciar Sesión" (`/login`)

**Foto de perfil (Avatares):**
- Campo `avatarUrl` en modelo `User` (`avatar_url VARCHAR(500)` en DB)
- Backend sirve avatares como archivos estáticos en `/avatars/*` vía `express.static` desde `backend/public/avatars/`
- Subida: `PATCH /auth/avatar` con `multipart/form-data`, campo `avatar`, límite 2MB, formatos JPEG/PNG/GIF/WEBP
- Eliminación: `DELETE /auth/avatar`
- Funciones en `frontend/src/lib/auth.ts`: `uploadAvatar(file)`, `deleteAvatar()`, `getAvatarUrl(path)`
- Componente `frontend/src/components/UserAvatar.tsx`:
  - Usar siempre `<img>` nativo, **nunca** `next/image` — Next.js bloquea IPs privadas (localhost) en el proxy de imágenes
  - Props: `name`, `avatarUrl`, `size` (px), `rounded`, `className`
  - Fallback a iniciales con gradiente teal si no hay avatar o hay error de carga (`imgError` state)
- El avatar se muestra en: navbar del dashboard, navbar pública, navbar del foro, lista de posts del foro, detalle de post, comentarios
- Gestión del avatar en `frontend/src/app/dashboard/perfil/page.tsx`: click en avatar abre file picker, "Eliminar foto" solo visible cuando existe avatar

**Home (`frontend/src/app/page.tsx`):**
- Diseño **tema-aware** (light/dark). Solo `HeroSection` es siempre oscura (canvas de partículas requiere fondo oscuro)
- Las demás secciones usan clases base para light y `dark:` prefix para dark: `bg-white dark:bg-[#09090b]`, `text-slate-900 dark:text-white`, etc.
- `HeroSection`: Canvas con sistema de partículas interactivo
  - Constantes: COUNT=130, CONNECT_DIST=130, REPEL_DIST=120, REPEL_STRENGTH=4, DAMPING=0.93, MIN_SPEED=0.25, CURSOR_LINE_DIST=150
  - Mouse tracking via `window.addEventListener('mousemove')` (no canvas event) para capturar sobre texto/botones
  - Partículas siempre en movimiento: MIN_SPEED enforcement después de damping
  - Rebotan en los bordes del canvas (no wraparound)
  - Líneas desde el cursor hacia partículas cercanas (≤ CURSOR_LINE_DIST)
  - Overlay radial glow centrado en cursor
- `StatsSection`: 4 métricas con count-up animado al hacer scroll (IntersectionObserver, hook `useCountUp`, easing cúbico, dispara una sola vez)
- Secciones con animación de entrada al scroll: `AnimatedSection` con `useInView`
- Footer: usa `<AppFooter />` (componente compartido)
- `PublicLayout` usado con `showFooter={false}` ya que el footer va dentro del contenido oscuro

**PublicLayout (`frontend/src/components/PublicLayout.tsx`):**
- Navbar con links de navegación: Inicio, Foro, Puntos de Recolección, Normativa REP
- Si el usuario está autenticado aparece el botón **Dashboard** (pill teal) en el extremo derecho
- Scroll detection: al bajar, el header intensifica su `backdrop-blur` y sombra
- Animaciones hover: subrayado gradiente que expande desde el centro (`group-hover/link:w-[60%]`)
- Mobile: hamburger con animación rotate-90, menú desplegable con `mobileSlideDown`
- Light mode: `text-slate-600`, hovers `bg-teal-50`, borde superior gradiente teal via `::before`
- Dark mode: `dark:bg-[#09090b]/85 backdrop-blur-md`
- `UserMenu` dropdown con `fadeSlideDown` animation

**AppFooter (`frontend/src/components/AppFooter.tsx`):**
- Footer **tema-aware** compartido usado en home, páginas públicas y foro
- Columnas: Brand (logo + descripción + redes sociales), Plataforma, Módulos, Legal
- Redes sociales: Twitter/X, GitHub, LinkedIn, YouTube
- Estilos: `bg-slate-50 dark:bg-[#09090b]` (coincide con navbar), acentos teal en hover
- Importado en: `PublicLayout.tsx`, `foro/layout.tsx`, `page.tsx`

## Puntos de Recolección RAEE

**Página:** `frontend/src/app/recoleccion/puntos/page.tsx` — pública, accesible sin login

**Stack técnico:**
- Google Maps via `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`, NO `new Loader().load()`)
- Clustering via `@googlemaps/markerclusterer`
- Marcadores SVG inline (data URI) — no archivos externos
- Requiere `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en `frontend/.env.local`
- Billing debe estar habilitado en Google Cloud (aunque hay $200/mes gratis)

**Modelo `CollectionPoint`:**
```prisma
id, name, address, city, region, latitude, longitude,
type,       -- "Punto Limpio" | "Punto Verde"
materials,  -- JSON string: ["metal","phone","power_bank"]
contact, website,
source,     -- "mma" (sincronizado del MMA) | "manual" (validado por staff)
syncedAt,   -- timestamp de la última sync MMA
createdAt
```

**Precisión de coordenadas:**
- `latitude` y `longitude` se almacenan como `Decimal(10, 7)` en MySQL (tipo exacto, no punto flotante)
- `FLOAT` solo ofrece ~7 dígitos significativos (±11 m de error), insuficiente para marcadores en mapa
- `Decimal(10, 7)` da precisión de ~1 cm, más que suficiente para cualquier aplicación de mapas
- Al leer de Prisma, el tipo retornado es `Prisma.Decimal` (no `number` nativo) — siempre convertir con `Number()` antes de serializar a JSON, de lo contrario se envía como string y rompe Google Maps
- El sync del MMA sigue usando `parseFloat()` para insertar — Prisma acepta `number` en escritura sin problema
- La deduplicación usa `toFixed(6)`, que tiene margen de sobra con 7 decimales de precisión

**Materiales RAEE relevantes para EcoBytes** (únicos que se almacenan/muestran):
- `metal` — ⚙️ Metal
- `phone` — 📱 Celulares
- `power_bank` — 🔋 Pilas/Baterías

**Marcadores diferenciados en el mapa:**
- Teal `⚡` = punto con al menos 1 material RAEE
- Índigo `♻` = punto sin materiales RAEE (solo si se agregó manualmente con otros materiales)
- Toggle Mapa/Satélite en top-right del mapa

**Filtros en la UI:**
- Fila 1 (teal): chips por material RAEE (`Todos los RAEE · ⚙️ Metal · 📱 Celulares · 🔋 Pilas`)
- Fila 2 (gris): chips por región

**Componentes internos de la página:**
- `MapComponent` — carga Google Maps, crea markers + clusterer, toggle mapa/satélite
- `PointDetailCard` — card flotante (bottom-left) al seleccionar un marker
- `SearchBar` — autocomplete con sugerencias de zonas (ciudad/región) y puntos específicos

**Detección de ubicación del usuario (`"Cerca de mí"`):**
- Botón junto a la barra de búsqueda — activa/desactiva la geolocalización
- Al activar: llama `navigator.geolocation.getCurrentPosition`, centra el mapa en el usuario y muestra un marcador azul (`createUserLocationIcon()` — SVG circular con anillo punteado)
- Al activar: dibuja **3 polylines punteadas** (`google.maps.Polyline`) desde la posición del usuario hacia los 3 puntos más cercanos. Opacidad decreciente (75% / 50% / 30%) para indicar proximidad visualmente. Color celeste `#38bdf8`
- Los puntos se **ordenan por distancia** (más cercano primero) usando `haversineDistance()` cuando la ubicación está activa
- `PointDetailCard` muestra la distancia al punto seleccionado (`"X.X km de ti"` / `"XXX m de ti"`) en azul
- Las polylines y el ordenamiento se actualizan automáticamente al cambiar filtros
- Errores de permiso denegado se muestran debajo de la barra de búsqueda
- `haversineDistance(lat1, lng1, lat2, lng2)` — fórmula haversine, retorna km

**Atribución:** Link visible "Datos: MMA Chile · puntoslimpios.mma.gob.cl" en el hero bar

---

## Sincronización con API del MMA

**Fuente de datos:** `https://puntoslimpios.mma.gob.cl/api/points/geo`
- API pública del Ministerio del Medio Ambiente de Chile (~6.600 puntos en Santiago, ~10.000+ en todo Chile)
- Rate limit: 60 requests/período — respetar usando el sistema de sync en caché
- **Legalidad:** datos públicos del Estado (Ley 20.285 de Transparencia), uso alineado con Ley REP

**Archivos:**
- `backend/src/services/collectionPointsSync.ts` — lógica central de sync (reutilizable)
- `backend/src/services/syncScheduler.ts` — cron job con `node-cron`
- `backend/src/routes/collectionPoints.ts` — rutas GET / y POST /sync

**Rutas backend:**

| Endpoint | Auth | Descripción |
|---|---|---|
| `GET /collection-points` | Público | Devuelve todos los puntos (MMA + manuales) |
| `POST /collection-points/sync` | `recoleccion.puntos.gestionar` | Dispara sync manual inmediata |

**Lógica de sync (`syncCollectionPoints()`):**
1. Llama la API del MMA en **3 centros paralelos** para cubrir todo Chile de norte a sur:
   - Norte `(-20.5, -69.8)` radio 900 km → Arica → Atacama
   - Centro `(-34.0, -71.0)` radio 700 km → Coquimbo → Biobío
   - Sur `(-46.0, -72.5)` radio 1100 km → Araucanía → Magallanes
2. Deduplica por coordenadas `lat.toFixed(6),lng.toFixed(6)`
3. Filtra: solo puntos con `metal`, `phone` o `power_bank` en `materials`
4. Transacción atómica: `deleteMany({ source: 'mma' })` + `createMany(nuevos)`
5. Los puntos `source: 'manual'` **nunca se tocan**

**Scheduler (`node-cron`):**
- Arranca automáticamente en `app.listen()` via `startSyncScheduler()`
- Schedule configurable via env var `COLLECTION_POINTS_SYNC_SCHEDULE`
- Default: `"0 3 * * 1"` → cada lunes a las 3:00 AM (zona: America/Santiago)
- Guard `isRunning` evita ejecuciones concurrentes
- Logs siempre visibles (usa `console.log`, no `devLog`) para poder auditar syncs en producción

**Variable de entorno (backend `.env`):**
```
COLLECTION_POINTS_SYNC_SCHEDULE=0 3 * * 1   # semanal lunes 3am (default)
# COLLECTION_POINTS_SYNC_SCHEDULE=0 3 * * *  # diario 3am
```

**Botón "Sync MMA" en UI:** visible solo para usuarios con `recoleccion.puntos.gestionar`. Permite forzar sync inmediata sin esperar al cron.

---

---

## Módulo de Reportes

**Páginas frontend:**

| Ruta | Permiso | Descripción |
|---|---|---|
| `/dashboard/reportes/actividad` | `reportes.cumplimiento.ver` | Estadísticas de puntos de recolección y búsquedas |
| `/dashboard/reportes/puntos` | `reportes.cumplimiento.ver` | Reporte detallado de puntos |

**Rutas backend (`/reports/*`):**

| Endpoint | Permiso | Descripción |
|---|---|---|
| `GET /reports/activity` | `reportes.cumplimiento.ver` | Totales, breakdown por fuente/tipo/región + total de búsquedas |

**Datos que retorna `/reports/activity`:**
- `totalCenters` — cantidad total de puntos de recolección
- `totalSearches` — total de búsquedas registradas en `SearchLog`
- `mmaCount` / `manualCount` — puntos por fuente
- `byType` — conteo por tipo de punto ("Punto Limpio" / "Punto Verde")
- `byRegion` — conteo por región (ordenado alfabéticamente)

**Exportación:** La página de actividad permite descargar los datos en Excel (`.xlsx`) via `ExcelJS`.

**Gráficos:** `recharts` — `PieChart` (por tipo/fuente) y `BarChart` (por región).

---

## Sidebar Navigation Structure

El sidebar filtra ítems según los permisos del usuario. Orden actual:

1. **Equipos** → Registro (`equipos.registro.ver`)
2. **Trazabilidad** → Historial (`trazabilidad.historial.ver`)
3. **Recolección** → Puntos (`recoleccion.puntos.ver`)
4. **Actores** → Cadena (`actores.cadena.ver`)
5. **Reportes** → Actividad (`reportes.cumplimiento.ver`), Puntos (`reportes.cumplimiento.ver`)
6. **Seguridad** → Usuarios, Roles (`seguridad.*.ver`) — siempre al final

---

## Permissions Structure

Todos los permisos siguen el patrón `menu.submenu.accion`:

| Módulo | Permisos |
|---|---|
| Seguridad | `seguridad.usuarios.*`, `seguridad.roles.*` |
| Equipos | `equipos.registro.ver/crear/editar/eliminar/exportar` |
| Trazabilidad | `trazabilidad.historial.ver/gestionar` |
| Recolección | `recoleccion.puntos.ver/gestionar` |
| Actores | `actores.cadena.ver/gestionar` |
| Reportes | `reportes.cumplimiento.ver/generar/exportar` |
| Dashboard | `dashboard.metricas.ver` |

---

## Code Style

- TypeScript strict mode habilitado en ambos paquetes
- Indentación de 2 espacios
- Single quotes en backend, React standard en frontend
- PascalCase para componentes/modelos, camelCase para funciones/variables
- Orden de imports: paquetes externos, luego módulos locales
- Preferir async/await sobre promesas
- Frontend: Server components por defecto, marcar client components con `'use client'`

---

## Testing Guidelines

No existe suite de tests automatizados actualmente. Al agregar tests:
- **Frontend:** Colocar `*.spec.tsx` junto a los componentes o en carpetas `__tests__/`. Usar React Testing Library + Vitest.
- **Backend:** Tests de integración con naming `*.spec.ts`. Levantar app Express con base de datos de test (ejecutar `npm run db:reset` antes de los tests).
- Cubrir: flujos de auth, casos borde de RBAC, gestión de usuarios y roles, operaciones del foro.

---

## Environment Variables

**Backend (`.env`):**
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Secret para firmar tokens
- `JWT_REFRESH_SECRET` - Secret para refresh tokens
- `PORT` - Default 3001
- `NODE_ENV` - "production" para deshabilitar logs de debug
- `FRONTEND_URL` - URL del frontend (default http://localhost:3000)
- `RESEND_API_KEY` - API Key de Resend para envío de emails

**Frontend (`.env.local`):**
- `NEXT_PUBLIC_API_URL` - Backend API endpoint (default http://localhost:3001)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - API Key de Google Maps (requiere billing habilitado en Google Cloud)

Nunca commitear archivos `.env`.

---

## Business Context

**Problemática — Residuos Electrónicos en Chile:**

Chile genera miles de toneladas de e-waste al año (computadores, celulares, electrodomésticos, equipos industriales) sin un sistema centralizado de trazabilidad. Las empresas y municipios enfrentan tres problemas críticos:

1. **Sin registro:** Los equipos en desuso se acumulan en bodegas o se desechan de forma informal, sin registro de su destino final.
2. **Sin trazabilidad:** Una vez que el equipo sale de la organización, no hay forma de verificar si fue reciclado, reutilizado o dispuesto ilegalmente.
3. **Incumplimiento normativo:** La Ley REP (Ley 20.920) exige a productores y gestores acreditar la gestión responsable de residuos prioritarios, incluidos los electrónicos. Sin datos, esto es imposible.

**Solución — EcoBytes:**

EcoBytes es la plataforma que conecta y digitaliza toda la cadena de gestión de e-waste:

- **Registro de equipos:** Inventario digital de activos electrónicos en desuso con categorización por tipo, estado y volumen.
- **Trazabilidad completa:** Seguimiento del ciclo de vida del equipo desde su retiro hasta su destino final (reciclaje, reutilización, disposición autorizada).
- **Puntos de recolección:** Gestión y localización de centros de acopio habilitados.
- **Gestión de actores:** Coordinación entre generadores (empresas/municipios), transportistas y gestores/recicladores autorizados.
- **Reportes de cumplimiento:** Generación de informes para acreditar gestión ante el Ministerio del Medio Ambiente y la SMA bajo la Ley REP.
- **Métricas de impacto:** Dashboard con indicadores de toneladas gestionadas, equipos reciclados y huella ambiental evitada.

**Módulos planificados:**
1. Autenticación y gestión de usuarios/roles (RBAC) — **implementado**
2. Puntos de recolección RAEE con mapa Google Maps — **implementado**
3. Reportes de actividad (puntos de recolección) — **implementado**
4. Registro de equipos electrónicos — próximamente
5. Trazabilidad y ciclo de vida — próximamente
6. Gestión de actores de la cadena — próximamente
7. Reportes de cumplimiento normativo (Ley REP) — próximamente
8. Dashboard de métricas e impacto ambiental — próximamente

---

## Prisma Tips

- Después de cambios en el schema: `npm run db:push` (dev) o `npx prisma migrate dev` (con historial de migraciones)
- Regenerar cliente: `npx prisma generate`
- **En Windows:** detener el servidor antes de `prisma generate` (el proceso bloquea el DLL)
- Acceder a Prisma Client: `import { PrismaClient } from '@prisma/client'`
- Connection pooling manejado automáticamente; reusar instancia única via `backend/src/db/prisma.ts`

---

## Git Workflow

- Commit messages: Tiempo presente, conciso, con scope (ej. "auth: fix token refresh", "foro: add moderation panel")
- Squash WIP commits antes de review
- PRs necesitan: resumen, pasos de testing, issues vinculados, screenshots para cambios de UI
- Marcar cambios en Prisma schema para que reviewers puedan re-ejecutar migraciones

---

## Important Notes

- **Seguridad:** Nunca loguear datos sensibles (tokens, passwords). Eliminar `console.log` de debug antes de mergear.
- **Contexto chileno:** Asumir contexto normativo chileno (Ley REP, SMA, Ministerio del Medio Ambiente) por defecto.
- **RBAC estricto:** Los permisos son la única fuente de verdad para acceso a funcionalidades. No hardcodear roles en el código.
- **roleName en backend:** El JWT no incluye `roleName`. Para verificar rol en controllers (ej. moderación del foro), usar la función `getUserRoleName(userId)` disponible en `backend/src/db/forumModel.ts`, o hacer query directa a Prisma.

---

## Development Log

Para notas de sesión, bugs y detalles de implementación, ver [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md).

---

## Diagramas Mermaid

Los diagramas del proyecto se renderizan en **https://mermaid.ai**

**Reglas de formato obligatorias:**
- Saltos de línea dentro de etiquetas: usar `<br/>` (nunca `\n`)
- Flechas con destino común: agrupar con el operador `&` para evitar colisiones (ej: `A & B & C --> D`)

**Configuración de tema** (incluir al inicio de cada diagrama):

```
---
config:
  theme: base
  themeVariables:
    actorBkg: '#1a1a2e'
    actorBorder: '#4a9eff'
    actorTextColor: '#ffffff'
    actorLineColor: '#4a9eff'
    signalColor: '#4a9eff'
    signalTextColor: '#ffffff'
    labelBoxBkgColor: '#0f3460'
    labelBoxBorderColor: '#4a9eff'
    labelTextColor: '#ffffff'
    loopTextColor: '#ffffff'
    noteBkgColor: '#0f3460'
    noteBorderColor: '#4a9eff'
    noteTextColor: '#ffffff'
    activationBkgColor: '#16213e'
    activationBorderColor: '#4a9eff'
    sequenceNumberColor: '#ffffff'
    primaryColor: '#1a1a2e'
    primaryTextColor: '#ffffff'
    primaryBorderColor: '#4a9eff'
    secondaryColor: '#0f3460'
    tertiaryColor: '#16213e'
    lineColor: '#4a9eff'
    edgeLabelBackground: '#0f3460'
    clusterBkg: '#0d1b2a'
    clusterBorder: '#4a9eff'
    titleColor: '#ffffff'
---
```

Las variables `actor*`, `signal*`, `label*`, `loop*`, `note*`, `activation*` aplican a diagramas de secuencia.
Las variables `primary*`, `secondary*`, `tertiary*`, `cluster*`, `lineColor`, `titleColor` aplican a flowcharts y diagramas de clases.
