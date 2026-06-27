import type { Card as CardType } from "../shared";
import { SUIT_SYMBOLS } from "../shared";
import { pointValue } from "../points";

interface Props {
  card: CardType;
  selected?: boolean;
  faceDown?: boolean;
  small?: boolean;
  onClick?: () => void;
  multiplier?: number;
}

const RED_SUITS = new Set(["H", "D"]);

export function Card({ card, selected, faceDown, small, onClick, multiplier = 1 }: Props) {
  if (faceDown) {
    return <div className={`card card-back ${small ? "card-sm" : ""}`} />;
  }
  const isRed = RED_SUITS.has(card.suit);
  const basePoints = pointValue(card);
  const effectivePoints = basePoints * multiplier;
  return (
    <button
      type="button"
      className={`card ${isRed ? "card-red" : "card-black"} ${selected ? "card-selected" : ""} ${small ? "card-sm" : ""}`}
      onClick={onClick}
    >
      <span className="card-corner card-corner-top">{card.rank}</span>
      <span className="card-suit">{SUIT_SYMBOLS[card.suit]}</span>
      <span className="card-corner card-corner-bottom">{card.rank}</span>
      {effectivePoints > 0 && !small && (
        <span className={`card-points ${multiplier > 1 ? "card-points-boosted" : ""}`}>{effectivePoints}</span>
      )}
    </button>
  );
}
