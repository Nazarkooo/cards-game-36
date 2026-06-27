import type { Card } from "./shared";

export function pointValue(card: Card): number {
  switch (card.rank) {
    case "6":
    case "7":
    case "8":
    case "9":
      return 0;
    case "10":
      return 10;
    case "J":
      return card.suit === "S" ? 40 : 20;
    case "Q":
      return card.suit === "S" ? 60 : 10;
    case "K":
      return 10;
    case "A":
      return 15;
  }
}
