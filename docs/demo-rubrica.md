# Demo técnica para la rúbrica de Desarrollo de Sistemas en Red

Este documento reúne tres escenarios cortos y verificables para demostrar que GRIDBOT cumple con:

- envío de datos en tiempo real,
- persistencia de eventos en base de datos,
- persistencia estructurada de telemetría por robot,
- reporteo histórico vía API REST,
- interacción con actuadores/emuladores usando MQTT.

## Preparación previa

### 1. Levantar el sistema

En desarrollo local:

```bash
cd /home/sinoe/GRIDBOT
docker compose up -d postgres mqtt

cd backend
npm install
npm run prisma:generate
npm run dev

cd ../frontend
npm install
npm run dev
```

En demo LAN:

```bash
cd /home/sinoe/GRIDBOT
docker compose -f docker-compose.demo.yml up -d
```

### 1.1. Emulador MQTT externo opcional

Para demostrar un cliente MQTT separado del backend:

```bash
cd /home/sinoe/GRIDBOT
docker compose --profile mqtt-emulator up -d mqtt-emulator
```

O sin Docker:

```bash
cd /home/sinoe/GRIDBOT/backend
npm install
MQTT_URL=mqtt://localhost:1883 npm run emulator:mqtt
```

### 1.2. Modo híbrido controlado

- `MQTT_INTERNAL_SIMULATOR_ENABLED=true`
  comportamiento por defecto, útil para una demo estable aunque no exista emulador externo.
- `MQTT_INTERNAL_SIMULATOR_ENABLED=false`
  recomendado cuando quieras evidenciar solo el flujo con el emulador MQTT externo y evitar respuestas duplicadas.

### 2. URLs esperadas

- Panel central: `http://IP-DE-MI-PC/admin`
- Acceso principal en modo almacén: `http://IP-DE-MI-PC/`

### 3. Login central

```bash
curl -s -X POST http://localhost:4000/api/sessions/central/login \
  -H 'Content-Type: application/json' \
  -d '{"password":"gridrobot_admin_2026"}'
```

Guarda el `token` devuelto como `CENTRAL_TOKEN`.

Ejemplo:

```bash
CENTRAL_TOKEN="PEGA_AQUI_EL_TOKEN"
```

## Escenario A. Datos en tiempo real

### Objetivo

Demostrar que el sistema recibe y muestra actividad en tiempo real desde la capa MQTT/Socket.IO hasta el panel administrador.

### Precondiciones

- El backend debe estar conectado a Mosquitto.
- El panel central debe estar abierto en la sección principal.
- Debe existir al menos un robot activo.

### Pasos

1. Entrar al panel central.
2. Abrir la sección **Monitor de red**.
3. Seleccionar un robot visible en el panel central.
4. Esperar algunos segundos para ver eventos de telemetría periódica.
5. Si se desea forzar actividad, enviar un comando desde el mismo monitor.

### Qué debe observarse en admin

- Estado de Socket.IO como `conectado`.
- Estado de MQTT como `conectado` o `reconectando`.
- Eventos recientes en el bloque de **últimos eventos MQTT**.
- Eventos recientes en **últimos eventos persistidos**.
- Hora y detalle de la última actualización recibida.

### Qué debe observarse en operador/emulador

- El robot mantiene o actualiza su estado sin recargar la página.
- Si hay emulador externo conectado, debe reflejar el comando o estado publicado.
- Si no hay emulador externo, el simulador MQTT interno responde automáticamente para mantener la demo.

### Endpoint o tópico usado

- Socket.IO: `/socket.io`
- MQTT:
  - `gridbot/robots/{robotId}/commands`
  - `gridbot/robots/{robotId}/telemetry`
  - `gridbot/robots/{robotId}/status`
  - `gridbot/tasks/events`
  - `gridrobot/world/obstacles`

### Evidencia esperada

- El panel muestra cambios de estado en vivo.
- Aparecen eventos `MQTT_MESSAGE_RECEIVED` en el histórico.
- Se observa tráfico reciente sin recargar manualmente la interfaz.
- Si el emulador externo está activo, su consola imprime cada comando recibido.

## Escenario B. Persistencia e histórico REST

### Objetivo

Demostrar que los eventos relevantes del sistema se guardan en base de datos y pueden consultarse después mediante API REST.

### Precondiciones

- Haber ejecutado al menos una acción de tarea, obstáculo o comando MQTT.
- Tener un token válido del panel central.

### Pasos

1. Crear o preparar una tarea desde la interfaz.
2. Asignar un robot a la tarea.
3. Iniciar el viaje manualmente.
4. Consultar el histórico por API.

### Qué debe observarse en admin

- En el monitor aparecen eventos nuevos como:
  - `TASK_CREATED`
  - `TASK_ASSIGNED`
  - `TASK_STARTED`
  - `TASK_COMPLETED`
- La lista de eventos persistidos muestra fecha, tipo y fuente.

### Qué debe observarse en operador/emulador

- El operador ve el flujo normal de preparación e inicio.
- El comportamiento operativo actual no se rompe.

### Endpoint o tópico usado

- `GET /api/history/events`
- `GET /api/history/events?type=TASK_STARTED`
- `GET /api/history/robots/:robotId`
- `GET /api/history/tasks/:taskId`
- `GET /api/history/telemetry`
- `GET /api/history/telemetry/:robotId`

### Comandos de prueba

Consultar últimos eventos:

```bash
curl -s http://localhost:4000/api/history/events \
  -H "x-session-token: $CENTRAL_TOKEN"
```

Filtrar por tipo:

```bash
curl -s "http://localhost:4000/api/history/events?type=MQTT_MESSAGE_RECEIVED&limit=10" \
  -H "x-session-token: $CENTRAL_TOKEN"
```

Filtrar por rango de fechas:

```bash
curl -s "http://localhost:4000/api/history/events?from=2026-05-26T00:00:00.000Z&to=2026-05-27T00:00:00.000Z" \
  -H "x-session-token: $CENTRAL_TOKEN"
```

Histórico por robot:

```bash
ROBOT_ID="PEGA_AQUI_EL_ID_DEL_ROBOT"

curl -s http://localhost:4000/api/history/robots/$ROBOT_ID \
  -H "x-session-token: $CENTRAL_TOKEN"
```

Histórico por tarea:

```bash
TASK_ID="PEGA_AQUI_EL_ID_DE_LA_TAREA"

curl -s http://localhost:4000/api/history/tasks/$TASK_ID \
  -H "x-session-token: $CENTRAL_TOKEN"
```

Telemetría histórica general:

```bash
curl -s "http://localhost:4000/api/history/telemetry?limit=10" \
  -H "x-session-token: $CENTRAL_TOKEN"
```

Telemetría por robot:

```bash
curl -s "http://localhost:4000/api/history/telemetry/$ROBOT_ID?limit=10" \
  -H "x-session-token: $CENTRAL_TOKEN"
```

### Evidencia esperada

- La API responde con eventos ordenados por fecha descendente.
- Los eventos contienen `type`, `source`, `topic`, `robotId`, `taskId`, `payload` y `createdAt`.
- Los mismos eventos mostrados en el monitor pueden consultarse por REST.
- La telemetría estructurada muestra `robotId`, `x`, `y`, `status`, `speedCellsPerSec`, `taskId`, `source` y `recordedAt`.

## Escenario C. Interacción con actuadores vía MQTT

### Objetivo

Demostrar el flujo completo:

**front/admin -> backend -> comando MQTT -> emulador o simulador -> status/telemetry -> backend -> Socket.IO/front**

### Precondiciones

- Tener un robot activo y no desconectado.
- Tener abierta la vista del panel central.

### Pasos

1. Abrir el **Monitor de red** en el panel central.
2. Seleccionar un robot.
3. Enviar uno de estos comandos:
   - `PAUSE`
   - `RESUME`
   - `EMERGENCY_STOP`
   - `SET_SPEED`
4. Observar la respuesta del sistema en tiempo real.
5. Consultar el histórico REST para confirmar persistencia del comando y su respuesta.

### Qué debe observarse en admin

- Se actualiza el bloque **último comando enviado**.
- Aparece un evento `ACTUATOR_COMMAND`.
- Poco después aparece un evento `MQTT_MESSAGE_RECEIVED`.
- El estado del robot cambia en el panel y en el monitor.

### Qué debe observarse en operador/emulador

- Si hay emulador MQTT externo, debe recibir el tópico de comando.
- Si no hay emulador externo, el simulador interno genera la respuesta automáticamente.
- El cambio de estado o velocidad se refleja en la operación.

### Endpoint o tópico usado

- Endpoint:
  - `POST /api/robots/:robotId/commands`
- MQTT:
  - `gridbot/robots/{robotId}/commands`
  - `gridbot/robots/{robotId}/status`
  - `gridbot/robots/{robotId}/telemetry`

### Comandos de prueba

Pausar robot:

```bash
curl -s -X POST http://localhost:4000/api/robots/$ROBOT_ID/commands \
  -H "Content-Type: application/json" \
  -H "x-session-token: $CENTRAL_TOKEN" \
  -d '{"command":"PAUSE"}'
```

Reanudar robot:

```bash
curl -s -X POST http://localhost:4000/api/robots/$ROBOT_ID/commands \
  -H "Content-Type: application/json" \
  -H "x-session-token: $CENTRAL_TOKEN" \
  -d '{"command":"RESUME"}'
```

Alto de emergencia:

```bash
curl -s -X POST http://localhost:4000/api/robots/$ROBOT_ID/commands \
  -H "Content-Type: application/json" \
  -H "x-session-token: $CENTRAL_TOKEN" \
  -d '{"command":"EMERGENCY_STOP"}'
```

Ajustar velocidad:

```bash
curl -s -X POST http://localhost:4000/api/robots/$ROBOT_ID/commands \
  -H "Content-Type: application/json" \
  -H "x-session-token: $CENTRAL_TOKEN" \
  -d '{"command":"SET_SPEED","speedCellsPerSec":0.5}'
```

### Evidencia esperada

- El comando queda registrado como `ACTUATOR_COMMAND`.
- La respuesta MQTT queda registrada como `MQTT_MESSAGE_RECEIVED`.
- El panel central refleja el nuevo estado del robot.
- El histórico REST permite mostrar el antes y después del mismo robot.

## Escenario D. Salud real del sistema

### Objetivo

Comprobar antes de la presentación que la API, PostgreSQL y MQTT están en estado correcto.

### Endpoint usado

- `GET /api/health`

### Comando de prueba

```bash
curl -s http://localhost:4000/api/health
```

### Respuesta esperada

```json
{
  "status": "ok",
  "api": "ok",
  "database": "ok",
  "mqtt": "connected",
  "timestamp": "2026-06-10T12:00:00.000Z",
  "mode": "WAREHOUSE"
}
```

Si PostgreSQL o MQTT fallan, el endpoint responde `503` con `status: "degraded"`.

## Checklist rápido de demostración

- `Socket.IO` conectado.
- `MQTT` conectado.
- Emulador MQTT externo activo si se va a demostrar publicación/suscripción distribuida.
- El monitor de red muestra eventos recientes.
- Los comandos al robot responden sin recargar.
- Existe al menos una fila reciente en `robot_telemetry`.
- El histórico REST devuelve datos persistidos.
- La operación normal de tareas sigue funcionando.
- La demo LAN sigue siendo accesible desde otros dispositivos.
