import type { GameService } from "./game-service.js";

export class GameLoop {
  private timer: NodeJS.Timeout | null = null;
  private isRunningTick = false;

  public constructor(
    private readonly tickRateHz: number,
    private readonly gameService: GameService
  ) {}

  public start(): void {
    if (this.timer) {
      return;
    }

    const intervalMs = Math.floor(1000 / this.tickRateHz);
    this.timer = setInterval(() => {
      void this.runTick();
    }, intervalMs);
  }

  public stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  private async runTick(): Promise<void> {
    if (this.isRunningTick) {
      return;
    }

    this.isRunningTick = true;
    try {
      this.gameService.runTick();
    } finally {
      this.isRunningTick = false;
    }
  }
}
