import type { PublicPlayer } from "../shared";

interface Props {
  players: PublicPlayer[];
  myId: string;
  open: boolean;
  onClose: () => void;
}

export function ScoreBoard({ players, myId, open, onClose }: Props) {
  if (!open) return null;
  const sorted = [...players].sort((a, b) => a.score - b.score);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>Рахунок</h2>
        <table className="score-table">
          <thead>
            <tr>
              <th>Гравець</th>
              <th>Очки</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} className={p.id === myId ? "score-row-me" : ""}>
                <td>
                  {p.name} {p.eliminated && "❌"}
                </td>
                <td className={p.score > 250 ? "score-warn" : ""}>{p.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-secondary" onClick={onClose}>
          Закрити
        </button>
      </div>
    </div>
  );
}
