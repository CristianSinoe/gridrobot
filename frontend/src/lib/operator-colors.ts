import type { OperatorNodeCode } from "../types";

interface OperatorPalette {
  solid: string;
  soft: string;
  border: string;
}

export const operatorColors: Record<OperatorNodeCode, OperatorPalette> = {
  "PC-B01": {
    solid: "#18795d",
    soft: "rgba(24, 121, 93, 0.18)",
    border: "rgba(24, 121, 93, 0.44)"
  },
  "PC-B02": {
    solid: "#c96338",
    soft: "rgba(201, 99, 56, 0.18)",
    border: "rgba(201, 99, 56, 0.44)"
  },
  "PC-B03": {
    solid: "#356ec9",
    soft: "rgba(53, 110, 201, 0.18)",
    border: "rgba(53, 110, 201, 0.44)"
  }
};

const fallbackPalette: OperatorPalette = {
  solid: "#6e7a74",
  soft: "rgba(110, 122, 116, 0.16)",
  border: "rgba(110, 122, 116, 0.38)"
};

export const getOperatorPalette = (nodeId: string | null | undefined): OperatorPalette =>
  (nodeId && nodeId in operatorColors ? operatorColors[nodeId as OperatorNodeCode] : fallbackPalette);
