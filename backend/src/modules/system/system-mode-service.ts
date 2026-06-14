import type { SystemMode } from "../../shared/types.js";

type ModeChangeListener = (nextMode: SystemMode, previousMode: SystemMode) => Promise<void> | void;

export class SystemModeService {
  private mode: SystemMode = "WAREHOUSE";
  private readonly listeners = new Set<ModeChangeListener>();

  public getMode(): SystemMode {
    return this.mode;
  }

  public isWarehouseMode(): boolean {
    return this.mode === "WAREHOUSE";
  }

  public isGameMode(): boolean {
    return this.mode === "GAME";
  }

  public async setMode(nextMode: SystemMode): Promise<SystemMode> {
    if (nextMode === this.mode) {
      return this.mode;
    }

    const previousMode = this.mode;
    this.mode = nextMode;

    for (const listener of this.listeners) {
      await listener(nextMode, previousMode);
    }

    return this.mode;
  }

  public onChange(listener: ModeChangeListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}
