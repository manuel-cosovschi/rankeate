# 🚀 Deploy Rankeate – Guía Paso a Paso (10 minutos)

Stack 100% gratuito: **Neon** (PostgreSQL) + **Render** (Backend) + **Vercel** (Frontend).

---

## Paso 1: Subir el código a GitHub (3 min)

1. Andá a **[github.com](https://github.com)** → Registrate (o iniciá sesión)
2. Hacé click en **"+"** → **"New repository"**
3. Nombre: `rankeate` — dejalo **Public** — NO inicializar con README
4. Copiá las instrucciones "push an existing repository" que te da GitHub
5. En tu terminal, ejecutá:

```bash
cd /Users/manuelcosovschi/.gemini/antigravity/scratch/rankeate
git remote add origin https://github.com/TU_USUARIO/rankeate.git
git branch -M main
git push -u origin main
```

---

## Paso 2: Crear Base de Datos en Neon (2 min)

1. Andá a **[neon.tech](https://neon.tech)** → "Sign Up" (podés usar tu cuenta de GitHub)
2. Click **"Create Project"**
   - Name: `rankeate`
   - Region: **US East** (o el más cercano)
3. Te va a dar una **Connection String** que parece algo así:
   ```
   postgresql://neondb_owner:abc123@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Copiá esa URL** → la vas a necesitar en el paso siguiente

---

## Paso 3: Deploy del Backend en Render (2 min)

1. Andá a **[render.com](https://render.com)** → Registrate con GitHub
2. Click **"New +"** → **"Web Service"**
3. Conectá tu repositorio `rankeate` de GitHub
4. Configurá:
   - **Name**: `rankeate-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma db push --accept-data-loss && (npm run db:seed || echo 'Seed skipped') && npm start`
   - **Instance Type**: **Free**
5. Agregá las **Environment Variables** (click "Add Environment Variable"):

| Key | Value |
|---|---|
| `DATABASE_URL` | (pegar la URL de Neon del paso 2) |
| `JWT_SECRET` | `rankeate_jwt_prod_2025_xK9mP` |
| `JWT_REFRESH_SECRET` | `rankeate_refresh_prod_2025_yL8nQ` |
| `CORS_ORIGIN` | (dejar vacío por ahora, completar después del paso 4) |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |

6. Click **"Create Web Service"** → esperar a que el deploy termine (~3-5 min)
7. Render te va a dar una URL como: `https://rankeate-api.onrender.com`
8. Probá que ande: abrí `https://rankeate-api.onrender.com/api/health` → debería decir `{"status":"ok"}`

---

## Paso 4: Deploy del Frontend en Vercel (2 min)

1. Andá a **[vercel.com](https://vercel.com)** → Registrate con GitHub
2. Click **"Add New..."** → **"Project"**
3. Importá tu repositorio `rankeate`
4. Configurá:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js (auto-detectado)
5. Agregá la **Environment Variable**:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://rankeate-api.onrender.com/api` |

   (Usá la URL que te dio Render en el paso 3, agregando `/api` al final)

6. Click **"Deploy"** → esperar ~2 min
7. Vercel te da una URL como: `https://rankeate.vercel.app`

---

## Paso 5: Conectar CORS (1 min)

1. Volvé a **Render** → tu servicio `rankeate-api` → **Environment**
2. Editá `CORS_ORIGIN` y poné la URL de Vercel:
   ```
   https://rankeate.vercel.app
   ```
   (o la URL que te haya dado Vercel)
3. Guardá → Render va a re-deployar automáticamente (~1 min)

---

## ✅ ¡Listo!

Tu app está en vivo en: `https://rankeate.vercel.app`

### Credenciales de prueba (del seed):

| Rol | Email | Contraseña |
|---|---|---|
| Admin | admin@rankeate.com | Admin123! |
| Club | club@rankeate.com | Club123! |
| Jugador | martin@rankeate.com | Player123! |
| Jugador | lucia@rankeate.com | Player123! |
| Jugador | santiago@rankeate.com | Player123! |

### ⚠️ Limitaciones del tier gratuito:

- **Render Free**: el backend se "duerme" después de 15 min sin actividad. La primera visita tarda ~30 seg en despertar.
- **Neon Free**: 0.5GB de storage (suficiente para miles de jugadores).
- **Vercel Free**: sin límites prácticos para proyectos personales.

### 🔒 Seguridad (para cuando tengas tráfico real):

1. Cambiá los JWT secrets por claves más largas y aleatorias
2. Cambiá las contraseñas de los usuarios seed (admin, club, etc.)
3. Considerá agregar HTTPS con dominio propio
