import { useEffect } from "react";

import type { GameDirection } from "../types";

interface GamePadProps {
  disabled?: boolean;
  onDirection: (direction: GameDirection) => void;
}

const keyboardDirectionMap: Record<string, GameDirection> = {
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  w: "UP",
  a: "LEFT",
  s: "DOWN",
  d: "RIGHT",
  W: "UP",
  A: "LEFT",
  S: "DOWN",
  D: "RIGHT"
};

export const GamePad = ({ disabled = false, onDirection }: GamePadProps) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = keyboardDirectionMap[event.key];
      if (!direction || disabled) {
        return;
      }

      event.preventDefault();
      onDirection(direction);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [disabled, onDirection]);

  const button = (direction: GameDirection, label: string) => (
    <button
      type="button"
      className="game-pad__button"
      onClick={() => onDirection(direction)}
      disabled={disabled}
    >
      {label}
    </button>
  );

  return (
    <div className="game-pad">
      <div />
      {button("UP", "↑")}
      <div />
      {button("LEFT", "←")}
      <button type="button" className="game-pad__button game-pad__button--center" disabled>
        ●
      </button>
      {button("RIGHT", "→")}
      <div />
      {button("DOWN", "↓")}
      <div />
    </div>
  );
};
