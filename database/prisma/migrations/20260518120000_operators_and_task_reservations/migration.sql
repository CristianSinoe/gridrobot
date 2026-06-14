DO $$
BEGIN
  ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED_PENDING_START';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "operators" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "assignedNodeId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "operators_username_key" ON "operators"("username");
CREATE INDEX IF NOT EXISTS "operators_assignedNodeId_idx" ON "operators"("assignedNodeId");
CREATE INDEX IF NOT EXISTS "operators_isActive_username_idx" ON "operators"("isActive", "username");

ALTER TABLE "operators"
  ADD CONSTRAINT "operators_assignedNodeId_fkey"
  FOREIGN KEY ("assignedNodeId") REFERENCES "nodes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "task_assignments"
  ADD COLUMN IF NOT EXISTS "assignedOperatorId" TEXT;

CREATE INDEX IF NOT EXISTS "task_assignments_assignedOperatorId_idx" ON "task_assignments"("assignedOperatorId");

ALTER TABLE "task_assignments"
  ADD CONSTRAINT "task_assignments_assignedOperatorId_fkey"
  FOREIGN KEY ("assignedOperatorId") REFERENCES "operators"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
