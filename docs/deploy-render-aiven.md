# Despliegue en Docker Hub + Render + Aiven

## Arquitectura propuesta

- `gridbot-backend`: API REST + Socket.IO + Prisma + bootstrap del sistema.
- `gridbot-frontend`: SPA de React compilada y servida con Nginx.
- Base de datos: Aiven PostgreSQL por `DATABASE_URL`.
- MQTT: servicio externo accesible públicamente o una instancia aparte en Render.

## Imágenes preparadas

- Backend: [docker/backend/Dockerfile.prod](/home/sinoe/GRIDBOT/docker/backend/Dockerfile.prod)
- Frontend: [docker/frontend/Dockerfile.prod](/home/sinoe/GRIDBOT/docker/frontend/Dockerfile.prod)

## Consideraciones

- El backend ejecuta `prisma migrate deploy` al iniciar.
- El backend conserva el bootstrap actual; si la base está vacía, intentará asegurar nodos, operadores demo, mapa, robots y tareas base.
- El frontend debe compilarse con la URL pública real del backend, porque Render lo servirá como servicio separado.

## Variables mínimas de backend en Render

- `NODE_ENV=production`
- `PORT=4000`
- `DATABASE_URL=postgres://...aiven.../defaultdb?sslmode=require`
- `MQTT_URL=...`
- `CENTRAL_DASHBOARD_PASSWORD=...`
- `TRUST_PROXY=true`
- `PUBLIC_BASE_URL=https://TU-FRONTEND.onrender.com`
- `ALLOWED_ORIGINS=https://TU-FRONTEND.onrender.com`

## Variables recomendadas de backend en Render

- `DEMO_MODE=false`
- `GAME_ONLY_REDIRECT=true`
- `ALLOW_PRIVATE_NETWORK_ORIGINS=false`
- `RATE_LIMIT_ENABLED=true`
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX=100`
- `LOGIN_RATE_LIMIT_MAX=10`
- `SOCKET_MAX_CONNECTIONS_PER_IP=3`
- `TICK_RATE_HZ=20`
- `OBSTACLE_FOV_RADIUS=3`
- `CENTRAL_SESSION_GRACE_MS=45000`
- `DYNAMIC_OBSTACLES_ENABLED=true`
- `DYNAMIC_OBSTACLE_MOVE_CHANCE=0.08`
- `DYNAMIC_OBSTACLE_TICK_INTERVAL=10`
- `ROBOT_FAILURES_ENABLED=true`
- `ROBOT_FAILURE_CHANCE_PER_TICK=0.002`
- `ROBOT_FAILURE_MIN_TICKS_BETWEEN_EVENTS=200`
- `WAREHOUSE_GRID_WIDTH=40`
- `WAREHOUSE_GRID_HEIGHT=40`
- `GAME_GRID_WIDTH=10`
- `GAME_GRID_HEIGHT=10`
- `GAME_TICK_RATE_HZ=2`
- `GAME_INITIAL_LIVES=3`
- `GAME_MAX_LIVES=3`
- `GAME_NORMAL_POINTS=10`
- `GAME_BONUS_POINTS=25`
- `GAME_LIFE_ITEMS=1`
- `GAME_NORMAL_ITEMS=5`
- `GAME_BONUS_ITEMS=2`
- `GAME_OBSTACLES=8`
- `GAME_INVULNERABLE_MS=2000`

## Variables opcionales heredadas

- `PUBLIC_HOST_IP`
- `FRONTEND_PORT`
- `OPERATOR_PC_B01_PASSWORD`
- `OPERATOR_PC_B02_PASSWORD`
- `OPERATOR_PC_B03_PASSWORD`

No son críticas para Render si ya manejas operadores desde PostgreSQL y el frontend compila con URL absoluta.

## Flujo recomendado en Render

### Backend

- Tipo: `Web Service`
- Fuente: `Docker Image`
- Imagen: `docker.io/TU_USUARIO/gridbot-backend:TAG`
- Puerto: `4000`

### Frontend

- Tipo: `Web Service`
- Fuente: `Docker Image`
- Imagen: `docker.io/TU_USUARIO/gridbot-frontend:TAG`
- Puerto: `80`

## Orden recomendado

1. Crear backend en Render con `DATABASE_URL` de Aiven y `MQTT_URL`.
2. Esperar a que Render entregue la URL pública del backend.
3. Compilar y publicar la imagen del frontend usando esa URL pública.
4. Crear frontend en Render usando la imagen ya compilada.

## Comandos de Docker Hub

### 1. Iniciar sesión

```bash
docker login
```

### 2. Construir y subir backend

```bash
docker build -f docker/backend/Dockerfile.prod -t TU_USUARIO_DOCKERHUB/gridbot-backend:latest .
docker push TU_USUARIO_DOCKERHUB/gridbot-backend:latest
```

### 3. Construir y subir frontend

Reemplaza `TU_BACKEND_RENDER_URL` por la URL pública real del backend en Render, por ejemplo:
`https://gridbot-backend.onrender.com`

```bash
docker build \
  -f docker/frontend/Dockerfile.prod \
  --build-arg VITE_API_BASE_URL=TU_BACKEND_RENDER_URL/api \
  --build-arg VITE_SOCKET_URL=TU_BACKEND_RENDER_URL \
  --build-arg VITE_GAME_ONLY_REDIRECT=true \
  -t TU_USUARIO_DOCKERHUB/gridbot-frontend:latest .

docker push TU_USUARIO_DOCKERHUB/gridbot-frontend:latest
```

## Variables exactas sugeridas para Render

### Backend

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgres://avnadmin:TU_PASSWORD_AIVEN@TU_HOST_AIVEN:TU_PUERTO_AIVEN/defaultdb?sslmode=require
MQTT_URL=mqtt://TU_BROKER_MQTT:1883
CENTRAL_DASHBOARD_PASSWORD=gridrobot_admin_2026
TRUST_PROXY=true
PUBLIC_BASE_URL=https://TU_FRONTEND_RENDER_URL
ALLOWED_ORIGINS=https://TU_FRONTEND_RENDER_URL
DEMO_MODE=false
GAME_ONLY_REDIRECT=true
ALLOW_PRIVATE_NETWORK_ORIGINS=false
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
LOGIN_RATE_LIMIT_MAX=10
SOCKET_MAX_CONNECTIONS_PER_IP=3
TICK_RATE_HZ=20
OBSTACLE_FOV_RADIUS=3
CENTRAL_SESSION_GRACE_MS=45000
DYNAMIC_OBSTACLES_ENABLED=true
DYNAMIC_OBSTACLE_MOVE_CHANCE=0.08
DYNAMIC_OBSTACLE_TICK_INTERVAL=10
ROBOT_FAILURES_ENABLED=true
ROBOT_FAILURE_CHANCE_PER_TICK=0.002
ROBOT_FAILURE_MIN_TICKS_BETWEEN_EVENTS=200
WAREHOUSE_GRID_WIDTH=40
WAREHOUSE_GRID_HEIGHT=40
GAME_GRID_WIDTH=10
GAME_GRID_HEIGHT=10
GAME_TICK_RATE_HZ=2
GAME_INITIAL_LIVES=3
GAME_MAX_LIVES=3
GAME_NORMAL_POINTS=10
GAME_BONUS_POINTS=25
GAME_LIFE_ITEMS=1
GAME_NORMAL_ITEMS=5
GAME_BONUS_ITEMS=2
GAME_OBSTACLES=8
GAME_INVULNERABLE_MS=2000
```

### Frontend

Si el frontend se publica como imagen ya compilada, no necesita variables de runtime obligatorias en Render.

## Notas importantes

- Si no tienes broker MQTT externo, el backend puede arrancar, pero el monitor MQTT aparecerá desconectado.
- Si quieres funcionalidad MQTT completa en producción, necesitas un broker accesible desde Render.
- Como el frontend queda compilado con la URL del backend, primero se despliega backend y luego frontend.
