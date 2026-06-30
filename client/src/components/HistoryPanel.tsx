import type { ThrowEvent } from "../shared";
import { Card } from "./Card";

interface Props {
  history: ThrowEvent[];
  open: boolean;
  onClose: () => void;
}

export function HistoryPanel({ history, open, onClose }: Props) {
  const recent = [...history].reverse();
  return (
    <>
      {open && <div className="history-overlay" onClick={onClose} />}
      <aside className={`history-panel ${open ? "history-panel-open" : ""}`}>
        <div className="history-header">
          <span>🂡 Що кидали</span>
          <button className="btn btn-link" onClick={onClose}>
            Закрити
          </button>
        </div>
        <div className="history-list">
          {recent.length === 0 && <p className="history-empty">Ще ніхто не ходив у цьому раунді</p>}
          {recent.map((t) => (
            <div key={t.id} className="history-row">
              <div className="history-row-name">{t.playerName}</div>
              <div className="history-row-cards">
                {t.cards.map((c) => (
                  <Card key={c.id} card={c} small />
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
