# Auditoría de cumplimiento de rúbrica - GRIDBOT

## 1. Resumen ejecutivo

- **Porcentaje estimado de cumplimiento actual:** **72%**
- **Riesgos principales:**
  - No existe un **reporte técnico final consolidado** en el repositorio.
  - El flujo MQTT demostrable existe, pero depende de un **simulador interno en el backend**; no hay un emulador externo independiente en el repositorio.
  - La persistencia histórica existe, pero **no guarda toda la telemetría ni todos los mensajes de tiempo real**; solo eventos seleccionados.
  - No hay **capturas funcionando en red** dentro del repositorio.
  - Hay documentación técnica útil, pero parte de ella está **desactualizada o inconsistente** con el estado actual.
- **Posibilidad real de aspirar al 100%:** **Sí, pero no con el estado actual.** Hace falta cerrar evidencias de demo, consolidar el reporte técnico y robustecer el flujo MQTT/telemetría.
- **Prioridades técnicas:**
  1. Separar o hacer más explícito el emulador MQTT para la demo.
  2. Persistir más datos de tiempo real o acotar formalmente qué evidencia histórica se demostrará.
  3. Generar evidencia visual real de funcionamiento en red.
  4. Corregir documentación técnica desactualizada.

## 2. Matriz de cumplimiento del reporte técnico

| Apartado requerido | Estado | Evidencia encontrada | Riesgo | Acción necesaria |
| --- | --- | --- | --- | --- |
| Hoja de presentación | No cumple | No existe un archivo de reporte técnico final con portada. | No hay entregable formal listo. | Crear el documento final con portada, integrantes, materia, asesor y fecha. |
| Descripción de la problemática | Cumple parcialmente | Hay descripciones introductorias en [README.md](/home/sinoe/GRIDBOT/README.md:1), [modelo-gui.md](/home/sinoe/GRIDBOT/modelo-gui.md:1), [diagrama-despliegue.md](/home/sinoe/GRIDBOT/diagrama-despliegue.md:1) y [diccionario-datos.md](/home/sinoe/GRIDBOT/diccionario-datos.md:1). | La problemática está dispersa, no consolidada como sección formal de reporte. | Redactar una sección única de problemática y objetivo del sistema. |
| Diagrama conceptual de la solución | Cumple parcialmente | Existen diagramas técnicos en [diagrama-despliegue-gridbot.puml](/home/sinoe/GRIDBOT/diagrama-despliegue-gridbot.puml:1), [diagrama-clases.puml](/home/sinoe/GRIDBOT/diagrama-clases.puml:1) y [diagrama-er-base-datos-gridrobot.puml](/home/sinoe/GRIDBOT/diagrama-er-base-datos-gridrobot.puml:1). | No encontré un “diagrama conceptual” único, simple y orientado a exposición. | Crear un diagrama conceptual resumido sistema-actores-broker-BD-frontend. |
| Modelo de datos | Cumple | El esquema funcional existe en [schema.prisma](/home/sinoe/GRIDBOT/database/prisma/schema.prisma:1), con apoyo de [diccionario-datos.md](/home/sinoe/GRIDBOT/diccionario-datos.md:1) y [diagrama-er-base-datos-gridrobot.puml](/home/sinoe/GRIDBOT/diagrama-er-base-datos-gridrobot.puml:1). | El diccionario está útil, pero contiene partes desactualizadas como referencia a grid `40x25` en algunos documentos. | Actualizar documentación para reflejar el estado real actual del sistema. |
| Arquitectura general del sistema | Cumple | Hay arquitectura observable y documentada en [diagrama-despliegue.md](/home/sinoe/GRIDBOT/diagrama-despliegue.md:1), [docker-compose.yml](/home/sinoe/GRIDBOT/docker-compose.yml:1), [docker-compose.demo.yml](/home/sinoe/GRIDBOT/docker-compose.demo.yml:1), [server.ts](/home/sinoe/GRIDBOT/backend/src/server.ts:1) y [docs/demo-network.md](/home/sinoe/GRIDBOT/docs/demo-network.md:1). | La arquitectura existe, pero parte del material explicativo mezcla estados viejos del proyecto. | Generar una versión final limpia para el reporte. |
| Interfaces gráficas de usuario | Cumple | Hay frontend funcional en [frontend/src/views/CentralDashboard.tsx](/home/sinoe/GRIDBOT/frontend/src/views/CentralDashboard.tsx:1), [frontend/src/views/OperatorDashboard.tsx](/home/sinoe/GRIDBOT/frontend/src/views/OperatorDashboard.tsx:1), [frontend/src/components/TaskPanel.tsx](/home/sinoe/GRIDBOT/frontend/src/components/TaskPanel.tsx:1), [frontend/src/components/NetworkMonitorPanel.tsx](/home/sinoe/GRIDBOT/frontend/src/components/NetworkMonitorPanel.tsx:1), además de documentación en [modelo-gui.md](/home/sinoe/GRIDBOT/modelo-gui.md:1). | Falta anexar capturas finales y ordenar el discurso visual del reporte. | Generar capturas por rol y por escenario. |
| Tópicos implementados en MQTT | Cumple parcialmente | Tópicos definidos en [constants.ts](/home/sinoe/GRIDBOT/backend/src/config/constants.ts:1) y usados en [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:1) y [obstacle-manager.ts](/home/sinoe/GRIDBOT/backend/src/modules/obstacles/obstacle-manager.ts:1). | Hay inconsistencia de prefijos entre `gridrobot/...` y `gridbot/...`; además la documentación histórica no siempre coincide. | Documentar tabla final de tópicos y unificar naming si se desea mayor claridad. |
| Capturas de pantalla de la solución funcionando en red | No cumple | No encontré un directorio o documento de evidencia con capturas de admin, operador o acceso desde otro dispositivo. | La rúbrica lo pide explícitamente. | Tomar capturas reales desde dos dispositivos y agregarlas al reporte/anexos. |
| Roles asignados al equipo | No cumple | No existe una tabla técnica de roles y responsabilidades del equipo dentro de la documentación principal del proyecto. | Falta un apartado académico requerido. | Agregar tabla de integrantes, rol, tareas y aportación. |
| Conclusiones | No cumple | No existe una sección final de conclusiones en la documentación técnica actual. | El reporte se vería incompleto frente a la rúbrica. | Redactar conclusiones y trabajo futuro. |

### Qué capturas o anexos conviene generar

- Panel central mostrando grid, robots, obstáculos y monitor MQTT.
- Vista de operador mostrando selección de tarea, robot compatible y preparación.
- Evidencia del histórico REST en terminal o Postman.
- Evidencia de la publicación MQTT y respuesta.
- Evidencia desde un segundo dispositivo conectado por LAN.

## 3. Matriz de cumplimiento de escenarios de prueba

| Escenario | Estado | Flujo encontrado | Evidencia técnica | Qué falta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| Envío de datos en tiempo real | Cumple parcialmente | Backend publica/recibe MQTT, emite a Socket.IO y actualiza front. | [server.ts](/home/sinoe/GRIDBOT/backend/src/server.ts:39), [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:1), [socket-gateway.ts](/home/sinoe/GRIDBOT/backend/src/modules/websocket/socket-gateway.ts:1), [useGridRobotState.ts](/home/sinoe/GRIDBOT/frontend/src/hooks/useGridRobotState.ts:1). | No hay emulador externo independiente en el repo; la demo depende del simulador interno del backend. | Alta |
| Persistencia de datos e histórico REST | Cumple parcialmente | Eventos seleccionados se guardan en `EventLog` y se consultan por REST. | [schema.prisma](/home/sinoe/GRIDBOT/database/prisma/schema.prisma:463), [event-log-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/events/event-log-service.ts:1), [history-controller.ts](/home/sinoe/GRIDBOT/backend/src/api/controllers/history-controller.ts:1), [routes.ts](/home/sinoe/GRIDBOT/backend/src/api/routes.ts:54). | No toda la telemetría ni todos los snapshots se persisten; no hay endpoints de métricas/reportes más amplios. | Alta |
| Interacción con actuadores vía MQTT | Cumple parcialmente | Front admin -> backend -> publish MQTT -> simulación de respuesta -> backend -> Socket.IO/front. | [NetworkMonitorPanel.tsx](/home/sinoe/GRIDBOT/frontend/src/components/NetworkMonitorPanel.tsx:1), [robot-controller.ts](/home/sinoe/GRIDBOT/backend/src/api/controllers/robot-controller.ts:1), [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:1). | El “simulador” no es un proceso separado ni un cliente MQTT explícito en el repo. | Alta |
| Funcionamiento en red | Cumple parcialmente | Hay Compose normal y demo LAN con proxy, CORS y Socket.IO. | [docker-compose.yml](/home/sinoe/GRIDBOT/docker-compose.yml:1), [docker-compose.demo.yml](/home/sinoe/GRIDBOT/docker-compose.demo.yml:1), [docs/demo-network.md](/home/sinoe/GRIDBOT/docs/demo-network.md:1), [network.ts](/home/sinoe/GRIDBOT/backend/src/config/network.ts:1). | No hay evidencia persistida en el repo de una prueba real con dos dispositivos. | Media |
| Validaciones para prevenir errores | Cumple parcialmente | Hay Zod, guards de sesión/modo, validaciones de robot/tarea/obstáculo y mensajes en español. | [task-controller.ts](/home/sinoe/GRIDBOT/backend/src/api/controllers/task-controller.ts:1), [robot-controller.ts](/home/sinoe/GRIDBOT/backend/src/api/controllers/robot-controller.ts:1), [task-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/tasks/task-service.ts:1), [system-mode-guards.ts](/home/sinoe/GRIDBOT/backend/src/modules/system/system-mode-guards.ts:1). | Falta validación explícita de “MQTT caído”, chequeo de salud de BD y manejo demostrable de reconexión. | Media |

## 4. Análisis detallado por escenario

### 4.1 Envío de datos en tiempo real

**Estado:** **Cumple parcialmente**

#### Flujo real encontrado

1. El backend crea un cliente MQTT en [server.ts](/home/sinoe/GRIDBOT/backend/src/server.ts:39).
2. `MqttBridgeService` se enlaza a ese cliente en [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:18).
3. Al conectarse, se suscribe a:
   - `gridbot/robots/+/telemetry`
   - `gridbot/robots/+/status`
   - `gridbot/tasks/events`
   - `gridrobot/world/obstacles`
   en [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:91).
4. Los mensajes recibidos se registran como `MQTT_MESSAGE_RECEIVED` en [event-log-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/events/event-log-service.ts:22) y [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:121).
5. El backend emite esos eventos al frontend por Socket.IO en [server.ts](/home/sinoe/GRIDBOT/backend/src/server.ts:224).
6. El frontend escucha:
   - `network:status`
   - `history:event`
   - `network:event`
   en [useGridRobotState.ts](/home/sinoe/GRIDBOT/frontend/src/hooks/useGridRobotState.ts:294) y siguientes.
7. El panel admin los muestra en [NetworkMonitorPanel.tsx](/home/sinoe/GRIDBOT/frontend/src/components/NetworkMonitorPanel.tsx:1).

#### Tópicos MQTT usados

- `gridrobot/world/obstacles`
- `gridrobot/world/state`
- `gridbot/tasks/events`
- `gridbot/robots/{robotId}/telemetry`
- `gridbot/robots/{robotId}/commands`
- `gridbot/robots/{robotId}/status`

Referencia: [constants.ts](/home/sinoe/GRIDBOT/backend/src/config/constants.ts:1)

#### Datos que viajan

**Telemetría robot:**
- `robotId`
- `x`
- `y`
- `status`
- `speedCellsPerSec`
- `taskId`
- `emittedAt`
- `source`

Evidencia: [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:41) y [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:208)

**Estado robot:**
- `robotId`
- `status`
- `speedCellsPerSec`
- `source`
- `respondedAt`

Evidencia: [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:196)

**Obstáculos:**
- `obstacles`
- `publishedAt`

Evidencia: [obstacle-manager.ts](/home/sinoe/GRIDBOT/backend/src/modules/obstacles/obstacle-manager.ts:251)

**Eventos de tarea por MQTT:**
- `taskId`
- `type`
- `source`
- `robotId`
- `payload`
- `topic`
- `emittedAt`

Evidencia: [server.ts](/home/sinoe/GRIDBOT/backend/src/server.ts:190) y [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:55)

#### Qué se puede demostrar en vivo

- Telemetría periódica de robots publicada por backend.
- Cambio de estado MQTT reflejado en el panel admin.
- Eventos persistidos e inmediatos en el monitor visual.
- Obstáculos y tareas actualizándose por Socket.IO.

#### Por qué no marco “Cumple”

No encontré en el repositorio un **emulador externo independiente** que recolecte variables y publique por su cuenta. Lo implementado y demostrable es un flujo híbrido donde el backend también actúa como simulador MQTT interno. Eso sirve para la demo, pero no equivale estrictamente a un emulador separado.

#### Qué falta para que sea una demo sólida

- Un cliente MQTT/emulador explícito en el repo o un script dedicado que publique telemetría externa.
- Evidencia visual o script reproducible donde se vea esa publicación independiente.

### 4.2 Persistencia de datos e histórico REST

**Estado:** **Cumple parcialmente**

#### Modelos y tablas encontradas

- `Task`
- `Robot`
- `Obstacle`
- `Route`
- `SystemLog`
- `Metric`
- `EventLog`

Evidencia: [schema.prisma](/home/sinoe/GRIDBOT/database/prisma/schema.prisma:1)

#### Modelo específico para histórico

Existe `EventLog` con:
- `id`
- `type`
- `source`
- `topic`
- `robotId`
- `taskId`
- `payload`
- `createdAt`

Evidencia: [schema.prisma](/home/sinoe/GRIDBOT/database/prisma/schema.prisma:463)

#### Endpoints REST encontrados

- `GET /api/history/events`
- `GET /api/history/robots/:robotId`
- `GET /api/history/tasks/:taskId`

Evidencia:
- [routes.ts](/home/sinoe/GRIDBOT/backend/src/api/routes.ts:54)
- [history-controller.ts](/home/sinoe/GRIDBOT/backend/src/api/controllers/history-controller.ts:1)

#### Qué datos se guardan realmente

Sí se guardan:
- `TASK_CREATED`
- `TASK_ASSIGNED`
- `TASK_STARTED`
- `TASK_COMPLETED`
- `OBSTACLE_DETECTED`
- `OBSTACLE_MOVED`
- `MQTT_MESSAGE_RECEIVED`
- `ACTUATOR_COMMAND`

Evidencia:
- [task-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/tasks/task-service.ts:59)
- [task-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/tasks/task-service.ts:224)
- [task-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/tasks/task-service.ts:308)
- [obstacle-manager.ts](/home/sinoe/GRIDBOT/backend/src/modules/obstacles/obstacle-manager.ts:116)
- [obstacle-manager.ts](/home/sinoe/GRIDBOT/backend/src/modules/obstacles/obstacle-manager.ts:240)
- [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:68)
- [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:121)

#### Qué datos no se guardan claramente

No encontré persistencia explícita para:
- todos los `world:snapshot`,
- todos los `robot:updated`,
- todas las emisiones Socket.IO,
- una serie histórica completa de telemetría por tick,
- métricas REST consultables.

#### Por qué no marco “Cumple”

Sí existe persistencia histórica funcional, pero **no es exhaustiva** respecto a todos los datos en tiempo real. Para una lectura estricta de la rúbrica, hoy se persisten **eventos seleccionados**, no una bitácora integral de telemetría.

#### Qué endpoints faltan o quedarían deseables

- `GET /api/history/metrics`
- `GET /api/history/telemetry/:robotId`
- `GET /api/history/obstacles`

No son obligatorios para una demo mínima, pero sí fortalecerían el cumplimiento total.

#### Implementación mínima recomendada para cumplir totalmente

- Persistir una muestra periódica de telemetría de robot.
- Exponer un endpoint específico de telemetría histórica.
- Exponer un endpoint de eventos por tópico MQTT.

### 4.3 Interacción con actuadores vía MQTT

**Estado:** **Cumple parcialmente**

#### Comandos existentes

- `PAUSE`
- `RESUME`
- `EMERGENCY_STOP`
- `SET_SPEED`

Evidencia:
- [robot-controller.ts](/home/sinoe/GRIDBOT/backend/src/api/controllers/robot-controller.ts:27)
- [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:7)

#### Flujo real encontrado

1. El admin selecciona robot en [NetworkMonitorPanel.tsx](/home/sinoe/GRIDBOT/frontend/src/components/NetworkMonitorPanel.tsx:1).
2. El front llama `POST /api/robots/:robotId/commands` desde [api.ts](/home/sinoe/GRIDBOT/frontend/src/lib/api.ts:216).
3. `RobotController.sendCommand()` valida sesión central y payload en [robot-controller.ts](/home/sinoe/GRIDBOT/backend/src/api/controllers/robot-controller.ts:71).
4. `MqttBridgeService.publishCommand()`:
   - valida el robot,
   - registra `ACTUATOR_COMMAND`,
   - publica en MQTT,
   - simula la respuesta
   en [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:63).
5. El propio bridge escucha `status/telemetry`, registra `MQTT_MESSAGE_RECEIVED` y reemite al front.

#### Tópicos usados

- `gridbot/robots/{robotId}/commands`
- `gridbot/robots/{robotId}/status`
- `gridbot/robots/{robotId}/telemetry`

#### Riesgos para la presentación

- No hay un cliente MQTT externo claramente identificable en el repo.
- La respuesta de actuador depende del método `simulateRobotResponse()` en [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:180).
- Si un evaluador espera ver un emulador separado o hardware real, hoy ese punto queda débil.

#### Por qué no marco “Cumple”

Sí hay flujo funcional y demostrable en vivo, pero el “actuador/emulador” está **embebido en el backend**, no como proceso o componente independiente claramente suscrito al broker. Es demostrable, pero no es la forma más fuerte de evidenciar arquitectura distribuida de actuadores.

#### Qué falta para que la demo sea clara

- Un script o servicio `emulator` separado que escuche `commands` y responda en `status/telemetry`.
- Un paso de demo donde se vea explícitamente ese suscriptor.

### 4.4 Funcionamiento en red

**Estado:** **Cumple parcialmente**

#### Archivos de configuración

- Desarrollo: [docker-compose.yml](/home/sinoe/GRIDBOT/docker-compose.yml:1)
- Demo LAN: [docker-compose.demo.yml](/home/sinoe/GRIDBOT/docker-compose.demo.yml:1)
- CORS y red: [network.ts](/home/sinoe/GRIDBOT/backend/src/config/network.ts:1), [env.ts](/home/sinoe/GRIDBOT/backend/src/config/env.ts:1)
- Documentación de demo: [docs/demo-network.md](/home/sinoe/GRIDBOT/docs/demo-network.md:1)
- Cliente Socket.IO: [frontend/src/lib/socket.ts](/home/sinoe/GRIDBOT/frontend/src/lib/socket.ts:1)

#### Qué sí está implementado

- Docker Compose con PostgreSQL y Mosquitto.
- Backend accesible por puerto en desarrollo.
- Frontend accesible por puerto en desarrollo.
- Proxy Nginx en demo LAN.
- Socket.IO por `/socket.io`.
- CORS dinámico para demo y redes privadas.

#### Comandos para levantar demo

Normal:

```bash
docker compose up -d
```

Demo LAN:

```bash
docker compose -f docker-compose.demo.yml up -d --build
```

#### Riesgos de red

- No hay en el repositorio evidencia guardada de una prueba real con dos dispositivos.
- El `health` actual solo devuelve `status: ok`; no prueba DB ni MQTT.
- El entorno demo usa `prisma db push`, lo que es útil para demo, pero no es una garantía de despliegue robusto de producción.

#### Por qué no marco “Cumple”

La configuración y el código sí existen, pero no hay **evidencia material dentro del repo** de la ejecución en LAN con clientes múltiples. Hay forma clara de probarlo, pero no la prueba ya anexada.

#### Checklist previo a presentar

- Levantar `postgres`, `mqtt`, `backend`, `frontend` o `proxy`.
- Verificar `http://IP/admin`.
- Verificar `Socket.IO` conectado.
- Verificar `MQTT` conectado en el monitor.
- Abrir desde segundo dispositivo.
- Ejecutar un comando al robot.
- Consultar histórico REST.

### 4.5 Validaciones

**Estado:** **Cumple parcialmente**

#### Validaciones existentes

**Entradas inválidas con Zod**
- login central y operador: [session-controller.ts](/home/sinoe/GRIDBOT/backend/src/api/controllers/session-controller.ts:10)
- comandos a robot: [robot-controller.ts](/home/sinoe/GRIDBOT/backend/src/api/controllers/robot-controller.ts:27)
- creación/asignación de tarea: [task-controller.ts](/home/sinoe/GRIDBOT/backend/src/api/controllers/task-controller.ts:13)
- obstáculos: [obstacle-controller.ts](/home/sinoe/GRIDBOT/backend/src/api/controllers/obstacle-controller.ts:12)
- histórico REST: [history-controller.ts](/home/sinoe/GRIDBOT/backend/src/api/controllers/history-controller.ts:10)

**Robot ocupado**
- [task-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/tasks/task-service.ts:273)

**Iniciar tarea sin robot**
- [task-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/tasks/task-service.ts:258)

**Origen/destino fuera del grid**
- [task-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/tasks/task-service.ts:817)

**Origen/destino sobre obstáculo**
- [task-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/tasks/task-service.ts:821)

**Robot desconectado para comandos**
- [robot-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/robots/robot-service.ts:333)

**Comandos no permitidos por modo de sistema**
- [system-mode-guards.ts](/home/sinoe/GRIDBOT/backend/src/modules/system/system-mode-guards.ts:55)
- [socket-gateway.ts](/home/sinoe/GRIDBOT/backend/src/modules/websocket/socket-gateway.ts:320)

**Rate limiting**
- [rate-limit-middleware.ts](/home/sinoe/GRIDBOT/backend/src/api/middlewares/rate-limit-middleware.ts:1)

**Mensajes de error en español**
- [error-middleware.ts](/home/sinoe/GRIDBOT/backend/src/api/middlewares/error-middleware.ts:1)

#### Validaciones faltantes

- Verificación explícita de “MQTT desconectado, no enviar comando”.
- Health check real de base de datos.
- Health check real de MQTT.
- Manejo de reconexión o fallback visible para persistencia si falla la base.

#### Cuáles son críticas para la demo

- Bloquear comandos si MQTT está caído.
- Mostrar fallo de base de datos antes de iniciar demo.
- Exponer un endpoint o panel de salud más real que `status: ok`.

## 5. Evidencia técnica encontrada

### Backend

- [server.ts](/home/sinoe/GRIDBOT/backend/src/server.ts:1): composición principal del sistema.
- [routes.ts](/home/sinoe/GRIDBOT/backend/src/api/routes.ts:1): REST principal, incluyendo histórico y comandos.
- [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:1): bridge MQTT, simulación interna, persistencia de eventos MQTT.
- [event-log-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/events/event-log-service.ts:1): persistencia de eventos.
- [task-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/tasks/task-service.ts:1): reglas de tareas y validaciones operativas.
- [robot-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/robots/robot-service.ts:1): estado runtime de robots y validación de comandos.
- [obstacle-manager.ts](/home/sinoe/GRIDBOT/backend/src/modules/obstacles/obstacle-manager.ts:1): obstáculos, publicación MQTT y eventos.

### Frontend

- [CentralDashboard.tsx](/home/sinoe/GRIDBOT/frontend/src/views/CentralDashboard.tsx:1): panel central.
- [OperatorDashboard.tsx](/home/sinoe/GRIDBOT/frontend/src/views/OperatorDashboard.tsx:1): vista operador.
- [TaskPanel.tsx](/home/sinoe/GRIDBOT/frontend/src/components/TaskPanel.tsx:1): flujo de tareas.
- [NetworkMonitorPanel.tsx](/home/sinoe/GRIDBOT/frontend/src/components/NetworkMonitorPanel.tsx:1): evidencia visual de red y persistencia.
- [useGridRobotState.ts](/home/sinoe/GRIDBOT/frontend/src/hooks/useGridRobotState.ts:1): suscripción a Socket.IO e integración del histórico.
- [api.ts](/home/sinoe/GRIDBOT/frontend/src/lib/api.ts:1): consumo REST incluyendo histórico y comandos.

### Base de datos

- [schema.prisma](/home/sinoe/GRIDBOT/database/prisma/schema.prisma:1): modelo de dominio y `EventLog`.
- [seed.ts](/home/sinoe/GRIDBOT/database/prisma/seed.ts:1): bootstrap de datos.

### MQTT

- [constants.ts](/home/sinoe/GRIDBOT/backend/src/config/constants.ts:1): tópicos.
- [mqtt-bridge-service.ts](/home/sinoe/GRIDBOT/backend/src/modules/mqtt/mqtt-bridge-service.ts:1): publish/subscribe y simulación.
- [obstacle-manager.ts](/home/sinoe/GRIDBOT/backend/src/modules/obstacles/obstacle-manager.ts:251): publicación de obstáculos.

### Docker/red

- [docker-compose.yml](/home/sinoe/GRIDBOT/docker-compose.yml:1)
- [docker-compose.demo.yml](/home/sinoe/GRIDBOT/docker-compose.demo.yml:1)
- [docs/demo-network.md](/home/sinoe/GRIDBOT/docs/demo-network.md:1)
- [network.ts](/home/sinoe/GRIDBOT/backend/src/config/network.ts:1)

### Documentación existente

- [README.md](/home/sinoe/GRIDBOT/README.md:1)
- [MANUAL_INSTALACION_LOCAL.md](/home/sinoe/GRIDBOT/MANUAL_INSTALACION_LOCAL.md:1)
- [modelo-gui.md](/home/sinoe/GRIDBOT/modelo-gui.md:1)
- [diccionario-datos.md](/home/sinoe/GRIDBOT/diccionario-datos.md:1)
- [diagrama-despliegue.md](/home/sinoe/GRIDBOT/diagrama-despliegue.md:1)
- [modelo-clases-emuladores.md](/home/sinoe/GRIDBOT/modelo-clases-emuladores.md:1)
- [docs/demo-rubrica.md](/home/sinoe/GRIDBOT/docs/demo-rubrica.md:1)

## 6. Brechas para alcanzar el 100%

### Prioridad alta

- Implementar o incluir un **emulador MQTT separado** y visible para la demo.
- Persistir telemetría histórica suficiente para que el “histórico REST” no dependa solo de eventos seleccionados.
- Generar capturas reales de funcionamiento en red.
- Crear el reporte técnico final con portada, roles y conclusiones.

### Prioridad media

- Unificar nomenclatura de tópicos `gridrobot` vs `gridbot`.
- Agregar health check real de PostgreSQL y MQTT.
- Bloquear o advertir claramente el envío de comandos cuando MQTT esté desconectado.
- Actualizar documentos desfasados como [modelo-gui.md](/home/sinoe/GRIDBOT/modelo-gui.md:1) y [seed.ts](/home/sinoe/GRIDBOT/database/prisma/seed.ts:1), donde aún aparecen referencias viejas como `40x25`.

### Prioridad baja

- Exponer endpoints adicionales de métricas o telemetría histórica.
- Añadir anexos automáticos o scripts de prueba para la presentación.

## 7. Plan mínimo de corrección

### Fase 1: Persistencia e histórico REST

- Persistir telemetría mínima por robot.
- Agregar endpoint por robot para telemetría histórica.
- Documentar qué eventos sí forman parte del histórico evaluable.

### Fase 2: Flujo MQTT/actuadores demostrable

- Crear un cliente/emulador MQTT separado en el repositorio.
- Suscribirlo a `gridbot/robots/{robotId}/commands`.
- Hacer que responda en `status` y `telemetry`.

### Fase 3: Monitor visual de eventos

- Mantener el monitor MQTT ya existente.
- Añadir indicador visual de “MQTT no disponible”.
- Mostrar payload resumido del último comando y última respuesta.

### Fase 4: Validaciones y estabilidad

- Health check real de DB y MQTT.
- Bloqueo explícito de comandos si el broker no está conectado.
- Guion de fallback si falla un servicio durante la demo.

### Fase 5: Evidencias para reporte y presentación

- Capturas admin/operator/LAN.
- Tabla de roles del equipo.
- Portada y conclusiones.
- Tabla final de tópicos MQTT implementados.

## 8. Checklist final para presentación

- [ ] Backend arriba.
- [ ] Front admin arriba.
- [ ] Front operador arriba.
- [ ] MQTT arriba.
- [ ] PostgreSQL arriba.
- [ ] Emulador conectado.
- [ ] Datos en tiempo real visibles.
- [ ] Comando desde front visible en emulador.
- [ ] Evento persistido en BD.
- [ ] Histórico consultable por API REST.
- [ ] Demo en red local desde dos dispositivos.
- [ ] Todos los integrantes conocen su parte.
