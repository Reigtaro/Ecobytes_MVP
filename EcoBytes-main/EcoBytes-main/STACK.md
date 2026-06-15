# EcoBytes — Stack Tecnológico

Documentación de referencia del stack completo utilizado en la plataforma EcoBytes.

---

## Resumen General

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Backend | Express 5 + TypeScript |
| ORM | Prisma 5 |
| Base de datos | MySQL |
| Estilos | Tailwind CSS 4 |
| UI Components | Radix UI |
| Gráficos | Recharts |
| Auth | JWT + cookies httpOnly |
| Email | Resend |
| Runtime | Node.js |

---

## Backend

### Framework y servidor

| Paquete | Versión | Uso |
|---|---|---|
| `express` | ^5.2.1 | Framework HTTP principal |
| `cors` | ^2.8.5 | Middleware CORS para desarrollo |
| `cookie-parser` | ^1.4.7 | Parsing de cookies httpOnly |
| `express-rate-limit` | ^8.2.1 | Limitador de peticiones por IP |

Express 5 corre en el puerto `3001`. CORS habilitado para desarrollo apuntando al frontend en `localhost:3000`.

### Base de datos y ORM

| Paquete | Versión | Uso |
|---|---|---|
| `prisma` | ^5.22.0 | CLI y motor del ORM |
| `@prisma/client` | ^5.22.0 | Cliente generado para queries |
| `mysql2` | ^3.16.0 | Driver MySQL para Node.js |

**Proveedor:** MySQL
**Schema:** `backend/prisma/schema.prisma`

#### Modelos del schema

| Modelo | Tabla | Descripción |
|---|---|---|
| `User` | `users` | Usuarios del sistema con rol asignado |
| `Role` | `roles` | Roles con `sessionTimeout` configurable (minutos) |
| `Permission` | `permissions` | Permisos con estructura `menu/submenu` |
| `RolePermission` | `role_permissions` | Join table rol ↔ permiso |
| `PendingVerification` | `pending_verifications` | Códigos de verificación para registro de email |
| `AccountActionToken` | `account_action_tokens` | Tokens para desactivar/reactivar cuentas |

### Autenticación y seguridad

| Paquete | Versión | Uso |
|---|---|---|
| `jsonwebtoken` | ^9.0.3 | Firma y verificación de JWT |
| `bcryptjs` | ^3.0.3 | Hash de contraseñas |

- JWT almacenado como cookie `httpOnly` (`accessToken`)
- RBAC estricto: permisos son la única fuente de verdad para acceso
- Rate limiting aplicado en endpoints sensibles

### Email

| Paquete | Versión | Uso |
|---|---|---|
| `resend` | ^6.9.1 | Envío transaccional de emails (verificación, notificaciones) |

### Configuración

| Paquete | Versión | Uso |
|---|---|---|
| `dotenv` | ^17.2.3 | Variables de entorno |
| `cross-env` | ^10.1.0 | Variables de entorno cross-platform |

### TypeScript y tooling

| Paquete | Versión | Uso |
|---|---|---|
| `typescript` | ^5.9.3 | Tipado estático |
| `ts-node` | ^10.9.2 | Ejecución directa de TypeScript |
| `ts-node-dev` | ^2.0.0 | Hot reload en desarrollo |

- Configuración: `CommonJS` (`"module": "commonjs"` en tsconfig)
- TypeScript strict mode habilitado

### Variables de entorno (backend)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Secret para firmar access tokens |
| `JWT_REFRESH_SECRET` | Secret para refresh tokens |
| `PORT` | Puerto del servidor (default `3001`) |
| `NODE_ENV` | `"production"` deshabilita logs de debug |
| `FRONTEND_URL` | URL del frontend (default `http://localhost:3000`) |
| `RESEND_API_KEY` | API Key de Resend para envío de emails |

---

## Frontend

### Framework y runtime

| Paquete | Versión | Uso |
|---|---|---|
| `next` | 16.1.1 | Framework React con App Router |
| `react` | 19.2.3 | Librería UI |
| `react-dom` | 19.2.3 | Renderer DOM de React |

- Arquitectura: **App Router** (Next.js 16)
- Server Components por defecto; Client Components marcados con `'use client'`
- Alias de imports: `@/*` → `frontend/src/*`
- Corre en el puerto `3000`

### Estilos

| Paquete | Versión | Uso |
|---|---|---|
| `tailwindcss` | ^4 | Utilidades CSS |
| `@tailwindcss/postcss` | ^4 | Integración PostCSS |

Tailwind v4 con configuración vía PostCSS.

### Componentes UI

| Paquete | Versión | Uso |
|---|---|---|
| `@radix-ui/react-dialog` | ^1.1.15 | Modales accesibles (confirm dialog, etc.) |
| `@radix-ui/react-toast` | ^1.2.15 | Notificaciones tipo toast |

Radix UI provee primitivos headless accesibles sin estilos propios.

### Gráficos y visualización

| Paquete | Versión | Uso |
|---|---|---|
| `recharts` | ^3.6.0 | Gráficos basados en SVG para el dashboard |

### TypeScript y tooling

| Paquete | Versión | Uso |
|---|---|---|
| `typescript` | ^5 | Tipado estático |
| `@types/node` | ^20 | Tipos para Node.js |
| `@types/react` | ^19 | Tipos para React |
| `@types/react-dom` | ^19 | Tipos para React DOM |
| `eslint` | ^9 | Linter |
| `eslint-config-next` | 16.1.1 | Reglas ESLint para Next.js |

- Módulo: `ESNext`
- TypeScript strict mode habilitado

### Variables de entorno (frontend)

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API endpoint (default `http://localhost:3001`) |

---

## Estructura del monorepo

```
EcoBytes/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Entry point (Express, puerto 3001)
│   │   ├── routes/               # auth, roles, users, account
│   │   ├── controllers/          # Handlers por dominio
│   │   ├── middleware/           # auth.ts (JWT), requirePermission.ts (RBAC)
│   │   ├── services/             # emailService.ts (Resend)
│   │   ├── utils/                # logger.ts (dev vs prod)
│   │   └── db/                   # prisma.ts (instancia singleton)
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
└── frontend/
    └── src/
        ├── app/                  # Páginas App Router
        ├── components/           # Sidebar, Toast, ConfirmDialog, Tooltip...
        ├── contexts/             # ThemeContext (modo oscuro/claro)
        ├── lib/                  # auth.ts, api.ts, permissions.ts, types.ts
        └── middleware.ts         # Redirección para rutas protegidas
```

---

## Patrones técnicos clave

### JWT + RBAC

1. Login → JWT firmado con `JWT_SECRET` → almacenado en cookie `httpOnly`
2. Cada request → `authenticateToken` middleware valida el token
3. Rutas protegidas → `requirePermission('permiso.nombre')` verifica el rol del usuario
4. Permisos definidos con estructura `menu.submenu.accion` (ej. `seguridad.usuarios.ver`)

### Session Timeout

- Cada `Role` define `sessionTimeout` en minutos
- El frontend muestra un modal de advertencia antes de expirar
- Al expirar → redirección a `/login`

### Logger

- `devLog()` / `devWarn()` / `devError()` — solo en `NODE_ENV !== 'production'`
- `console.error` — siempre visible, reservado para errores críticos reales

### Modo oscuro/claro

- Manejado por `ThemeContext` (React Context)
- Persistido en preferencias del usuario

---

## Comandos de desarrollo

```bash
# Backend
cd backend
npm run dev          # Hot reload en localhost:3001
npm run build        # Compilar TypeScript → dist/
npm run start:prod   # Producción sin logs de debug
npm run db:push      # Sincronizar schema con MySQL
npm run db:seed      # Insertar datos iniciales
npm run db:reset     # Reset completo + seed

# Frontend
cd frontend
npm run dev          # Next.js dev server en localhost:3000
npm run build        # Build de producción
npm run lint         # ESLint
```

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| Express 5 sobre NestJS | Menor overhead, control explícito del stack |
| Prisma sobre TypeORM/Sequelize | DX superior, type-safety automática desde el schema |
| MySQL sobre PostgreSQL | Compatibilidad con infraestructura existente |
| Next.js App Router | Server Components reducen bundle JS del cliente |
| Radix UI sobre shadcn completo | Primitivos headless accesibles sin opinión de estilos |
| JWT en httpOnly cookies | Protección contra XSS; el cliente JS nunca accede al token |
| RBAC por permisos (no roles) | Granularidad fina sin hardcodear roles en el código |
