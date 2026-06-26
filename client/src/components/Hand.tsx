import { useState } from "react";
import type { Card as CardType } from "../shared";
import { Card } from "./Card";

interface Props {
  cards: CardType[];
  selectedIds: string[];
  onToggle: (card: CardType) => void;
}

export function Hand({ cards, selectedIds, onToggle }: Props) {
  return (
    <div className="hand-scroll">
      <div className="hand-row">
        {cards.map((c) => (
          <Card key={c.id} card={c} selected={selectedIds.includes(c.id)} onClick={() => onToggle(c)} />
        ))}
      </div>
    </div>
  );
}

export function useCardSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = (card: CardType, hand: CardType[]) => {
    setSelectedIds((prev) => {
      if (prev.includes(card.id)) return prev.filter((id) => id !== card.id);
      const selectedRank = prev.length ? hand.find((c) => c.id === prev[0])?.rank : null;
      if (selectedRank && card.rank !== selectedRank) return [card.id];
      return [...prev, card.id];
    });
  };

  const clear = () => setSelectedIds([]);

  return { selectedIds, toggle, clear };
}
