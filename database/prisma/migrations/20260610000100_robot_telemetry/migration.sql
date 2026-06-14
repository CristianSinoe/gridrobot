-- CreateTable
CREATE TABLE "public"."robot_telemetry" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "status" "public"."RobotStatus" NOT NULL,
    "speedCellsPerSec" DOUBLE PRECISION,
    "taskId" TEXT,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "robot_telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "robot_telemetry_robotId_recordedAt_idx" ON "public"."robot_telemetry"("robotId", "recordedAt");

-- CreateIndex
CREATE INDEX "robot_telemetry_taskId_recordedAt_idx" ON "public"."robot_telemetry"("taskId", "recordedAt");

-- CreateIndex
CREATE INDEX "robot_telemetry_status_recordedAt_idx" ON "public"."robot_telemetry"("status", "recordedAt");

-- CreateIndex
CREATE INDEX "robot_telemetry_source_recordedAt_idx" ON "public"."robot_telemetry"("source", "recordedAt");

-- AddForeignKey
ALTER TABLE "public"."robot_telemetry" ADD CONSTRAINT "robot_telemetry_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "public"."robots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."robot_telemetry" ADD CONSTRAINT "robot_telemetry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
