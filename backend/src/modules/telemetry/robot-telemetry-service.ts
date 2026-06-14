import type { PrismaClient, RobotStatus, RobotTelemetry } from "@prisma/client";

export interface RecordRobotTelemetryInput {
  robotId: string;
  x: number;
  y: number;
  status: RobotStatus;
  speedCellsPerSec?: number | null;
  taskId?: string | null;
  source: string;
  recordedAt?: Date;
}

export interface RobotTelemetryFilters {
  robotId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

interface TelemetrySnapshot {
  recordedAt: number;
  x: number;
  y: number;
  status: RobotStatus;
  speedCellsPerSec: number | null;
  taskId: string | null;
}

const MAX_SAMPLES_PER_QUERY = 100;
const DEFAULT_SAMPLES_PER_QUERY = 25;
const MIN_RECORD_INTERVAL_MS = 1_000;

export class RobotTelemetryService {
  private readonly latestSnapshots = new Map<string, TelemetrySnapshot>();

  public constructor(private readonly prisma: PrismaClient) {}

  public async record(input: RecordRobotTelemetryInput): Promise<RobotTelemetry | null> {
    const recordedAt = input.recordedAt ?? new Date();
    const nextSnapshot: TelemetrySnapshot = {
      recordedAt: recordedAt.getTime(),
      x: input.x,
      y: input.y,
      status: input.status,
      speedCellsPerSec: input.speedCellsPerSec ?? null,
      taskId: input.taskId ?? null
    };

    const previousSnapshot = this.latestSnapshots.get(input.robotId);
    if (previousSnapshot && !this.shouldPersistSnapshot(previousSnapshot, nextSnapshot)) {
      return null;
    }

    const telemetry = await this.prisma.robotTelemetry.create({
      data: {
        robotId: input.robotId,
        x: input.x,
        y: input.y,
        status: input.status,
        speedCellsPerSec: input.speedCellsPerSec ?? null,
        taskId: input.taskId ?? null,
        source: input.source,
        recordedAt
      }
    });

    this.latestSnapshots.set(input.robotId, nextSnapshot);
    return telemetry;
  }

  public async list(filters: RobotTelemetryFilters = {}): Promise<RobotTelemetry[]> {
    const limit = Math.min(filters.limit ?? DEFAULT_SAMPLES_PER_QUERY, MAX_SAMPLES_PER_QUERY);

    return this.prisma.robotTelemetry.findMany({
      where: {
        ...(filters.robotId ? { robotId: filters.robotId } : {}),
        ...(filters.from || filters.to
          ? {
              recordedAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {})
              }
            }
          : {})
      },
      orderBy: { recordedAt: "desc" },
      take: limit
    });
  }

  private shouldPersistSnapshot(previous: TelemetrySnapshot, next: TelemetrySnapshot): boolean {
    const hasRelevantChange =
      previous.x !== next.x ||
      previous.y !== next.y ||
      previous.status !== next.status ||
      previous.speedCellsPerSec !== next.speedCellsPerSec ||
      previous.taskId !== next.taskId;

    if (hasRelevantChange) {
      return true;
    }

    return next.recordedAt - previous.recordedAt >= MIN_RECORD_INTERVAL_MS;
  }
}
