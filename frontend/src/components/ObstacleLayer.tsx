import type { GridPosition } from "../types";

interface ObstacleLayerProps {
  obstacles: GridPosition[];
  width: number;
  height: number;
}

export const ObstacleLayer = ({ obstacles, width, height }: ObstacleLayerProps) => {
  return (
    <div className="grid-overlay">
      {obstacles.map((obstacle) => (
        <span
          key={`${obstacle.x}:${obstacle.y}`}
          className="overlay-obstacle"
          style={{
            left: `${(obstacle.x / width) * 100}%`,
            top: `${(obstacle.y / height) * 100}%`,
            width: `${100 / width}%`,
            height: `${100 / height}%`
          }}
        >
          <span className="overlay-obstacle__dot" />
        </span>
      ))}
    </div>
  );
};
