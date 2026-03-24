-- CreateEnum
CREATE TYPE "NodeRole" AS ENUM ('CENTRAL_SERVER', 'OPERATOR_CLIENT');

-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DEGRADED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "RobotStatus" AS ENUM ('IDLE', 'MOVING', 'WAITING', 'BLOCKED', 'OFFLINE');

-- CreateEnum
CREATE TYPE "CapacityUnit" AS ENUM ('units', 'kg');

-- CreateEnum
CREATE TYPE "RobotSupportCapability" AS ENUM ('UNIT_LOAD', 'BULK_LOAD', 'NON_FRAGILE', 'FRAGILE', 'REFRIGERATED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskDomainType" AS ENUM ('MOVE_BOXES', 'MOVE_BOTTLES', 'MOVE_SAND', 'MOVE_GRAVEL', 'MOVE_LIQUID_BULK', 'MOVE_COLD_PRODUCTS', 'MOVE_FRAGILE_PRODUCTS');

-- CreateEnum
CREATE TYPE "TaskExecutionStage" AS ENUM ('TO_ORIGIN', 'TO_TARGET');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'IN_TRANSIT', 'DELIVERED', 'DAMAGED');

-- CreateEnum
CREATE TYPE "ObstacleType" AS ENUM ('STATIC', 'DYNAMIC', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "ObstacleSource" AS ENUM ('MANUAL', 'SENSOR', 'SIMULATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PLANNED', 'ACTIVE', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('COUNTER', 'GAUGE', 'HISTOGRAM', 'TIMER');

-- CreateTable
CREATE TABLE "nodes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "NodeRole" NOT NULL,
    "status" "NodeStatus" NOT NULL DEFAULT 'ONLINE',
    "host" TEXT,
    "ipAddress" TEXT,
    "port" INTEGER,
    "lastHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "robots" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "status" "RobotStatus" NOT NULL DEFAULT 'IDLE',
    "catalogStatus" TEXT NOT NULL DEFAULT 'inactivo',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "nodeId" TEXT,
    "currentMapId" TEXT,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "heading" TEXT,
    "physicalWeightKg" DOUBLE PRECISION,
    "speedCellsPerSec" DOUBLE PRECISION,
    "capacityValue" INTEGER,
    "capacityUnit" "CapacityUnit",
    "supports" "RobotSupportCapability"[],
    "batteryLevel" DECIMAL(5,2),
    "targetX" INTEGER,
    "targetY" INTEGER,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "robots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'AVAILABLE',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskDomainType" NOT NULL DEFAULT 'MOVE_BOXES',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "executionStage" "TaskExecutionStage" NOT NULL DEFAULT 'TO_ORIGIN',
    "originX" INTEGER NOT NULL DEFAULT 0,
    "originY" INTEGER NOT NULL DEFAULT 0,
    "targetX" INTEGER NOT NULL,
    "targetY" INTEGER NOT NULL,
    "loadTypeRequired" "RobotSupportCapability" NOT NULL DEFAULT 'UNIT_LOAD',
    "requiresRefrigeration" BOOLEAN NOT NULL DEFAULT false,
    "requiresFragileHandling" BOOLEAN NOT NULL DEFAULT false,
    "requiredAmount" INTEGER NOT NULL DEFAULT 1,
    "amountUnit" "CapacityUnit" NOT NULL DEFAULT 'units',
    "robotId" TEXT,
    "requestedMapId" TEXT,
    "productId" TEXT,
    "createdByNodeId" TEXT,
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "assignedByNodeId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grid_maps" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grid_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grid_cells" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "cellType" TEXT NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "traversalCost" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grid_cells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obstacles" (
    "id" TEXT NOT NULL,
    "mapId" TEXT,
    "cellId" TEXT,
    "type" "ObstacleType" NOT NULL DEFAULT 'DYNAMIC',
    "source" "ObstacleSource" NOT NULL DEFAULT 'SIMULATION',
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1,
    "height" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obstacles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "taskId" TEXT,
    "mapId" TEXT,
    "status" "RouteStatus" NOT NULL DEFAULT 'PLANNED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "startX" INTEGER NOT NULL,
    "startY" INTEGER NOT NULL,
    "goalX" INTEGER NOT NULL,
    "goalY" INTEGER NOT NULL,
    "estimatedCost" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "invalidationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_steps" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "cellId" TEXT,
    "stepIndex" INTEGER NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "scheduledTick" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "nodeId" TEXT,
    "robotId" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MetricType" NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "unit" TEXT,
    "nodeId" TEXT,
    "robotId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nodes_code_key" ON "nodes"("code");

-- CreateIndex
CREATE INDEX "nodes_role_status_idx" ON "nodes"("role", "status");

-- CreateIndex
CREATE INDEX "nodes_lastHeartbeatAt_idx" ON "nodes"("lastHeartbeatAt");

-- CreateIndex
CREATE UNIQUE INDEX "robots_code_key" ON "robots"("code");

-- CreateIndex
CREATE INDEX "robots_nodeId_idx" ON "robots"("nodeId");

-- CreateIndex
CREATE INDEX "robots_currentMapId_idx" ON "robots"("currentMapId");

-- CreateIndex
CREATE INDEX "robots_status_lastSeenAt_idx" ON "robots"("status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "robots_isActive_catalogStatus_idx" ON "robots"("isActive", "catalogStatus");

-- CreateIndex
CREATE INDEX "robots_currentMapId_x_y_idx" ON "robots"("currentMapId", "x", "y");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_code_key" ON "tasks"("code");

-- CreateIndex
CREATE INDEX "tasks_status_priority_idx" ON "tasks"("status", "priority");

-- CreateIndex
CREATE INDEX "tasks_robotId_status_idx" ON "tasks"("robotId", "status");

-- CreateIndex
CREATE INDEX "tasks_type_status_idx" ON "tasks"("type", "status");

-- CreateIndex
CREATE INDEX "tasks_requestedMapId_targetX_targetY_idx" ON "tasks"("requestedMapId", "targetX", "targetY");

-- CreateIndex
CREATE INDEX "tasks_productId_idx" ON "tasks"("productId");

-- CreateIndex
CREATE INDEX "tasks_createdByNodeId_idx" ON "tasks"("createdByNodeId");

-- CreateIndex
CREATE INDEX "tasks_dueAt_idx" ON "tasks"("dueAt");

-- CreateIndex
CREATE INDEX "task_assignments_taskId_createdAt_idx" ON "task_assignments"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "task_assignments_robotId_createdAt_idx" ON "task_assignments"("robotId", "createdAt");

-- CreateIndex
CREATE INDEX "task_assignments_assignedByNodeId_idx" ON "task_assignments"("assignedByNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_taskId_robotId_key" ON "task_assignments"("taskId", "robotId");

-- CreateIndex
CREATE UNIQUE INDEX "grid_maps_code_key" ON "grid_maps"("code");

-- CreateIndex
CREATE INDEX "grid_maps_isActive_idx" ON "grid_maps"("isActive");

-- CreateIndex
CREATE INDEX "grid_maps_name_version_idx" ON "grid_maps"("name", "version");

-- CreateIndex
CREATE INDEX "grid_cells_mapId_isBlocked_idx" ON "grid_cells"("mapId", "isBlocked");

-- CreateIndex
CREATE INDEX "grid_cells_mapId_cellType_idx" ON "grid_cells"("mapId", "cellType");

-- CreateIndex
CREATE UNIQUE INDEX "grid_cells_mapId_x_y_key" ON "grid_cells"("mapId", "x", "y");

-- CreateIndex
CREATE INDEX "obstacles_mapId_isActive_idx" ON "obstacles"("mapId", "isActive");

-- CreateIndex
CREATE INDEX "obstacles_mapId_x_y_idx" ON "obstacles"("mapId", "x", "y");

-- CreateIndex
CREATE INDEX "obstacles_cellId_idx" ON "obstacles"("cellId");

-- CreateIndex
CREATE INDEX "obstacles_type_source_idx" ON "obstacles"("type", "source");

-- CreateIndex
CREATE UNIQUE INDEX "obstacles_x_y_key" ON "obstacles"("x", "y");

-- CreateIndex
CREATE INDEX "routes_robotId_status_idx" ON "routes"("robotId", "status");

-- CreateIndex
CREATE INDEX "routes_taskId_idx" ON "routes"("taskId");

-- CreateIndex
CREATE INDEX "routes_mapId_status_idx" ON "routes"("mapId", "status");

-- CreateIndex
CREATE INDEX "routes_robotId_version_idx" ON "routes"("robotId", "version");

-- CreateIndex
CREATE INDEX "route_steps_routeId_scheduledTick_idx" ON "route_steps"("routeId", "scheduledTick");

-- CreateIndex
CREATE INDEX "route_steps_cellId_idx" ON "route_steps"("cellId");

-- CreateIndex
CREATE INDEX "route_steps_x_y_idx" ON "route_steps"("x", "y");

-- CreateIndex
CREATE UNIQUE INDEX "route_steps_routeId_stepIndex_key" ON "route_steps"("routeId", "stepIndex");

-- CreateIndex
CREATE INDEX "system_logs_level_createdAt_idx" ON "system_logs"("level", "createdAt");

-- CreateIndex
CREATE INDEX "system_logs_source_createdAt_idx" ON "system_logs"("source", "createdAt");

-- CreateIndex
CREATE INDEX "system_logs_nodeId_idx" ON "system_logs"("nodeId");

-- CreateIndex
CREATE INDEX "system_logs_robotId_idx" ON "system_logs"("robotId");

-- CreateIndex
CREATE INDEX "system_logs_taskId_idx" ON "system_logs"("taskId");

-- CreateIndex
CREATE INDEX "metrics_name_recordedAt_idx" ON "metrics"("name", "recordedAt");

-- CreateIndex
CREATE INDEX "metrics_type_recordedAt_idx" ON "metrics"("type", "recordedAt");

-- CreateIndex
CREATE INDEX "metrics_nodeId_recordedAt_idx" ON "metrics"("nodeId", "recordedAt");

-- CreateIndex
CREATE INDEX "metrics_robotId_recordedAt_idx" ON "metrics"("robotId", "recordedAt");

-- AddForeignKey
ALTER TABLE "robots" ADD CONSTRAINT "robots_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "robots" ADD CONSTRAINT "robots_currentMapId_fkey" FOREIGN KEY ("currentMapId") REFERENCES "grid_maps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "robots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_requestedMapId_fkey" FOREIGN KEY ("requestedMapId") REFERENCES "grid_maps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdByNodeId_fkey" FOREIGN KEY ("createdByNodeId") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "robots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_assignedByNodeId_fkey" FOREIGN KEY ("assignedByNodeId") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grid_cells" ADD CONSTRAINT "grid_cells_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "grid_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obstacles" ADD CONSTRAINT "obstacles_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "grid_maps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obstacles" ADD CONSTRAINT "obstacles_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "grid_cells"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "robots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "grid_maps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_steps" ADD CONSTRAINT "route_steps_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_steps" ADD CONSTRAINT "route_steps_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "grid_cells"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "robots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "robots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
