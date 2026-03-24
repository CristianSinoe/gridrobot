# Diccionario de Datos de GRIDROBOT

## Introducción
El presente diccionario de datos describe las estructuras persistentes y de estado relevantes del sistema GRIDROBOT, tomando como base la implementación actual del repositorio. El núcleo persistente se encuentra modelado en Prisma sobre PostgreSQL, mientras que parte del estado operativo en tiempo real se mantiene en memoria dentro del backend y se replica a la interfaz mediante Socket.IO.

## Supuestos de modelado
- La persistencia principal del sistema corresponde al esquema definido en `database/prisma/schema.prisma`.
- Las estructuras `WorldSnapshot`, `PreviewRouteView` y `RobotState` representan vistas operativas en memoria y de intercambio, no tablas físicas.
- La entidad `Product` existe en la base de datos, aunque en la implementación actual su uso funcional es secundario frente al flujo principal de robots, tareas, obstáculos y rutas.
- Las estructuras relativas a sesión activa se mantienen en memoria en `SessionAccessService`; no existe una tabla dedicada de sesiones persistidas.

## Resumen de estructuras

| Estructura | Tipo | Propósito principal |
| --- | --- | --- |
| `Node` | Tabla persistente | Representa nodos de despliegue y operación, centrales o secundarios |
| `Robot` | Tabla persistente | Catálogo y estado actual de robots |
| `Product` | Tabla persistente | Productos o cargas asociables a tareas |
| `Task` | Tabla persistente | Misiones logísticas sobre el grid |
| `TaskAssignment` | Tabla persistente | Historial y trazabilidad de asignaciones tarea-robot |
| `GridMap` | Tabla persistente | Definición del mapa activo |
| `GridCell` | Tabla persistente | Celdas individuales del mapa |
| `Obstacle` | Tabla persistente | Obstáculos detectados, manuales o simulados |
| `Route` | Tabla persistente | Ruta planificada o ejecutada por un robot |
| `RouteStep` | Tabla persistente | Secuencia de pasos de una ruta |
| `SystemLog` | Tabla persistente | Registro técnico de eventos |
| `Metric` | Tabla persistente | Métricas de operación |
| `RobotState` | Estructura en memoria / API | Estado operativo de robot expuesto al frontend |
| `TaskView` | Estructura en memoria / API | Vista enriquecida de tarea con recomendaciones |
| `PreviewRouteView` | Estructura en memoria / API | Ruta previa calculada antes de iniciar un viaje |
| `WorldSnapshot` | Estructura en memoria / Socket | Fotografía del mundo simulador por tick |
| `ActiveSession` | Estructura en memoria | Sesión central u operativa bloqueada por nodo |

## Enumeraciones y dominios controlados

| Dominio | Valores observados |
| --- | --- |
| `NodeRole` | `CENTRAL_SERVER`, `OPERATOR_CLIENT` |
| `NodeStatus` | `ONLINE`, `OFFLINE`, `DEGRADED`, `MAINTENANCE` |
| `RobotStatus` | `IDLE`, `MOVING`, `WAITING`, `BLOCKED`, `OFFLINE` |
| `CapacityUnit` | `units`, `kg` |
| `RobotSupportCapability` | `UNIT_LOAD`, `BULK_LOAD`, `NON_FRAGILE`, `FRAGILE`, `REFRIGERATED` |
| `TaskStatus` | `PENDING`, `ASSIGNED`, `REASSIGNED`, `IN_PROGRESS`, `WAITING_ASSISTANCE`, `COMPLETED`, `FAILED`, `CANCELLED` |
| `TaskPriority` | `LOW`, `NORMAL`, `HIGH`, `CRITICAL` |
| `TaskDomainType` | `MOVE_BOXES`, `MOVE_BOTTLES`, `MOVE_SAND`, `MOVE_GRAVEL`, `MOVE_LIQUID_BULK`, `MOVE_COLD_PRODUCTS`, `MOVE_FRAGILE_PRODUCTS` |
| `TaskExecutionStage` | `TO_ORIGIN`, `TO_TARGET` |
| `ProductStatus` | `AVAILABLE`, `RESERVED`, `IN_TRANSIT`, `DELIVERED`, `DAMAGED` |
| `ObstacleType` | `STATIC`, `DYNAMIC`, `TEMPORARY` |
| `ObstacleSource` | `MANUAL`, `SENSOR`, `SIMULATION`, `SYSTEM` |
| `RouteStatus` | `PLANNED`, `ACTIVE`, `BLOCKED`, `COMPLETED`, `CANCELLED` |
| `LogLevel` | `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL` |
| `MetricType` | `COUNTER`, `GAUGE`, `HISTOGRAM`, `TIMER` |

## Entidades persistentes

### 1. `nodes`
Descripción: catálogo de nodos físicos o lógicos del sistema. Se utiliza para representar el nodo central (`PC-A01`) y los nodos operadores (`PC-B01`, `PC-B02`, `PC-B03`).

| Campo | Tipo | Longitud / formato | Obligatorio | Restricciones | Relaciones | Observaciones técnicas |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `String` | UUID | Sí | PK | 1:N con `Robot`, `Task`, `TaskAssignment`, `SystemLog`, `Metric` | Generado automáticamente |
| `code` | `String` | texto corto | Sí | Único | Identificador funcional del nodo | Ejemplos observados: `PC-A01`, `PC-B01` |
| `name` | `String` | texto | Sí | Sin unicidad | - | Nombre descriptivo |
| `role` | `NodeRole` | enum | Sí | Dominio controlado | - | Central u operador |
| `status` | `NodeStatus` | enum | Sí | Default `ONLINE` | - | Estado operativo |
| `host` | `String?` | texto | No | Nulo permitido | - | No explotado activamente en la lógica actual |
| `ipAddress` | `String?` | IPv4/IPv6 textual | No | Nulo permitido | - | Potencialmente útil para trazabilidad |
| `port` | `Int?` | entero | No | Nulo permitido | - | Puerto del nodo si se modela explícitamente |
| `lastHeartbeatAt` | `DateTime?` | ISO timestamp | No | Indexado | - | Preparado para monitoreo |
| `createdAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Auditoría |
| `updatedAt` | `DateTime` | timestamp | Sí | `@updatedAt` | - | Auditoría |

### 2. `robots`
Descripción: representa cada robot del sistema, tanto desde el punto de vista catalogal como desde su estado operacional persistido.

| Campo | Tipo | Longitud / formato | Obligatorio | Restricciones | Relaciones | Observaciones técnicas |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `String` | UUID | Sí | PK | 1:N con `Task`, `TaskAssignment`, `Route`, `SystemLog`, `Metric` | Identificador interno |
| `code` | `String` | texto corto | Sí | Único | - | Código visible, por ejemplo `R03` |
| `name` | `String?` | texto | No | Nulo permitido | - | Nombre comercial del robot |
| `status` | `RobotStatus` | enum | Sí | Default `IDLE` | - | Estado de movimiento o servicio |
| `catalogStatus` | `String` | texto | Sí | Default `"inactivo"` | - | Estado catalogal observable: `activo`, `mantenimiento`, `averiado`, etc. |
| `isActive` | `Boolean` | booleano | Sí | Default `false` | - | Disponibilidad lógica |
| `nodeId` | `String?` | UUID | No | FK nullable | N:1 con `Node` | Nodo al que se asigna operativamente |
| `currentMapId` | `String?` | UUID | No | FK nullable | N:1 con `GridMap` | Mapa actual |
| `x` | `Int` | entero | Sí | Coordenada válida dentro del grid | - | Posición actual |
| `y` | `Int` | entero | Sí | Coordenada válida dentro del grid | - | Posición actual |
| `heading` | `String?` | texto | No | Nulo permitido | - | No se explota en el simulador actual |
| `physicalWeightKg` | `Float?` | decimal | No | Nulo permitido | - | Peso físico del robot |
| `speedCellsPerSec` | `Float?` | decimal | No | Nulo permitido | - | Utilizado para ranking operativo, no para cinemática por tick |
| `capacityValue` | `Int?` | entero | No | Nulo permitido | - | Capacidad nominal |
| `capacityUnit` | `CapacityUnit?` | enum | No | Nulo permitido | - | `units` o `kg` |
| `supports` | `RobotSupportCapability[]` | arreglo enum | Sí | Colección multivalor | - | Compatibilidades de carga |
| `batteryLevel` | `Decimal?` | `Decimal(5,2)` | No | Nulo permitido | - | Preparado para telemetría |
| `targetX` | `Int?` | entero | No | Nulo permitido | - | Objetivo actual persistido |
| `targetY` | `Int?` | entero | No | Nulo permitido | - | Objetivo actual persistido |
| `lastSeenAt` | `DateTime?` | timestamp | No | Indexado | - | Preparado para presencia |
| `createdAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Auditoría |
| `updatedAt` | `DateTime` | timestamp | Sí | `@updatedAt` | - | Auditoría |

### 3. `products`
Descripción: catálogo de productos o unidades logísticas asociables a tareas.

| Campo | Tipo | Longitud / formato | Obligatorio | Restricciones | Relaciones | Observaciones técnicas |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `String` | UUID | Sí | PK | 1:N con `Task` | Identificador interno |
| `sku` | `String` | texto | Sí | Único | - | Código de producto |
| `name` | `String` | texto | Sí | - | - | Denominación |
| `description` | `String?` | texto | No | Nulo permitido | - | Descripción ampliada |
| `status` | `ProductStatus` | enum | Sí | Default `AVAILABLE` | - | Estado logístico del producto |
| `quantity` | `Int` | entero | Sí | Default `1` | - | Cantidad disponible |
| `createdAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Auditoría |
| `updatedAt` | `DateTime` | timestamp | Sí | `@updatedAt` | - | Auditoría |

### 4. `tasks`
Descripción: unidad principal de trabajo del sistema. Una tarea define origen, destino, requisitos de carga, prioridad, robot asignado y etapa de ejecución.

| Campo | Tipo | Longitud / formato | Obligatorio | Restricciones | Relaciones | Observaciones técnicas |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `String` | UUID | Sí | PK | 1:N con `TaskAssignment`, `Route`, `SystemLog` | Identificador interno |
| `code` | `String?` | texto | No | Único si existe | - | En creación manual se generan códigos `MANUAL-*`; en automático `TASK-*` |
| `name` | `String` | texto | Sí | - | - | Nombre visible |
| `description` | `String?` | texto | No | Nulo permitido | - | Descripción funcional |
| `type` | `TaskDomainType` | enum | Sí | Default `MOVE_BOXES` | - | Tipo de misión |
| `status` | `TaskStatus` | enum | Sí | Default `PENDING` | - | Estado de ciclo de vida |
| `priority` | `TaskPriority` | enum | Sí | Default `NORMAL` | - | Prioridad operacional |
| `executionStage` | `TaskExecutionStage` | enum | Sí | Default `TO_ORIGIN` | - | Fase de viaje |
| `originX` | `Int` | entero | Sí | Default `0` | - | Coordenada de origen |
| `originY` | `Int` | entero | Sí | Default `0` | - | Coordenada de origen |
| `targetX` | `Int` | entero | Sí | - | - | Coordenada de destino |
| `targetY` | `Int` | entero | Sí | - | - | Coordenada de destino |
| `loadTypeRequired` | `RobotSupportCapability` | enum | Sí | Default `UNIT_LOAD` | - | La UI reduce a `UNIT_LOAD` o `BULK_LOAD` |
| `requiresRefrigeration` | `Boolean` | booleano | Sí | Default `false` | - | Requisito adicional |
| `requiresFragileHandling` | `Boolean` | booleano | Sí | Default `false` | - | Requisito adicional |
| `requiredAmount` | `Int` | entero | Sí | Default `1` | - | Magnitud de carga requerida |
| `amountUnit` | `CapacityUnit` | enum | Sí | Default `units` | - | Unidad del requerimiento |
| `robotId` | `String?` | UUID | No | FK nullable | N:1 con `Robot` | Robot actualmente asignado |
| `requestedMapId` | `String?` | UUID | No | FK nullable | N:1 con `GridMap` | Mapa solicitado para la tarea |
| `productId` | `String?` | UUID | No | FK nullable | N:1 con `Product` | Producto asociado |
| `createdByNodeId` | `String?` | UUID | No | FK nullable | N:1 con `Node` | Nodo creador |
| `dueAt` | `DateTime?` | timestamp | No | Indexado | - | Fecha objetivo |
| `startedAt` | `DateTime?` | timestamp | No | Nulo permitido | - | Inicio efectivo |
| `completedAt` | `DateTime?` | timestamp | No | Nulo permitido | - | Finalización efectiva |
| `createdAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Auditoría |
| `updatedAt` | `DateTime` | timestamp | Sí | `@updatedAt` | - | Auditoría |

Observaciones técnicas:
- Una tarea `ASSIGNED` o `REASSIGNED` puede tener una previsualización de ruta en memoria.
- Una tarea `IN_PROGRESS` puede pasar a `WAITING_ASSISTANCE` cuando el robot falla.
- El origen puede actualizarse durante una interrupción para reflejar el punto real de asistencia.

### 5. `task_assignments`
Descripción: tabla puente e histórica que registra qué robot fue asignado a qué tarea y por qué nodo operador.

| Campo | Tipo | Longitud / formato | Obligatorio | Restricciones | Relaciones | Observaciones técnicas |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `String` | UUID | Sí | PK | - | Identificador interno |
| `taskId` | `String` | UUID | Sí | FK | N:1 con `Task` | Cascade on delete |
| `robotId` | `String` | UUID | Sí | FK | N:1 con `Robot` | Cascade on delete |
| `assignedByNodeId` | `String?` | UUID | No | FK nullable | N:1 con `Node` | Nodo operador que reservó la tarea |
| `acceptedAt` | `DateTime?` | timestamp | No | Nulo permitido | - | Momento de aceptación / reserva |
| `startedAt` | `DateTime?` | timestamp | No | Nulo permitido | - | Inicio del viaje |
| `completedAt` | `DateTime?` | timestamp | No | Nulo permitido | - | Cierre del ciclo de asignación |
| `createdAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Auditoría |
| `updatedAt` | `DateTime` | timestamp | Sí | `@updatedAt` | - | Auditoría |

Restricciones destacadas:
- Unicidad compuesta `taskId + robotId`.
- Sirve para materializar la reserva por operador y el historial de ejecución.

### 6. `grid_maps`
Descripción: definición general del mapa sobre el que opera la simulación.

| Campo | Tipo | Longitud / formato | Obligatorio | Restricciones | Relaciones | Observaciones técnicas |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `String` | UUID | Sí | PK | 1:N con `GridCell`, `Obstacle`, `Route`, `Robot`, `Task` | Identificador interno |
| `code` | `String` | texto | Sí | Único | - | En bootstrap: `GRIDROBOT-DEFAULT` |
| `name` | `String` | texto | Sí | - | - | Nombre del mapa |
| `version` | `Int` | entero | Sí | Default `1` | - | Versionado |
| `width` | `Int` | entero | Sí | >0 | - | Implementación actual: `40` |
| `height` | `Int` | entero | Sí | >0 | - | Implementación actual: `25` |
| `isActive` | `Boolean` | booleano | Sí | Default `false` | - | Mapa en uso |
| `metadata` | `Json?` | JSON | No | Nulo permitido | - | Extensión de configuración |
| `createdAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Auditoría |
| `updatedAt` | `DateTime` | timestamp | Sí | `@updatedAt` | - | Auditoría |

### 7. `grid_cells`
Descripción: celdas unitarias del mapa, usadas como soporte topológico del grid.

| Campo | Tipo | Longitud / formato | Obligatorio | Restricciones | Relaciones | Observaciones técnicas |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `String` | UUID | Sí | PK | 1:N con `RouteStep`, `Obstacle` | Identificador interno |
| `mapId` | `String` | UUID | Sí | FK | N:1 con `GridMap` | Cascade on delete |
| `x` | `Int` | entero | Sí | Unicidad compuesta con `mapId,y` | - | Coordenada |
| `y` | `Int` | entero | Sí | Unicidad compuesta con `mapId,x` | - | Coordenada |
| `cellType` | `String` | texto | Sí | - | - | En bootstrap: `FLOOR` |
| `isBlocked` | `Boolean` | booleano | Sí | Default `false` | - | Bloqueo estructural |
| `traversalCost` | `Int` | entero | Sí | Default `1` | - | Preparado para rutas ponderadas |
| `metadata` | `Json?` | JSON | No | Nulo permitido | - | Extensión de terreno |
| `createdAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Auditoría |
| `updatedAt` | `DateTime` | timestamp | Sí | `@updatedAt` | - | Auditoría |

### 8. `obstacles`
Descripción: obstáculos del mundo, tanto persistentes como dinámicos, que afectan el pathfinding y la visibilidad.

| Campo | Tipo | Longitud / formato | Obligatorio | Restricciones | Relaciones | Observaciones técnicas |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `String` | UUID | Sí | PK | - | Identificador interno |
| `mapId` | `String?` | UUID | No | FK nullable | N:1 con `GridMap` | Puede quedar nulo |
| `cellId` | `String?` | UUID | No | FK nullable | N:1 con `GridCell` | Asociación puntual opcional |
| `type` | `ObstacleType` | enum | Sí | Default `DYNAMIC` | - | Estático, dinámico o temporal |
| `source` | `ObstacleSource` | enum | Sí | Default `SIMULATION` | - | Manual, sensor, simulación o sistema |
| `x` | `Int` | entero | Sí | Único con `y` | - | Coordenada |
| `y` | `Int` | entero | Sí | Único con `x` | - | Coordenada |
| `width` | `Int` | entero | Sí | Default `1` | - | Dimensión reservada |
| `height` | `Int` | entero | Sí | Default `1` | - | Dimensión reservada |
| `isActive` | `Boolean` | booleano | Sí | Default `true` | - | Activación lógica |
| `detectedAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Fecha de detección |
| `clearedAt` | `DateTime?` | timestamp | No | Nulo permitido | - | Fecha de retiro |
| `metadata` | `Json?` | JSON | No | Nulo permitido | - | Carga adicional |
| `createdAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Auditoría |
| `updatedAt` | `DateTime` | timestamp | Sí | `@updatedAt` | - | Auditoría |

Observaciones técnicas:
- La implementación activa usa unicidad global por coordenada (`x`,`y`), no por mapa.
- Los operadores no siempre visualizan todos los obstáculos; la persistencia y la visibilidad son conceptos diferentes.

### 9. `routes`
Descripción: trazas persistidas de rutas calculadas para un robot, normalmente asociadas a una tarea.

| Campo | Tipo | Longitud / formato | Obligatorio | Restricciones | Relaciones | Observaciones técnicas |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `String` | UUID | Sí | PK | 1:N con `RouteStep` | Identificador interno |
| `robotId` | `String` | UUID | Sí | FK | N:1 con `Robot` | Cascade on delete |
| `taskId` | `String?` | UUID | No | FK nullable | N:1 con `Task` | Puede existir ruta sin tarea explícita |
| `mapId` | `String?` | UUID | No | FK nullable | N:1 con `GridMap` | Mapa asociado |
| `status` | `RouteStatus` | enum | Sí | Default `PLANNED` | - | Estado de la ruta |
| `version` | `Int` | entero | Sí | Default `1` | - | Cada recalculo incrementa versión |
| `startX` | `Int` | entero | Sí | - | - | Inicio |
| `startY` | `Int` | entero | Sí | - | - | Inicio |
| `goalX` | `Int` | entero | Sí | - | - | Destino |
| `goalY` | `Int` | entero | Sí | - | - | Destino |
| `estimatedCost` | `Int?` | entero | No | Nulo permitido | - | Longitud/coste estimado |
| `startedAt` | `DateTime?` | timestamp | No | Nulo permitido | - | Inicio de uso |
| `completedAt` | `DateTime?` | timestamp | No | Nulo permitido | - | Finalización |
| `invalidatedAt` | `DateTime?` | timestamp | No | Nulo permitido | - | Invalidación |
| `invalidationReason` | `String?` | texto | No | Nulo permitido | - | Razón técnica del recalculo o invalidez |
| `createdAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Auditoría |
| `updatedAt` | `DateTime` | timestamp | Sí | `@updatedAt` | - | Auditoría |

### 10. `route_steps`
Descripción: secuencia ordenada de celdas de una ruta persistida.

| Campo | Tipo | Longitud / formato | Obligatorio | Restricciones | Relaciones | Observaciones técnicas |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `String` | UUID | Sí | PK | - | Identificador interno |
| `routeId` | `String` | UUID | Sí | FK | N:1 con `Route` | Cascade on delete |
| `cellId` | `String?` | UUID | No | FK nullable | N:1 con `GridCell` | Asociación opcional |
| `stepIndex` | `Int` | entero | Sí | Único por `routeId` | - | Orden de recorrido |
| `x` | `Int` | entero | Sí | Indexado | - | Coordenada |
| `y` | `Int` | entero | Sí | Indexado | - | Coordenada |
| `scheduledTick` | `Int?` | entero | No | Nulo permitido | - | Reservado para sincronización temporal |
| `createdAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Auditoría |
| `updatedAt` | `DateTime` | timestamp | Sí | `@updatedAt` | - | Auditoría |

### 11. `system_logs`
Descripción: registro técnico y operativo del backend.

| Campo | Tipo | Longitud / formato | Obligatorio | Restricciones | Relaciones | Observaciones técnicas |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `String` | UUID | Sí | PK | - | Identificador interno |
| `level` | `LogLevel` | enum | Sí | Default `INFO` | - | Severidad |
| `source` | `String` | texto | Sí | Indexado | - | Origen del mensaje, por ejemplo `simulacion` |
| `message` | `String` | texto | Sí | - | - | Mensaje legible |
| `details` | `Json?` | JSON | No | Nulo permitido | - | Contexto adicional |
| `nodeId` | `String?` | UUID | No | FK nullable | N:1 con `Node` | Asociación opcional |
| `robotId` | `String?` | UUID | No | FK nullable | N:1 con `Robot` | Asociación opcional |
| `taskId` | `String?` | UUID | No | FK nullable | N:1 con `Task` | Asociación opcional |
| `createdAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Auditoría |
| `updatedAt` | `DateTime` | timestamp | Sí | `@updatedAt` | - | Auditoría |

### 12. `metrics`
Descripción: métricas históricas del sistema por nodo o robot.

| Campo | Tipo | Longitud / formato | Obligatorio | Restricciones | Relaciones | Observaciones técnicas |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `String` | UUID | Sí | PK | - | Identificador interno |
| `name` | `String` | texto | Sí | Indexado con `recordedAt` | - | Nombre de la métrica |
| `type` | `MetricType` | enum | Sí | Indexado con `recordedAt` | - | Tipo de medición |
| `value` | `Decimal` | `Decimal(18,4)` | Sí | - | - | Valor cuantitativo |
| `unit` | `String?` | texto | No | Nulo permitido | - | Unidad física o lógica |
| `nodeId` | `String?` | UUID | No | FK nullable | N:1 con `Node` | Métrica del nodo |
| `robotId` | `String?` | UUID | No | FK nullable | N:1 con `Robot` | Métrica del robot |
| `recordedAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Momento de medición |
| `createdAt` | `DateTime` | timestamp | Sí | Default `now()` | - | Auditoría |
| `updatedAt` | `DateTime` | timestamp | Sí | `@updatedAt` | - | Auditoría |

## Estructuras de estado y vistas operativas

### `RobotState`
Descripción: proyección del estado actual del robot usada por WebSocket y frontend.

| Campo | Tipo | Observaciones técnicas |
| --- | --- | --- |
| `id`, `code`, `name` | texto | Identificación del robot |
| `position` | `{x:number,y:number}` | Posición actual en grid |
| `targetPosition` | posición nullable | Objetivo inmediato |
| `path` | lista de posiciones | Ruta actual en memoria |
| `status` | `RobotStatus` | Estado actual |
| `taskId` | UUID nullable | Tarea activa |
| `catalogStatus`, `isActive` | texto/booleano | Disponibilidad operativa |
| `physicalWeightKg`, `speedCellsPerSec`, `capacityValue`, `capacityUnit`, `supports` | atributos de capacidad | Copiados desde persistencia |
| `assignedNodeCode` | texto nullable | Código del nodo operador asociado |
| `updatedAt` | ISO string | Marca temporal serializada |

### `TaskView`
Descripción: vista enriquecida de la tarea servida a la interfaz.

| Campo adicional destacado | Observaciones técnicas |
| --- | --- |
| `origin`, `target` | Posiciones derivadas de `originX/originY` y `targetX/targetY` |
| `recommendedRobots` | Ranking calculado por compatibilidad, disponibilidad y distancia |
| `executionStage` | Mantiene la fase de viaje visible al operador |

### `PreviewRouteView`
Descripción: estructura en memoria que representa la ruta previa reservada para un operador antes de iniciar el viaje.

| Campo | Tipo | Observaciones técnicas |
| --- | --- | --- |
| `taskId` | UUID | Identifica la tarea preparada |
| `robotId` | UUID | Robot elegido |
| `nodeId` | texto nullable | Nodo operador que preparó la ruta |
| `origin`, `target` | posición | Origen y destino de la misión |
| `path` | lista de posiciones | Unión de ruta hacia origen y hacia destino |
| `status` | `READY` / `INVALID` | Indica si el mundo actual admite la ruta previa |
| `message` | texto nullable | Motivo de invalidez |
| `updatedAt` | ISO string | Marca temporal |

### `WorldSnapshot`
Descripción: fotografía periódica del mundo emitida por tick a clientes conectados.

| Campo | Tipo | Observaciones técnicas |
| --- | --- | --- |
| `tick` | entero | Número de ciclo |
| `width`, `height` | entero | Dimensiones del grid |
| `robots` | lista `RobotState` | Estado de la flota |
| `obstacles` | lista posiciones | Obstáculos visibles según rol |
| `tasks` | lista `TaskView` | Tareas visibles |
| `previewRoutes` | lista `PreviewRouteView` | Rutas previas visibles |

### `ActiveSession`
Descripción: sesión de acceso mantenida en memoria por el backend.

| Campo | Tipo | Observaciones técnicas |
| --- | --- | --- |
| `token` | UUID string | Token de sesión para REST y Socket.IO |
| `role` | `central` / `operator` | Rol de acceso |
| `nodeId` | `PC-B01` / `PC-B02` / `PC-B03` / `null` | Nodo asociado |
| `socketId` | texto nullable | Socket ligado a la sesión |
| `connectedAt` | ISO string | Última conexión |
| `clientIp` | texto nullable | IP del cliente |
| `reservedAt` | entero | Marca temporal para expiración de reserva |

## Relaciones principales

| Relación | Cardinalidad | Interpretación |
| --- | --- | --- |
| `Node` -> `Robot` | 1:N | Un nodo puede administrar varios robots; en el runtime hay asignaciones fijas relevantes |
| `Node` -> `Task` | 1:N | Un nodo puede crear tareas |
| `Node` -> `TaskAssignment` | 1:N | Un nodo operador puede reservar múltiples asignaciones históricas |
| `Robot` -> `Task` | 1:N | Un robot puede asociarse a múltiples tareas a lo largo del tiempo |
| `Task` -> `TaskAssignment` | 1:N | Una tarea puede tener múltiples intentos o reasignaciones |
| `GridMap` -> `GridCell` | 1:N | Un mapa se compone de celdas |
| `GridMap` -> `Obstacle` | 1:N | Un mapa contiene obstáculos |
| `Robot` -> `Route` | 1:N | Un robot puede generar múltiples rutas versionadas |
| `Route` -> `RouteStep` | 1:N | Una ruta tiene pasos ordenados |
| `Task` -> `Route` | 1:N | Una tarea puede inducir varias rutas por recalculado |
| `Robot` / `Task` / `Node` -> `SystemLog` | 1:N | Los eventos pueden asociarse a distintas entidades |

## Observaciones técnicas finales
- El modelo persistente y el modelo operativo no son idénticos: la lógica en tiempo real mantiene estructuras derivadas en memoria para acelerar la simulación y la interacción.
- La visibilidad de obstáculos está filtrada por robot y por rol, aunque la tabla `obstacles` guarda el estado global.
- La gestión de sesiones es intencionalmente efímera y bloqueante por nodo; su persistencia en base de datos no forma parte de la versión actual.
- El mapa activo se bootstrappea con dimensiones fijas de 40x25, lo que condiciona validaciones, pathfinding y representación gráfica.
