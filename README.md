# Rankeate – Sistema de Rankings Deportivos

Sistema completo de rankings por localidad y categoría, con administración de torneos, puntos y clubes organizadores.

## Stack

| Componente | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Base de datos | MySQL 8.0 |
| ORM | Prisma |
| Auth | JWT + Refresh Tokens |
| Contenedores | Docker + Docker Compose |

## Requisitos

- **Docker** y **Docker Compose** instalados
- O bien: **Node.js 20+** y **MySQL 8.0** para desarrollo sin Docker

## Inicio Rápido (Docker)

```bash
# 1. Clonar y entrar al proyecto
cd rankeate

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar todo
docker-compose up --build

# 4. Acceder
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001/api
# MySQL: localhost:3306
```

## Inicio Rápido (Sin Docker)

```bash
# 1. MySQL: crear base de datos 'rankeate'

# 2. Backend
cd backend
cp ../.env.example ../.env  # ajustar DATABASE_URL
npm install
npx prisma migrate dev
npm run db:seed
npm run dev

# 3. Frontend (otra terminal)
cd frontend
npm install
npm run dev
```

## Credenciales Seed

| Rol | Email | Contraseña |
|---|---|---|
| **Admin** | admin@rankeate.com | Admin123! |
| **Club** (aprobado) | club@rankeate.com | Club123! |
| **Jugador** | martin@rankeate.com | Player123! |
| **Jugador** | lucia@rankeate.com | Player123! |
| **Jugador** | santiago@rankeate.com | Player123! |

## Estructura del Proyecto

```
rankeate/
├── docker-compose.yml
├── .env / .env.example
├── README.md
├── backend/
│   ├── prisma/           # Schema + seed + migraciones
│   └── src/
│       ├── index.ts      # Express entry point
│       ├── config.ts     # Env vars
│       ├── middleware/    # Auth, roles, validación
│       ├── routes/        # auth, rankings, players, clubs, admin, corrections
│       ├── services/      # Points, ranking, audit
│       └── utils/         # JWT, password
└── frontend/
    └── src/
        ├── app/           # Next.js pages
        ├── components/    # Navbar, etc.
        └── lib/           # API client, auth context
```

## API Endpoints

### Públicos (sin auth)
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/rankings?localityId=&categoryId=&page=` | Rankings con filtros |
| GET | `/api/rankings/categories` | Lista de categorías |
| GET | `/api/rankings/localities` | Lista de localidades |
| GET | `/api/players?query=` | Buscar jugadores |
| GET | `/api/players/:id` | Perfil público de jugador |
| GET | `/api/health` | Health check |

### Auth
| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/auth/register-player` | Registro de jugador |
| POST | `/api/auth/register-club` | Registro de club |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refrescar token |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/forgot-password` | Recovery (mock) |
| GET | `/api/auth/me` | Info del usuario actual |

### Club (requiere auth CLUB + APROBADO)
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/clubs/me` | Dashboard del club |
| POST | `/api/clubs/tournaments` | Crear torneo |
| GET | `/api/clubs/tournaments/:id` | Detalle de torneo |
| POST | `/api/clubs/tournaments/:id/results` | Cargar resultados |
| POST | `/api/clubs/tournaments/:id/results/confirm` | Confirmar + asignar puntos |
| GET | `/api/clubs/players/search?query=&dni=` | Buscar jugadores |

### Admin (requiere auth ADMIN)
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/admin/clubs/pending` | Clubes pendientes |
| POST | `/api/admin/clubs/:id/approve` | Aprobar club |
| POST | `/api/admin/clubs/:id/reject` | Rechazar club |
| POST | `/api/admin/point-movements/:id/void` | Anular puntos |
| GET | `/api/admin/reports` | Reportes y estadísticas |
| GET | `/api/admin/corrections` | Solicitudes de corrección |
| POST | `/api/admin/corrections/:id/resolve` | Resolver corrección |

### Jugador (requiere auth PLAYER)
| Método | Endpoint | Descripción |
|---|---|---|
| PUT | `/api/players/me` | Editar perfil |
| GET | `/api/players/me/history` | Historial de puntos |
| POST | `/api/corrections` | Crear solicitud |
| GET | `/api/corrections/me` | Mis solicitudes |

## Sistema de Puntos

| Nivel | Campeón | Finalista | SF | QF | R16 | Participante |
|---|---|---|---|---|---|---|
| Local (250) | 250 | 150 | 90 | 45 | 20 | 5 |
| Regional (500) | 500 | 300 | 180 | 90 | 45 | 10 |
| Open (1000) | 1000 | 600 | 360 | 180 | 90 | 25 |

**Ranking:** Mejores 8 resultados en ventana de 12 meses (rolling).

## Seguridad

- JWT con access token (15 min) + refresh token (7 días) rotativo
- Passwords hasheados con bcrypt (12 rounds)
- Rate limiting: 200 req/15min general, 30 req/15min auth
- Validación de inputs con Zod
- SQL injection prevention vía Prisma ORM
- CORS configurado vía .env
- Auditoría completa de todas las acciones administrativas
