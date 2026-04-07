import { useState } from "react";
import type { ReactNode } from "react";

import type { GridPosition, PreviewRoute, RobotState, Task } from "../types";
import { getOperatorPalette } from "../lib/operator-colors";
import { ObstacleLayer } from "./ObstacleLayer";
import { RouteLayer } from "./RouteLayer";

interface GridMapProps {
  width: number;
  height: number;
  robots: RobotState[];
  obstacles: GridPosition[];
  previewRoutes: PreviewRoute[];
  selectedRobotId: string | null;
  highlightedTask?: Task | null;
  mode: "central" | "operator";
  viewerNodeId?: string | null;
  onCellClick?: (position: GridPosition) => void;
  title?: string;
  subtitle?: string;
  showLegendToolbar?: boolean;
  toolbarSuffix?: ReactNode;
}

export const GridMap = ({
  width,
  height,
  robots,
  obstacles,
  previewRoutes,
  selectedRobotId,
  highlightedTask = null,
  mode,
  viewerNodeId = null,
  onCellClick,
  title = "Mundo de Cuadricula",
  subtitle,
  showLegendToolbar = true,
  toolbarSuffix
}: GridMapProps) => {
  const [density, setDensity] = useState<"compacta" | "normal">("compacta");
  const obstacleKeys = new Set(obstacles.map((obstacle) => `${obstacle.x}:${obstacle.y}`));
  const robotByCell = new Map(robots.map((robot) => [`${robot.position.x}:${robot.position.y}`, robot]));
  const originKey = highlightedTask ? `${highlightedTask.origin.x}:${highlightedTask.origin.y}` : null;
  const targetKey = highlightedTask ? `${highlightedTask.target.x}:${highlightedTask.target.y}` : null;

  const cells = Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const key = `${x}:${y}`;
    const robot = robotByCell.get(key);
    const obstacle = obstacleKeys.has(key);
    const highlighted = selectedRobotId !== null && robot?.id === selectedRobotId;
    const isOrigin = originKey === key;
    const isTarget = targetKey === key;
    const robotPalette = robot ? getOperatorPalette(robot.assignedNodeCode) : null;

    return (
      <button
        key={key}
        className={`grid-cell${obstacle ? " is-obstacle" : ""}${highlighted ? " is-selected" : ""}${robot ? " has-robot" : ""}${isOrigin ? " is-origin" : ""}${isTarget ? " is-target" : ""}`}
        type="button"
        title={`Celda ${x}, ${y}${robot ? ` | ${robot.name}` : ""}${obstacle ? " | Obstaculo detectado" : ""}${isOrigin ? " | Inicio de tarea" : ""}${isTarget ? " | Destino de tarea" : ""}`}
        onClick={() => onCellClick?.({ x, y })}
        disabled={!onCellClick}
      >
        {robot ? (
          <span
            className="grid-cell__robot"
            style={{
              background: robotPalette?.soft,
              color: robotPalette?.solid,
              boxShadow: `inset 0 0 0 1px ${robotPalette?.border ?? "rgba(0,0,0,0.1)"}`
            }}
          >
            {robot.code}
          </span>
        ) : null}
        {!robot && isOrigin ? <span className="grid-cell__task-marker grid-cell__task-marker--origin">S</span> : null}
        {!robot && isTarget ? <span className="grid-cell__task-marker grid-cell__task-marker--target">D</span> : null}
        {!robot && obstacle ? null : null}
      </button>
    );
  });

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle ?? `${width} x ${height} mapa autoritativo`}</p>
        </div>
        <div className="grid-toolbar">
          {showLegendToolbar ? (
            <>
              <span className="legend-item"><span className="legend-swatch legend-swatch--robot" />Robot</span>
              <span className="legend-item"><span className="legend-swatch legend-swatch--route" />Ruta</span>
              <span className="legend-item"><span className="legend-swatch legend-swatch--obstacle" />Obstaculo visible</span>
              <span className="legend-item"><span className="legend-swatch legend-swatch--conflict" />Cruce previo</span>
              <span className="legend-item"><span className="legend-swatch legend-swatch--origin" />Inicio</span>
              <span className="legend-item"><span className="legend-swatch legend-swatch--target" />Destino</span>
            </>
          ) : null}
          <button
            type="button"
            className="tab"
            onClick={() => setDensity((current) => (current === "compacta" ? "normal" : "compacta"))}
          >
            Vista {density}
          </button>
          {toolbarSuffix}
        </div>
      </div>
      <div className="grid-map-shell">
        <div
          className={`grid-map grid-map--${density}`}
          style={{
            gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`
          }}
        >
          {cells}
          <RouteLayer
            robots={robots}
            previewRoutes={previewRoutes}
            width={width}
            height={height}
            selectedRobotId={selectedRobotId}
            mode={mode}
            viewerNodeId={viewerNodeId}
          />
          <ObstacleLayer obstacles={obstacles} width={width} height={height} />
        </div>
      </div>
      <p className="grid-helper">
        {mode === "central"
          ? "Las coordenadas se muestran al pasar el cursor. Haga clic para agregar o retirar obstaculos visibles. S marca el inicio y D el destino."
          : "Las coordenadas se muestran al pasar el cursor. Solo aparecen los obstaculos detectados por el robot. S marca el inicio y D el destino."}
      </p>
    </section>
  );
};
