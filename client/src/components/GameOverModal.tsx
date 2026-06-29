import type { PublicPlayer, RoundSummary } from "../shared";

interface Props {
  phase: "roundOver" | "sessionOver";
  summary: RoundSummary | null;
  players: PublicPlayer[];
  winnerId: string | null;
  isHost: boolean;
  onContinue: () => void;
}

export function GameOverModal({ phase, summary, players, winnerId, isHost, onContinue }: Props) {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "?";
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>{phase === "sessionOver" ? "🏆 Гру завершено!" : "Раунд завершено"}</h2>

        {summary && (
          <div className="round-summary">
            {summary.bridgeCalledBy && (
              <p>
                🌉 БРИДЖ оголосив <strong>{nameOf(summary.bridgeCalledBy)}</strong>! Множник x{summary.multiplier}
              </p>
            )}
            {summary.jackBonus && (
              <p>
                🃏 {nameOf(summary.jackBonus.playerId)} обрав:{" "}
                {summary.jackBonus.mode === "all" ? `усім +${summary.jackBonus.amount}` : `собі -${summary.jackBonus.amount}`}
              </p>
            )}
            <ul className="points-list">
              {Object.entries(summary.pointsAdded).map(([id, pts]) => (
                <li key={id}>
                  {nameOf(id)}: {pts >= 0 ? "+" : ""}
                  {pts} очок
                </li>
              ))}
            </ul>
            {summary.eliminated.length > 0 && (
              <p className="score-warn">Вилетіли: {summary.eliminated.map(nameOf).join(", ")}</p>
            )}
            {summary.reset295.length > 0 && <p>Обнулено (295): {summary.reset295.map(nameOf).join(", ")}</p>}
          </div>
        )}

        {phase === "sessionOver" && winnerId && (
          <p className="winner-line">Переможець сесії: 🏆 {nameOf(winnerId)}</p>
        )}

        {isHost ? (
          <button className="btn btn-primary" onClick={onContinue}>
            {phase === "sessionOver" ? "Нова гра" : "Наступний раунд"}
          </button>
        ) : (
          <p className="status-warn">
            {phase === "sessionOver" ? "Очікуємо, поки хост почне нову гру..." : "Очікуємо, поки хост почне наступний раунд..."}
          </p>
        )}
      </div>
    </div>
  );
}
