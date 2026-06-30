import type { Card as CardType, Suit } from "../shared";
import { SUIT_SYMBOLS } from "../shared";
import { Card } from "./Card";

interface Props {
  recentPile: CardType[];
  activeSuit: Suit | null;
  stockCount: number;
  pileCount: number;
  multiplier?: number;
}

export function TableStack({ recentPile, activeSuit, stockCount, pileCount, multiplier = 1 }: Props) {
  return (
    <div className="table-stack">
      <div className="stack-pile">
        <span className="stack-label">Стіл ({pileCount})</span>
        <div className="discard-fan">
          {recentPile.length === 0 && <div className="card card-empty" />}
          {recentPile.map((c, i) => {
            const isTop = i === recentPile.length - 1;
            return (
              <div
                key={c.id}
                className="discard-fan-card"
                style={{
                  transform: `translate(${i * 6}px, ${i * 5}px) rotate(${(i % 2 === 0 ? -1 : 1) * Math.min(i, 4)}deg)`,
                  zIndex: i,
                }}
              >
                <Card card={c} multiplier={isTop ? multiplier : 1} />
              </div>
            );
          })}
        </div>
        {activeSuit && (
          <span className="active-suit-badge">
            активна масть: <strong>{SUIT_SYMBOLS[activeSuit]}</strong>
          </span>
        )}
      </div>
      <div className="stack-pile">
        <span className="stack-label">Колода</span>
        <div className="card card-back" />
        <span className="stock-count">{stockCount}</span>
      </div>
    </div>
  );
}
