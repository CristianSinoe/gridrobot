import type { RobotState } from "../types";
import { formatCapacity, formatPosition, robotStatusText, supportText } from "../lib/ui-text";
import { getOperatorPalette } from "../lib/operator-colors";

interface RobotCardProps {
  robot: RobotState;
  selected: boolean;
  onSelect: (robotId: string) => void;
  className?: string;
}

export const RobotCard = ({ robot, selected, onSelect, className = "" }: RobotCardProps) => {
  const palette = getOperatorPalette(robot.assignedNodeCode);

  return (
    <button
      type="button"
      className={`robot-card${selected ? " is-selected" : ""}${className ? ` ${className}` : ""}`}
      aria-pressed={selected}
      aria-label={`Seleccionar robot ${robot.name}`}
      onClick={() => onSelect(robot.id)}
      style={{
        borderColor: selected ? palette.border : undefined,
        boxShadow: selected ? `inset 0 0 0 1px ${palette.border}` : undefined
      }}
    >
      <div className="robot-card__topbar">
        <span className="robot-card__icon">{robot.status === "MOVING" ? "↗" : robot.status === "WAITING" ? "◌" : "▣"}</span>
        <span className={`status-badge status-badge--${robot.status.toLowerCase()}`}>
          {robotStatusText[robot.status]}
        </span>
      </div>
      <div className="robot-card__title">
        <div>
          <p className="eyebrow">Unidad robótica</p>
          <h3 className="truncate-text">{robot.name}</h3>
        </div>
      </div>
      <div className="robot-card__meta">
        <span className="data-pill">ID {robot.code}</span>
        <span className="data-pill">{robot.assignedNodeCode ?? "Sin nodo"}</span>
        <span className="data-pill">Ruta {robot.path.length}</span>
      </div>
      <div className="detail-grid">
        <p>
          <span>Disponibilidad</span>
          <strong className="break-text">{robot.catalogStatus}</strong>
        </p>
        <p>
          <span>Posición</span>
          <strong>{formatPosition(robot.position.x, robot.position.y)}</strong>
        </p>
        <p>
          <span>Objetivo</span>
          <strong>{robot.targetPosition ? formatPosition(robot.targetPosition.x, robot.targetPosition.y) : "Sin destino"}</strong>
        </p>
        <p>
          <span>Capacidad</span>
          <strong>{formatCapacity(robot.capacityValue, robot.capacityUnit)}</strong>
        </p>
      </div>
      <div className="robot-card__footer">
        <p className="robot-card__supports">Soporta: {robot.supports.map((support) => supportText[support]).join(", ")}</p>
      </div>
    </button>
  );
};
