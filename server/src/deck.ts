import { Card, Rank, Suit, RANKS, SUITS } from "./shared.js";

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

export function handValue(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + pointValue(c), 0);
}

let cardCounter = 0;
function makeCardId(): string {
  cardCounter += 1;
  return `c${cardCounter}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: makeCardId(), rank, suit });
    }
  }
  return shuffle(deck);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Base legality: same suit as the top card's effective active suit, OR same rank, OR a Jack (always wild).
export function isLegalCover(card: Card, topRank: Rank, activeSuit: Suit): boolean {
  if (card.rank === "J") return true;
  if (card.suit === activeSuit) return true;
  if (card.rank === topRank) return true;
  return false;
}
