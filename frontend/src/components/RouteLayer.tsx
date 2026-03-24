import type { PreviewRoute, RobotState } from "../types";
import { getOperatorPalette } from "../lib/operator-colors";

interface RouteLayerProps {
  robots: RobotState[];
  previewRoutes: PreviewRoute[];
  width: number;
  height: number;
  selectedRobotId: string | null;
}

export const RouteLayer = ({ robots, previewRoutes, width, height, selectedRobotId }: RouteLayerProps) => {
  return (
    <div className="grid-overlay">
      {previewRoutes.flatMap((preview) =>
        preview.path.map((node, index) => (
          <span
            key={`preview:${preview.taskId}:${node.x}:${node.y}:${index}`}
            className={`overlay-route overlay-route--preview${preview.status === "INVALID" ? " overlay-route--invalid" : ""}`}
            style={{
              background: getOperatorPalette(preview.nodeId).soft,
              borderColor: getOperatorPalette(preview.nodeId).solid,
              left: `${(node.x / width) * 100}%`,
              top: `${(node.y / height) * 100}%`,
              width: `${100 / width}%`,
              height: `${100 / height}%`
            }}
            title={
              preview.status === "INVALID"
                ? preview.message ?? "Ruta previa no disponible"
                : "Ruta previa antes de iniciar viaje"
            }
          />
        ))
      )}
      {previewRoutes.map((preview) => (
        <span
          key={`preview-origin:${preview.taskId}`}
          className="overlay-preview-marker overlay-preview-marker--origin"
          style={{
            left: `${(preview.origin.x / width) * 100}%`,
            top: `${(preview.origin.y / height) * 100}%`,
            width: `${100 / width}%`,
            height: `${100 / height}%`,
            borderColor: getOperatorPalette(preview.nodeId).solid
          }}
          title="Punto de inicio de la ruta previa"
        >
          S
        </span>
      ))}
      {previewRoutes.map((preview) => (
        <span
          key={`preview-target:${preview.taskId}`}
          className="overlay-preview-marker overlay-preview-marker--target"
          style={{
            left: `${(preview.target.x / width) * 100}%`,
            top: `${(preview.target.y / height) * 100}%`,
            width: `${100 / width}%`,
            height: `${100 / height}%`,
            borderColor: getOperatorPalette(preview.nodeId).solid
          }}
          title="Punto de destino de la ruta previa"
        >
          D
        </span>
      ))}
      {robots.flatMap((robot) =>
        robot.path.slice(1).map((node, index) => (
          <span
            key={`${robot.id}:${node.x}:${node.y}:${index}`}
            className="overlay-route"
            style={{
              background: getOperatorPalette(robot.assignedNodeCode).soft,
              borderColor: getOperatorPalette(robot.assignedNodeCode).border,
              opacity: selectedRobotId && robot.id !== selectedRobotId ? 0.42 : 1,
              left: `${(node.x / width) * 100}%`,
              top: `${(node.y / height) * 100}%`,
              width: `${100 / width}%`,
              height: `${100 / height}%`
            }}
            title={`Ruta de ${robot.name}`}
          />
        ))
      )}
    </div>
  );
};
