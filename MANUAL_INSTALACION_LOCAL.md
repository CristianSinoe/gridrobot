# Manual de instalacion local - GRIDBOT

Este manual deja el proyecto funcionando en una maquina local, incluyendo:

- limpieza de dependencias
- reinstalacion de paquetes
- configuracion de `.env`
- creacion de base de datos
- migraciones Prisma
- carga de datos iniciales
- comandos de ejecucion local y en red local

## 1. Requisitos

- Node.js 22 recomendado
- npm
- PostgreSQL 16 recomendado
- un broker MQTT

Si no quieres instalar PostgreSQL y MQTT manualmente, puedes levantarlos con Docker usando el `docker-compose.yml` de este repo.

## 2. Estructura del proyecto

- `backend`: API, sockets, logica de negocio
- `frontend`: interfaz Vite + React
- `database/prisma`: schema, migraciones y seed
- `.env`: variables para `docker-compose`
- `backend/.env`: variables para correr backend local
- `frontend/.env`: variables para correr frontend local

## 3. Limpieza de dependencias

Desde la raiz del proyecto:

```bash
cd /ruta/a/GRIDBOT
rm -rf node_modules
rm -rf backend/node_modules
rm -rf frontend/node_modules
rm -rf packages/simulation-engine/node_modules
```

Si quieres una limpieza mas agresiva, tambien puedes borrar los `package-lock.json`, pero no es obligatorio.

## 4. Reinstalar dependencias

Este repo usa workspaces, asi que normalmente basta con instalar desde la raiz:

```bash
cd /ruta/a/GRIDBOT
npm install
```

## 5. Configurar los `.env`

### 5.1. Archivo raiz `.env`

Este archivo lo usa `docker-compose`.

```bash
cp .env.example .env
```

Variables importantes:

- `POSTGRES_DB`: nombre de la base
- `POSTGRES_USER`: usuario PostgreSQL
- `POSTGRES_PASSWORD`: password PostgreSQL
- `POSTGRES_PORT`: puerto publicado en tu maquina
- `PUBLIC_HOST_IP`: IP de tu PC en la red local
- `BACKEND_PORT`: puerto del backend
- `FRONTEND_PORT`: puerto del frontend
- `MQTT_PORT`: puerto MQTT
- `MQTT_WS_PORT`: puerto websocket de MQTT

Ejemplo:

```env
POSTGRES_DB=gridrobot
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
PUBLIC_HOST_IP=192.168.1.50

BACKEND_PORT=4000
FRONTEND_PORT=5173
MQTT_PORT=1883
MQTT_WS_PORT=9001

GRIDROBOT_TICK_RATE_HZ=20
```

`PUBLIC_HOST_IP` debe ser la IP real de tu equipo, por ejemplo `192.168.1.50`.

### 5.2. Archivo `backend/.env`

```bash
cp backend/.env.example backend/.env
```

Variables importantes:

- `PORT`: puerto del backend
- `PUBLIC_HOST_IP`: IP de tu equipo en la red local
- `FRONTEND_PORT`: puerto del frontend
- `ALLOWED_ORIGINS`: URLs permitidas para CORS
- `DATABASE_URL`: conexion a PostgreSQL
- `MQTT_URL`: conexion al broker MQTT
- `CENTRAL_DASHBOARD_PASSWORD`: clave del panel central

Ejemplo recomendado:

```env
PORT=4000
NODE_ENV=development
PUBLIC_HOST_IP=192.168.1.50
FRONTEND_PORT=5173
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.50:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gridrobot?schema=public
MQTT_URL=mqtt://localhost:1883
TICK_RATE_HZ=20
CENTRAL_DASHBOARD_PASSWORD=gridrobot_admin_2026
OBSTACLE_FOV_RADIUS=3
CENTRAL_SESSION_GRACE_MS=45000
```

Importante:

- si tu Postgres local escucha en `5432`, deja `5432`
- si levantas Postgres con Docker y lo publicas en `5433`, cambia tambien `DATABASE_URL` a `localhost:5433`
- el `POSTGRES_PORT` del `.env` raiz y el puerto de `DATABASE_URL` deben coincidir

Ejemplo usando Docker con Postgres publicado en `5433`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/gridrobot?schema=public
```

### 5.3. Archivo `frontend/.env`

```bash
cp frontend/.env.example frontend/.env
```

Contenido base:

```env
VITE_BACKEND_PROTOCOL=http
VITE_BACKEND_PORT=4000
```

No hace falta indicar IP aqui porque el frontend toma automaticamente el hostname desde el navegador.

## 6. Base de datos y MQTT

Tienes dos formas de preparar la infraestructura.

### Opcion A: usar Docker solo para PostgreSQL y MQTT

Desde la raiz:

```bash
docker compose up -d postgres mqtt
```

Verificar:

```bash
docker compose ps
```

Con esta opcion:

- PostgreSQL queda publicado en el puerto definido por `POSTGRES_PORT`
- MQTT queda publicado en `MQTT_PORT`
- el backend local debe apuntar a `localhost:<POSTGRES_PORT>` y `mqtt://localhost:<MQTT_PORT>`

### Opcion B: instalar PostgreSQL y MQTT manualmente

Debes crear:

- una base de datos llamada igual que en `DATABASE_URL`
- un usuario con sus credenciales
- un broker MQTT escuchando en `1883`

Ejemplo con `psql`:

```sql
CREATE DATABASE gridrobot;
```

Si quieres crear usuario y permisos:

```sql
CREATE USER postgres WITH PASSWORD 'postgres';
ALTER USER postgres CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE gridrobot TO postgres;
```

Si ya usas el usuario `postgres` del sistema, normalmente solo necesitas crear la base.

## 7. Generar cliente Prisma y ejecutar migraciones

Desde `backend`:

```bash
cd /ruta/a/GRIDBOT/backend
npm run prisma:generate
npm run prisma:migrate
```

Eso ejecuta:

- `prisma generate`
- `prisma migrate dev --schema ../database/prisma/schema.prisma`

## 8. Cargar datos iniciales

Desde `backend`:

```bash
cd /ruta/a/GRIDBOT/backend
npm run seed
```

Esto carga los datos de desarrollo iniciales definidos en `database/prisma/seed.ts`.

## 9. Ejecutar el proyecto en local

Abre dos terminales.

### Terminal 1: backend

```bash
cd /ruta/a/GRIDBOT/backend
npm run dev
```

El backend arranca en el puerto definido por `PORT`, normalmente `4000`.

Nota: en este proyecto el backend ya queda escuchando sin fijar un host explicito, asi que normalmente es accesible desde la red local si el firewall lo permite.

### Terminal 2: frontend

```bash
cd /ruta/a/GRIDBOT/frontend
npm run dev
```

El frontend arranca normalmente en `5173`.

En este repo, `vite.config.ts` ya tiene:

```ts
server: {
  host: "0.0.0.0",
  port: 5173
}
```

Eso significa que `npm run dev` ya funciona como modo host/red local.

## 10. Comandos "run" y "run host"

### Frontend

Modo normal:

```bash
cd frontend
npm run dev
```

Modo host/red local:

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

En este repo ambos terminan siendo equivalentes, porque Vite ya esta configurado con `host: "0.0.0.0"`.

### Backend

Modo normal:

```bash
cd backend
npm run dev
```

No existe un script separado de "host". En la practica, este backend ya escucha correctamente con `npm run dev`.

## 11. URLs esperadas

Si todo esta bien configurado:

- frontend local: `http://localhost:5173`
- frontend en LAN: `http://TU_IP:5173`
- backend API local: `http://localhost:4000/api`
- backend API en LAN: `http://TU_IP:4000/api`

Ejemplo:

- `http://192.168.1.50:5173`
- `http://192.168.1.50:4000/api`

## 12. Flujo completo recomendado

```bash
cd /ruta/a/GRIDBOT
rm -rf node_modules backend/node_modules frontend/node_modules packages/simulation-engine/node_modules
npm install
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up -d postgres mqtt
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

En otra terminal:

```bash
cd /ruta/a/GRIDBOT/frontend
npm run dev
```

## 13. Problemas frecuentes

### Error de conexion a PostgreSQL

Revisa que:

- PostgreSQL este levantado
- `DATABASE_URL` use el puerto correcto
- el nombre de base, usuario y password coincidan

### Error de CORS

Revisa `backend/.env`:

- `PUBLIC_HOST_IP` debe ser tu IP real
- `ALLOWED_ORIGINS` debe incluir `localhost`, `127.0.0.1` y tu IP LAN

### El frontend abre local pero no desde otra PC

Revisa:

- que estes entrando a `http://TU_IP:5173`
- que el firewall permita el puerto `5173`
- que tu equipo y la otra PC esten en la misma red

### El backend no responde desde otra PC

Revisa:

- que el firewall permita el puerto `4000`
- que estes usando `http://TU_IP:4000/api`
- que el backend este ejecutandose sin errores

## 14. Scripts disponibles

### Backend

```bash
npm run dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run lint
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## 15. Resumen corto

1. Instalar dependencias desde la raiz con `npm install`.
2. Crear `.env`, `backend/.env` y `frontend/.env`.
3. Levantar PostgreSQL y MQTT.
4. Ejecutar `npm run prisma:generate`, `npm run prisma:migrate` y `npm run seed` en `backend`.
5. Correr `npm run dev` en `backend`.
6. Correr `npm run dev` en `frontend`.

