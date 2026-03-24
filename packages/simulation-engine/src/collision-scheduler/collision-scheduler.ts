import { GridEngine } from "../grid-engine/grid-engine.js";
import type { RobotMoveIntent } from "../types.js";

export interface CollisionDecision {
  allowed: RobotMoveIntent[];
  waiting: Array<{ robotId: string; reason: string }>;
}

export class CollisionScheduler {
  public constructor(private readonly gridEngine: GridEngine) {}

  public resolve(intents: RobotMoveIntent[]): CollisionDecision {
    const occupiedTargets = new Map<string, RobotMoveIntent[]>();

    for (const intent of intents) {
      const key = this.gridEngine.key(intent.to);
      const bucket = occupiedTargets.get(key);
      if (bucket) {
        bucket.push(intent);
      } else {
        occupiedTargets.set(key, [intent]);
      }
    }

    const allowed: RobotMoveIntent[] = [];
    const waiting = new Map<string, string>();

    for (const intent of intents) {
      const sameCellMoves = occupiedTargets.get(this.gridEngine.key(intent.to)) ?? [];

      if (sameCellMoves.length > 1) {
        const winner = [...sameCellMoves].sort((a, b) => a.robotId.localeCompare(b.robotId))[0];
        if (winner.robotId !== intent.robotId) {
          waiting.set(intent.robotId, `Cell ${intent.to.x},${intent.to.y} reserved by ${winner.robotId}.`);
          continue;
        }
      }

      const swapConflict = intents.find(
        (other) =>
          other.robotId !== intent.robotId &&
          this.gridEngine.equals(other.from, intent.to) &&
          this.gridEngine.equals(other.to, intent.from)
      );

      if (swapConflict) {
        const winner = [intent, swapConflict].sort((a, b) => a.robotId.localeCompare(b.robotId))[0];
        if (winner.robotId !== intent.robotId) {
          waiting.set(intent.robotId, `Edge swap conflict with ${winner.robotId}.`);
          continue;
        }
      }

      allowed.push(intent);
    }

    return {
      allowed,
      waiting: Array.from(waiting.entries()).map(([robotId, reason]) => ({ robotId, reason }))
    };
  }
}
