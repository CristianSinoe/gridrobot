import type { GameLeaderboardItem } from "../types";

interface GameLeaderboardProps {
  items: GameLeaderboardItem[];
  title?: string;
}

export const GameLeaderboard = ({ items, title = "Leaderboard" }: GameLeaderboardProps) => {
  return (
    <section className="game-panel">
      <p className="eyebrow">{title}</p>
      <div className="game-leaderboard">
        {items.length === 0 ? <p className="empty-state">Todavía no hay jugadores conectados.</p> : null}
        {items.map((item, index) => (
          <article key={item.playerId} className="game-leaderboard__row">
            <span className="game-leaderboard__rank">#{index + 1}</span>
            <span className="game-leaderboard__name">
              <span className="game-leaderboard__swatch" style={{ background: item.color }} />
              {item.name}
            </span>
            <span>{item.score} pts</span>
            <span>{item.lives} vidas</span>
            <span>{item.statusLabel}</span>
          </article>
        ))}
      </div>
    </section>
  );
};
