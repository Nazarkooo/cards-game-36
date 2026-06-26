import type { Suit } from "../shared";
import { SUIT_SYMBOLS } from "../shared";

interface Props {
  suit: Suit | null;
}

const RED_SUITS = new Set<Suit>(["H", "D"]);

export function ActiveSuitBadge({ suit }: Props) {
  if (!suit) return null;
  const isRed = RED_SUITS.has(suit);
  return (
    <div className={`active-suit-floater ${isRed ? "suit-red" : "suit-black"}`} title="Активна масть">
      <span className="active-suit-floater-symbol">{SUIT_SYMBOLS[suit]}</span>
    </div>
  );
}
