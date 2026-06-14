import type { EventLog, EventType, Prisma, PrismaClient } from "@prisma/client";

interface RecordEventInput {
  type: EventType;
  source: string;
  topic?: string | null;
  robotId?: string | null;
  taskId?: string | null;
  payload: Prisma.InputJsonValue;
}

export class EventLogService {
  private readonly listeners = new Set<(event: EventLog) => void>();

  public constructor(private readonly prisma: PrismaClient) {}

  public subscribe(listener: (event: EventLog) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async record(input: RecordEventInput): Promise<EventLog> {
    const event = await this.prisma.eventLog.create({
      data: {
        type: input.type,
        source: input.source,
        topic: input.topic ?? null,
        robotId: input.robotId ?? null,
        taskId: input.taskId ?? null,
        payload: input.payload
      }
    });

    this.listeners.forEach((listener) => listener(event));
    return event;
  }

  public async list(options: {
    type?: EventType;
    source?: string;
    from?: Date;
    to?: Date;
    robotId?: string;
    taskId?: string;
    limit: number;
    cursor?: string;
  }) {
    return this.prisma.eventLog.findMany({
      where: {
        ...(options.type ? { type: options.type } : {}),
        ...(options.source ? { source: options.source } : {}),
        ...(options.robotId ? { robotId: options.robotId } : {}),
        ...(options.taskId ? { taskId: options.taskId } : {}),
        ...((options.from || options.to)
          ? {
              createdAt: {
                ...(options.from ? { gte: options.from } : {}),
                ...(options.to ? { lte: options.to } : {})
              }
            }
          : {})
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: options.limit,
      ...(options.cursor
        ? {
            skip: 1,
            cursor: { id: options.cursor }
          }
        : {})
    });
  }
}
