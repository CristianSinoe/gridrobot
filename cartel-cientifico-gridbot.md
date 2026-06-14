# 1. TÍTULO DEL PROYECTO
- `GRIDBOT`

---

## 2. PROBLEMA
- Simular y supervisar una flota de robots sobre una cuadrícula de `40 x 25`.
- Administrar tareas con origen, destino, prioridad, tipo de carga y compatibilidad por robot.
- Coordinar acceso concurrente entre un `Panel Central` y nodos operadores `PC-B01`, `PC-B02`, `PC-B03`.
- Detectar y reflejar obstáculos que afectan rutas activas y rutas previas.
- Mantener continuidad operativa cuando una tarea queda interrumpida y requiere reasignación.

---

## 3. HIPÓTESIS
- El sistema permite reservar una sesión central única y una sesión por nodo operador.
- El sistema permite asignar un robot compatible a una tarea antes de iniciar el viaje.
- El sistema puede calcular una ruta desde la posición del robot al origen y luego al destino.
- El sistema puede recalcular rutas o marcar robots como `BLOCKED` si aparece un obstáculo.
- El sistema puede marcar una tarea como `WAITING_ASSISTANCE` y al robot como `OFFLINE` si se activa la lógica de fallos aleatorios.

---

## 4. DATOS / FUNCIONAMIENTO DEL SISTEMA
- Arquitectura: cliente-servidor con `frontend React + Vite`, `backend Express + Socket.IO`, `PostgreSQL` con `Prisma` y `MQTT`.
- Componentes principales: interfaz web, API REST, gateway WebSocket, planificador por ticks, servicios de robots/tareas/obstáculos, base de datos y paquete `packages/simulation-engine`.
- Flujo real: selección de acceso -> login central o selección de nodo operador -> conexión WebSocket -> recepción de `world:bootstrap` -> selección de tarea/robot -> asignación -> previsualización -> inicio -> avance por ticks.
- Entidades del sistema: `Node`, `Robot`, `Task`, `TaskAssignment`, `GridMap`, `GridCell`, `Obstacle`, `Route`, `RouteStep`, `SystemLog`, `Metric`, además de vistas runtime como `RobotState`, `TaskView` y `PreviewRouteView`.
- Rutas: se calculan con A* Manhattan en `backend/src/modules/pathfinding/pathfinding-service.ts`; el robot guarda `targetPosition`, `path` y la ruta se persiste en `Route` y `RouteStep`.
- Obstáculos, intersecciones y fallos: los obstáculos activos bloquean celdas, pueden moverse si son dinámicos; las intersecciones se detectan en `PreviewRouteService` como `conflictCells/conflictRobotIds/conflictNodeIds`; los fallos aleatorios dependen de variables de entorno y cambian tarea a `WAITING_ASSISTANCE` y robot a `OFFLINE`.

---

## 5. EXPERIMENTO / IMPLEMENTACIÓN
- Funciona actualmente: login central con contraseña, login operador por nodo fijo, refresco de mundo por WebSocket, tick scheduler, movimiento de robots, generación automática de tareas y obstáculos, asignación/inicio/cancelación de tareas.
- Endpoints existentes: `GET /api/health`, `GET /api/sessions`, `POST /api/sessions/central/login`, `POST /api/sessions/operator/login`, `POST /api/sessions/logout`, `POST /api/sessions/release`, `GET /api/robots`, `GET/POST /api/tasks`, `POST /api/tasks/:taskId/assign`, `POST /api/tasks/:taskId/start`, `POST /api/tasks/:taskId/cancel`, `GET/POST/DELETE /api/obstacles`.
- Vistas existentes: pantalla de selección de acceso, panel de acceso central, panel de acceso operador, `CentralDashboard`, `OperatorDashboard`.
- Interacción del usuario: seleccionar rol, autenticarse, elegir sección lateral, inspeccionar robots, seleccionar tarea, asignar robot compatible, iniciar viaje, cancelar preparación, refrescar sesiones y cerrar sesión.
- Lógica activa: sesiones exclusivas por rol/nodo, ranking de robots compatibles, una preparación activa por operador, previsualización de ruta por operador, detección de conflictos entre rutas previas, cambio de etapa `TO_ORIGIN -> TO_TARGET`, descubrimiento de obstáculos por campo de visión.
- Eventos WebSocket activos: `world:bootstrap`, `world:snapshot`, `tasks:list`, `task:updated`, `robot:updated`, `obstacle:list`, `preview:list`, `gateway:error`, `viewer:focusRobot`, `task:assign`, `task:claim`, `obstacle:upsert`, `obstacle:remove`, `world:refresh`.

---

## 6. RESULTADOS OBSERVABLES
- El sistema muestra un mapa de cuadrícula con robots, obstáculos visibles, origen, destino y rutas previas.
- La interfaz muestra estados de robot (`IDLE`, `MOVING`, `WAITING`, `BLOCKED`, `OFFLINE`) y estados de tarea (`PENDING`, `ASSIGNED`, `REASSIGNED`, `IN_PROGRESS`, `WAITING_ASSISTANCE`, `COMPLETED`).
- En pantalla se observan listas de tareas activas, robots compatibles, prioridad, requisitos de carga y operador asociado.
- El contador `tick` avanza y actualiza posiciones, rutas, obstáculos descubiertos y tareas.
- Cuando se agrega o elimina un obstáculo, el backend recalcula rutas y actualiza la vista en tiempo real.
- Si una tarea falla en ejecución por fallo aleatorio habilitado, la UI recibe actualización de robot fuera de servicio y tarea esperando asistencia.

---

## 7. CONCLUSIÓN
- El proyecto implementa una simulación operativa de robots en cuadrícula con control central y operadores secundarios.
- El backend ya coordina sesiones, tareas, rutas, obstáculos, visibilidad parcial del entorno y actualización en tiempo real.
- El frontend ya permite supervisión global y operación manual de preparación e inicio de viajes.
- La persistencia actual cubre robots, tareas, rutas, obstáculos, nodos, logs y métricas en PostgreSQL.
- El comportamiento observable principal es la asignación de tareas compatibles, el cálculo de rutas y la actualización dinámica del estado del mundo.

---

## LIMITACIONES DETECTADAS
- `packages/simulation-engine` existe, pero no está integrado al flujo ejecutable principal del backend actual.
- No se encontraron pruebas automatizadas en el repositorio.
- `POST /api/tasks` existe, pero el controlador no valida sesión activa antes de crear tareas.
- La UI no expone creación manual de tareas, aunque el endpoint REST sí existe.
- La detección de intersecciones se aplica a rutas previas; la resolución activa de colisiones entre robots en ejecución no está conectada al backend actual.
- El comportamiento de fallos de robots depende de variables de entorno; si `ROBOT_FAILURES_ENABLED` no está en `true`, esa lógica no se ejecuta.
