import type { GridDimensions, GridPosition } from "../types.js";

export class GridEngine {
  public constructor(private readonly dimensions: GridDimensions) {}

  public getDimensions(): GridDimensions {
    return { ...this.dimensions };
  }

  public isWithinBounds(position: GridPosition): boolean {
    return (
      position.x >= 0 &&
      position.y >= 0 &&
      position.x < this.dimensions.width &&
      position.y < this.dimensions.height
    );
  }

  public equals(a: GridPosition, b: GridPosition): boolean {
    return a.x === b.x && a.y === b.y;
  }

  public key(position: GridPosition): string {
    return `${position.x}:${position.y}`;
  }

  public neighbors(position: GridPosition): GridPosition[] {
    const candidates: GridPosition[] = [
      { x: position.x + 1, y: position.y },
      { x: position.x - 1, y: position.y },
      { x: position.x, y: position.y + 1 },
      { x: position.x, y: position.y - 1 }
    ];

    return candidates.filter((candidate) => this.isWithinBounds(candidate));
  }

  public distance(a: GridPosition, b: GridPosition): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
}
