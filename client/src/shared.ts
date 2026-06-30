export type Suit = "S" | "H" | "D" | "C"; // spades, hearts, diamonds, clubs
export type Rank = "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
}

export interface PublicPlayer {
  id: string;
  name: string;
  cardCount: number;
  score: number;
  eliminated: boolean;
  connected: boolean;
}

export interface PendingEffect {
  type: "draw7" | "draw8";
  amount: number;
}

export interface ActionLogEntry {
  id: string;
  text: string;
  ts: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  name: string;
  text: string;
  ts: number;
}

export interface PublicGameState {
  roomId: string;
  phase: "lobby" | "playing" | "roundOver" | "sessionOver";
  players: PublicPlayer[];
  hostId: string;
  you: {
    id: string;
    hand: Card[];
  };
  topCard: Card | null;
  recentPile: Card[]; // last few cards on the discard pile, oldest first — for visualizing recent throws
  activeSuit: Suit | null;
  stockCount: number;
  pileCount: number;
  turnPlayerId: string | null;
  pendingEffect: PendingEffect | null;
  roundMultiplier: number;
  bridgeAvailable: boolean;
  awaitingJackBonusFrom: string | null;
  jackBonusAmount: number;
  log: ActionLogEntry[];
  chat: ChatMessage[];
  canPassWithoutDraw: boolean;
  hasDrawnThisTurn: boolean;
  winnerId: string | null; // session winner
  lastRoundSummary: RoundSummary | null;
}

export interface RoundSummary {
  multiplier: number;
  pointsAdded: Record<string, number>; // playerId -> points added this round
  bridgeCalledBy: string | null;
  jackBonus: { playerId: string; mode: "all" | "self"; amount: number } | null;
  eliminated: string[];
  reset295: string[];
}

export type ClientToServerEvents = {
  create_room: (data: { name: string; playerId: string }) => void;
  join_room: (data: { roomId: string; name: string; playerId: string }) => void;
  start_round: () => void;
  play_cards: (data: { cardIds: string[]; declareSuit?: Suit }) => void;
  draw_card: () => void;
  call_bridge: () => void;
  choose_jack_bonus: (data: { mode: "all" | "self" }) => void;
  pass_turn: () => void;
  leave_room: () => void;
  send_chat: (data: { text: string }) => void;
  declare_suit: (data: { suit: Suit }) => void;
};

export type ServerToClientEvents = {
  room_created: (data: { roomId: string }) => void;
  game_state: (state: PublicGameState) => void;
  error_msg: (data: { message: string }) => void;
};

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const RANKS: Rank[] = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

// Client-side hint only (server is authoritative): same suit, same rank, or a Jack.
export function isLegalCoverHint(card: Card, topRank: Rank, activeSuit: Suit): boolean {
  if (card.rank === "J") return true;
  if (card.suit === activeSuit) return true;
  if (card.rank === topRank) return true;
  return false;
}
