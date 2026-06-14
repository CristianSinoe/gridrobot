# Demo LAN de GRIDBOT

## Objetivo

Esta configuración expone una sola URL pública para estudiantes y mantiene el panel administrativo separado en la misma base:

- Estudiantes: `http://IP-DE-MI-PC`
- Administrador: `http://IP-DE-MI-PC/admin`

El acceso público usa mismo origen:

- API: `/api`
- Socket.IO: `/socket.io`
- Juego: `/game`

## Variables clave

Ejemplo recomendado:

```env
PUBLIC_BASE_URL=http://10.42.0.1
PROXY_PORT=80
DEMO_MODE=true
ALLOW_PRIVATE_NETWORK_ORIGINS=true
RATE_LIMIT_ENABLED=true
SOCKET_MAX_CONNECTIONS_PER_IP=3
GAME_ONLY_REDIRECT=true
```

Si cambia la IP del hotspot, actualiza `PUBLIC_BASE_URL` antes de levantar la demo.

## Cómo levantar la demo

```bash
docker compose -f docker-compose.demo.yml up -d --build
```

Para detenerla:

```bash
docker compose -f docker-compose.demo.yml down
```

## Puertos expuestos

### Demo

Solo queda expuesto el proxy:

- `80` -> Nginx

En la configuración de demo no se exponen al alumnado:

- PostgreSQL
- MQTT
- backend Node
- frontend Vite preview

### Desarrollo

El archivo `docker-compose.yml` actual conserva la exposición de puertos para trabajo local.

## Cómo funciona el proxy

Nginx enruta:

- `/api` -> `backend:4000`
- `/socket.io` -> `backend:4000`
- `/` -> `frontend:4173`

También reenvía:

- `Host`
- `X-Real-IP`
- `X-Forwarded-For`
- `X-Forwarded-Proto`

## CORS dinámico

La política de CORS ahora funciona así:

- permite requests sin `Origin` para health o tráfico interno
- permite orígenes explícitos en `ALLOWED_ORIGINS`
- en demo permite `PUBLIC_BASE_URL`
- si `ALLOW_PRIVATE_NETWORK_ORIGINS=true`, permite redes privadas y localhost
- rechaza dominios públicos externos

La misma lógica se usa para Express y Socket.IO.

## Rutas según el modo

### Cuando `systemMode === GAME`

- `/` redirige a `/game` para usuarios no admin
- `/game` muestra la experiencia pública
- `/admin` sigue disponible para el panel central
- las operaciones de almacén quedan bloqueadas para no-admin

### Cuando `systemMode === WAREHOUSE`

- `/` funciona como el sistema normal
- `/admin` funciona como panel administrativo
- `/game` no permite jugar y muestra el mensaje: `El modo juego no está activo.`

## Cómo probar desde otro dispositivo

1. Conecta el dispositivo al punto de acceso de tu computadora.
2. Abre `http://IP-DE-MI-PC`.
3. Verifica que, si el sistema está en `GAME`, el navegador termina en `/game`.
4. Verifica que el admin pueda entrar a `http://IP-DE-MI-PC/admin`.
5. Cambia entre `GAME` y `WAREHOUSE` desde el panel admin y repite la prueba.

## Verificación rápida de puertos

Para revisar los puertos publicados por la demo:

```bash
docker compose -f docker-compose.demo.yml ps
```

Debes ver solo el proxy publicado hacia el host.
