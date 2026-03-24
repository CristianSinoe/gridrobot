import type { GridPosition } from "../../shared/types.js";

export interface GridDimensions {
  width: number;
  height: number;
}

export class GridManager {
  private readonly width: number;
  private readonly height: number;

  public constructor({ width, height }: GridDimensions) {
    this.width = width;
    this.height = height;
  }

  public getDimensions(): GridDimensions {
    return { width: this.width, height: this.height };
  }

  public isWithinBounds(position: GridPosition): boolean {
    return (
      position.x >= 0 &&
      position.y >= 0 &&
      position.x < this.width &&
      position.y < this.height
    );
  }

  public key(position: GridPosition): string {
    return `${position.x}:${position.y}`;
  }

  public equals(a: GridPosition, b: GridPosition): boolean {
    return a.x === b.x && a.y === b.y;
  }

  public getNeighbors(position: GridPosition): GridPosition[] {
    const candidates: GridPosition[] = [
      { x: position.x + 1, y: position.y },
      { x: position.x - 1, y: position.y },
      { x: position.x, y: position.y + 1 },
      { x: position.x, y: position.y - 1 }
    ];

    return candidates.filter((candidate) => this.isWithinBounds(candidate));
  }
}
