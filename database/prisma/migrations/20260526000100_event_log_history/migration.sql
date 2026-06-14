CREATE TYPE "EventType" AS ENUM (
  'ROBOT_STATE',
  'TASK_CREATED',
  'TASK_ASSIGNED',
  'TASK_STARTED',
  'TASK_COMPLETED',
  'OBSTACLE_DETECTED',
  'OBSTACLE_MOVED',
  'MQTT_MESSAGE_RECEIVED',
  'ACTUATOR_COMMAND'
);

CREATE TABLE "event_logs" (
    "id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "source" TEXT NOT NULL,
    "topic" TEXT,
    "robotId" TEXT,
    "taskId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_logs_type_createdAt_idx" ON "event_logs"("type", "createdAt");
CREATE INDEX "event_logs_source_createdAt_idx" ON "event_logs"("source", "createdAt");
CREATE INDEX "event_logs_topic_createdAt_idx" ON "event_logs"("topic", "createdAt");
CREATE INDEX "event_logs_robotId_createdAt_idx" ON "event_logs"("robotId", "createdAt");
CREATE INDEX "event_logs_taskId_createdAt_idx" ON "event_logs"("taskId", "createdAt");

ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_robotId_fkey"
FOREIGN KEY ("robotId") REFERENCES "robots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
