import { useState } from "react";

interface GameJoinFormProps {
  disabled?: boolean;
  errorMessage?: string | null;
  onJoin: (name: string) => Promise<void>;
}

export const GameJoinForm = ({ disabled = false, errorMessage = null, onJoin }: GameJoinFormProps) => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <section className="game-panel">
      <p className="eyebrow">Ingreso de jugador</p>
      <h1>GRIDBOT CHASE</h1>
      <p className="game-panel__subtitle">Ingresa un nombre corto y únete a la partida desde tu celular.</p>
      <form
        className="game-join-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSubmitting(true);
          try {
            await onJoin(name);
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <label className="field-label" htmlFor="game-player-name">
          Nombre
        </label>
        <input
          id="game-player-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={18}
          placeholder="Ej. Ana"
          disabled={disabled || isSubmitting}
        />
        <button type="submit" className="header-button game-join-form__button" disabled={disabled || isSubmitting}>
          Entrar al juego
        </button>
      </form>
      {errorMessage ? <p className="game-error">{errorMessage}</p> : null}
    </section>
  );
};
