import type { Card as CardType, Suit } from "../shared";
import { SUIT_SYMBOLS } from "../shared";
import { Card } from "./Card";

interface Props {
  topCard: CardType | null;
  activeSuit: Suit | null;
  stockCount: number;
  pileCount: number;
}

export function TableStack({ topCard, activeSuit, stockCount, pileCount }: Props) {
  return (
    <div className="table-stack">
      <div className="stack-pile">
        <span className="stack-label">Стіл ({pileCount})</span>
        {topCard ? <Card card={topCard} /> : <div className="card card-empty" />}
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
