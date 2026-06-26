import type { Card as CardType } from "../shared";
import { SUIT_SYMBOLS } from "../shared";

interface Props {
  card: CardType;
  selected?: boolean;
  faceDown?: boolean;
  small?: boolean;
  onClick?: () => void;
}

const RED_SUITS = new Set(["H", "D"]);

export function Card({ card, selected, faceDown, small, onClick }: Props) {
  if (faceDown) {
    return <div className={`card card-back ${small ? "card-sm" : ""}`} />;
  }
  const isRed = RED_SUITS.has(card.suit);
  return (
    <button
      type="button"
      className={`card ${isRed ? "card-red" : "card-black"} ${selected ? "card-selected" : ""} ${small ? "card-sm" : ""}`}
      onClick={onClick}
    >
      <span className="card-corner card-corner-top">{card.rank}</span>
      <span className="card-suit">{SUIT_SYMBOLS[card.suit]}</span>
      <span className="card-corner card-corner-bottom">{card.rank}</span>
    </button>
  );
}
