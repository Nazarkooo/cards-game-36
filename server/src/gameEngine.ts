import { Card, PendingEffect, PublicGameState, PublicPlayer, Rank, RoundSummary, Suit, ActionLogEntry } from "./shared.js";
import { freshDeck, handValue, isLegalCover, pointValue, shuffle } from "./deck.js";

export interface Player {
  id: string;
  name: string;
  socketId: string | null;
  connected: boolean;
  hand: Card[];
  score: number;
  eliminated: boolean;
}

export interface RoomState {
  roomId: string;
  hostId: string;
  phase: "lobby" | "playing" | "roundOver" | "sessionOver";
  players: Map<string, Player>;
  order: string[]; // active (non-eliminated) player ids, seating order
  turnIndex: number;
  stock: Card[];
  pile: Card[];
  activeSuit: Suit | null;
  pendingEffect: PendingEffect | null;
  roundMultiplier: number;
  roundStarterId: string | null;
  awaitingJackBonusFrom: string | null;
  jackBonusAmount: number; // 20 or 40 depending on suit, set when winner's last card is a jack
  winnerId: string | null;
  lastRoundSummary: RoundSummary | null;
  log: ActionLogEntry[];
}

let logCounter = 0;
function pushLog(state: RoomState, text: string) {
  logCounter += 1;
  state.log.push({ id: `l${logCounter}`, text, ts: Date.now() });
  if (state.log.length > 50) state.log.shift();
}

export function createRoom(roomId: string, hostId: string, hostName: string): RoomState {
  const state: RoomState = {
    roomId,
    hostId,
    phase: "lobby",
    players: new Map(),
    order: [],
    turnIndex: 0,
    stock: [],
    pile: [],
    activeSuit: null,
    pendingEffect: null,
    roundMultiplier: 1,
    roundStarterId: null,
    awaitingJackBonusFrom: null,
    jackBonusAmount: 0,
    winnerId: null,
    lastRoundSummary: null,
    log: [],
  };
  addPlayer(state, hostId, hostName);
  pushLog(state, `${hostName} створив(ла) кімнату`);
  return state;
}

export function addPlayer(state: RoomState, id: string, name: string): void {
  if (state.players.has(id)) return;
  state.players.set(id, {
    id,
    name,
    socketId: null,
    connected: true,
    hand: [],
    score: 0,
    eliminated: false,
  });
}

function topCard(state: RoomState): Card | null {
  return state.pile.length ? state.pile[state.pile.length - 1] : null;
}

function topRank(state: RoomState): Rank | null {
  const t = topCard(state);
  return t ? t.rank : null;
}

function activePlayers(state: RoomState): Player[] {
  return state.order.map((id) => state.players.get(id)!).filter(Boolean);
}

function currentPlayerId(state: RoomState): string | null {
  if (!state.order.length) return null;
  return state.order[state.turnIndex % state.order.length];
}

function legalMoves(state: RoomState, hand: Card[]): Card[] {
  const tr = topRank(state);
  const suit = state.activeSuit;
  if (!tr || !suit) return [];
  return hand.filter((c) => isLegalCover(c, tr, suit));
}

function bridgeAvailable(state: RoomState): boolean {
  if (state.pile.length < 4) return false;
  const last4 = state.pile.slice(-4);
  const rank = last4[0].rank;
  return last4.every((c) => c.rank === rank);
}

function drawFromStock(state: RoomState, n: number): Card[] {
  const drawn: Card[] = [];
  for (let i = 0; i < n; i += 1) {
    if (state.stock.length === 0) {
      // reshuffle pile (all but the top card) back into stock
      if (state.pile.length <= 1) break; // nothing to reshuffle, give up
      const top = state.pile[state.pile.length - 1];
      const rest = state.pile.slice(0, -1);
      state.pile = [top];
      state.stock = shuffle(rest);
      state.roundMultiplier += 1;
      pushLog(state, `Колода добору закінчилась — стіс перемішано (множник x${state.roundMultiplier})`);
    }
    const c = state.stock.pop();
    if (!c) break;
    drawn.push(c);
  }
  return drawn;
}

function mustCoverSix(state: RoomState): boolean {
  return topRank(state) === "6";
}

function advanceTurn(state: RoomState, steps: number): void {
  if (!state.order.length) return;
  state.turnIndex = (state.turnIndex + steps) % state.order.length;
}

function removePlayerFromOrder(state: RoomState, id: string): void {
  const idx = state.order.indexOf(id);
  if (idx === -1) return;
  state.order.splice(idx, 1);
  if (idx < state.turnIndex) state.turnIndex -= 1;
  if (state.order.length) state.turnIndex = state.turnIndex % state.order.length;
}

// --- Dealing / round start ---

export function startRound(state: RoomState): void {
  const eligible = [...state.players.values()].filter((p) => !p.eliminated);
  const deck = freshDeck();
  state.order = eligible.map((p) => p.id);
  for (const p of eligible) p.hand = [];

  let starter: Player | null = null;
  if (state.roundStarterId) {
    starter = eligible.find((p) => p.id === state.roundStarterId) ?? null;
  }

  for (const p of eligible) {
    const dealCount = starter && p.id === starter.id ? 4 : 5;
    p.hand = deck.splice(0, dealCount);
  }

  const tableStarter = deck.splice(0, 1)[0];
  state.pile = tableStarter ? [tableStarter] : [];
  state.stock = deck;
  state.activeSuit = tableStarter ? tableStarter.suit : null;
  state.pendingEffect = null;
  state.awaitingJackBonusFrom = null;
  state.jackBonusAmount = 0;
  state.winnerId = null;
  state.lastRoundSummary = null;
  state.roundMultiplier = 1;
  state.phase = "playing";

  if (starter) {
    const startIdx = state.order.indexOf(starter.id);
    state.turnIndex = (startIdx + 1) % state.order.length;
  } else {
    state.turnIndex = 0;
  }

  pushLog(state, `Нова роздача. Стартова карта: ${tableStarter.rank}${tableStarter.suit}`);
}

// --- Actions ---

export type ActionResult = { ok: true } | { ok: false; error: string };

export function applyPlayCards(
  state: RoomState,
  playerId: string,
  cardIds: string[],
  declareSuit?: Suit
): ActionResult {
  if (state.phase !== "playing") return { ok: false, error: "Раунд не триває" };
  if (currentPlayerId(state) !== playerId) return { ok: false, error: "Не ваш хід" };
  if (state.awaitingJackBonusFrom) return { ok: false, error: "Очікується вибір бонусу валета" };

  const player = state.players.get(playerId);
  if (!player) return { ok: false, error: "Гравця не знайдено" };
  if (!cardIds.length) return { ok: false, error: "Не вибрано карт" };

  const cards: Card[] = [];
  for (const id of cardIds) {
    const c = player.hand.find((h) => h.id === id);
    if (!c) return { ok: false, error: "Карта не у вашій руці" };
    cards.push(c);
  }
  const rank = cards[0].rank;
  if (!cards.every((c) => c.rank === rank)) return { ok: false, error: "Усі карти у кидку мають бути одного рангу" };

  const tr = topRank(state);
  const suit = state.activeSuit;

  // If a draw7 effect is pending on this player, only a redirect with 7s is allowed as a play.
  if (state.pendingEffect?.type === "draw7" && rank !== "7") {
    return { ok: false, error: "Потрібно зіграти 7 (перевести) або взяти карти" };
  }

  if (rank === "J") {
    if (!declareSuit) return { ok: false, error: "Потрібно оголосити масть" };
  } else {
    const anyLegal = cards.some((c) => tr && suit && isLegalCover(c, tr, suit));
    if (!(tr && suit && (rank === tr || anyLegal))) {
      return { ok: false, error: "Цей хід не дозволений" };
    }
  }

  const carriedOverDrawSeven = state.pendingEffect?.type === "draw7" ? state.pendingEffect.amount : 0;

  // Remove cards from hand, place on pile (in submitted order)
  player.hand = player.hand.filter((h) => !cardIds.includes(h.id));
  for (const c of cards) state.pile.push(c);

  const lastCard = cards[cards.length - 1];
  state.activeSuit = rank === "J" ? declareSuit! : lastCard.suit;
  state.pendingEffect = null;

  pushLog(state, `${player.name} кидає ${cards.length}x ${rank}${rank === "J" ? ` → масть ${declareSuit}` : ""}`);

  // Player emptied hand -> round ends
  if (player.hand.length === 0) {
    finishRoundByWinner(state, player.id, rank === "J");
    return { ok: true };
  }

  // Apply special effects to determine how turn advances
  if (rank === "7") {
    const addAmount = 2 * cards.length;
    advanceTurn(state, 1);
    state.pendingEffect = { type: "draw7", amount: carriedOverDrawSeven + addAmount };
  } else if (rank === "8") {
    advanceTurn(state, 1);
    const nextId = currentPlayerId(state);
    const nextPlayer = nextId ? state.players.get(nextId) : null;
    if (nextPlayer) {
      const drawn = drawFromStock(state, cards.length);
      nextPlayer.hand.push(...drawn);
      pushLog(state, `${nextPlayer.name} бере ${drawn.length} карт(и) (8)`);
    }
  } else if (rank === "A") {
    advanceTurn(state, 1 + cards.length);
    pushLog(state, `Пропуск ходу: ${cards.length} гравець(ів)`);
  } else {
    advanceTurn(state, 1);
  }

  return { ok: true };
}

export function applyDrawCard(state: RoomState, playerId: string): ActionResult {
  if (state.phase !== "playing") return { ok: false, error: "Раунд не триває" };
  if (currentPlayerId(state) !== playerId) return { ok: false, error: "Не ваш хід" };
  if (state.awaitingJackBonusFrom) return { ok: false, error: "Очікується вибір бонусу валета" };

  const player = state.players.get(playerId);
  if (!player) return { ok: false, error: "Гравця не знайдено" };

  if (state.pendingEffect?.type === "draw7") {
    const amount = state.pendingEffect.amount;
    const drawn = drawFromStock(state, amount);
    player.hand.push(...drawn);
    state.pendingEffect = null;
    pushLog(state, `${player.name} бере ${drawn.length} карт(и) (7) і пропускає хід`);
    advanceTurn(state, 1);
    return { ok: true };
  }

  if (mustCoverSix(state) && legalMoves(state, player.hand).length > 0) {
    return { ok: false, error: "Потрібно накрити 6 — у вас є карта для цього" };
  }

  const drawn = drawFromStock(state, 1);
  player.hand.push(...drawn);
  pushLog(state, `${player.name} бере карту`);

  if (mustCoverSix(state)) {
    // must keep drawing on subsequent calls until a legal card appears; turn never auto-passes for a 6
    return { ok: true };
  }

  if (legalMoves(state, player.hand).length === 0) {
    advanceTurn(state, 1);
    pushLog(state, `${player.name} не може зіграти — хід переходить далі`);
  }
  return { ok: true };
}

export function applyPassTurn(state: RoomState, playerId: string): ActionResult {
  if (state.phase !== "playing") return { ok: false, error: "Раунд не триває" };
  if (currentPlayerId(state) !== playerId) return { ok: false, error: "Не ваш хід" };
  if (state.awaitingJackBonusFrom) return { ok: false, error: "Очікується вибір бонусу валета" };
  if (mustCoverSix(state)) return { ok: false, error: "Потрібно накрити 6" };
  if (state.pendingEffect?.type === "draw7") return { ok: false, error: "Зіграйте 7 або візьміть карти" };

  const player = state.players.get(playerId);
  if (!player) return { ok: false, error: "Гравця не знайдено" };
  advanceTurn(state, 1);
  pushLog(state, `${player.name} пропускає хід`);
  return { ok: true };
}

export function applyCallBridge(state: RoomState, playerId: string): ActionResult {
  if (state.phase !== "playing") return { ok: false, error: "Раунд не триває" };
  if (!bridgeAvailable(state)) return { ok: false, error: "Бридж недоступний" };
  const player = state.players.get(playerId);
  if (!player) return { ok: false, error: "Гравця не знайдено" };
  pushLog(state, `${player.name} оголошує БРИДЖ!`);
  finishRoundByBridge(state, playerId);
  return { ok: true };
}

export function applyChooseJackBonus(state: RoomState, playerId: string, mode: "all" | "self"): ActionResult {
  if (state.awaitingJackBonusFrom !== playerId) return { ok: false, error: "Зараз не ваш вибір" };
  const winner = state.players.get(playerId);
  if (!winner) return { ok: false, error: "Гравця не знайдено" };

  const amount = state.jackBonusAmount;
  const summary = state.lastRoundSummary!;
  if (mode === "all") {
    for (const p of state.players.values()) {
      if (p.id === winner.id || p.eliminated) continue;
      if (!(p.id in summary.pointsAdded)) continue;
      summary.pointsAdded[p.id] += amount;
    }
    pushLog(state, `${winner.name} обирає: усім іншим +${amount} очок`);
  } else {
    summary.pointsAdded[winner.id] = (summary.pointsAdded[winner.id] ?? 0) - amount;
    pushLog(state, `${winner.name} обирає: собі -${amount} очок`);
  }
  summary.jackBonus = { playerId: winner.id, mode, amount };
  state.awaitingJackBonusFrom = null;
  finalizeRoundScoring(state, summary);
  return { ok: true };
}

// --- Round finishing ---

function finishRoundByWinner(state: RoomState, winnerId: string, lastCardWasJack: boolean): void {
  state.phase = "roundOver";
  const multiplier = state.roundMultiplier;
  const pointsAdded: Record<string, number> = {};
  for (const p of activePlayers(state)) {
    pointsAdded[p.id] = p.id === winnerId ? 0 : handValue(p.hand) * multiplier;
  }
  const winner = state.players.get(winnerId)!;
  const lastCard = state.pile[state.pile.length - 1];
  const summary: RoundSummary = {
    multiplier,
    pointsAdded,
    bridgeCalledBy: null,
    jackBonus: null,
    eliminated: [],
    reset295: [],
  };
  state.lastRoundSummary = summary;
  state.roundStarterId = winnerId;

  if (lastCardWasJack && lastCard?.rank === "J") {
    state.jackBonusAmount = lastCard.suit === "S" ? 40 : 20;
    state.awaitingJackBonusFrom = winnerId;
    pushLog(state, `${winner.name} завершує раунд Валетом — обирає бонус`);
    return; // wait for choose_jack_bonus
  }

  finalizeRoundScoring(state, summary);
}

function finishRoundByBridge(state: RoomState, callerId: string): void {
  state.phase = "roundOver";
  const multiplier = state.roundMultiplier * 2;
  const pointsAdded: Record<string, number> = {};
  for (const p of activePlayers(state)) {
    pointsAdded[p.id] = handValue(p.hand) * multiplier;
  }
  const summary: RoundSummary = {
    multiplier,
    pointsAdded,
    bridgeCalledBy: callerId,
    jackBonus: null,
    eliminated: [],
    reset295: [],
  };
  state.lastRoundSummary = summary;
  // pick next starter: player with the fewest cards (closest to winning) continues the rotation
  const fewest = activePlayers(state).slice().sort((a, b) => a.hand.length - b.hand.length)[0];
  state.roundStarterId = fewest ? fewest.id : null;
  finalizeRoundScoring(state, summary);
}

function finalizeRoundScoring(state: RoomState, summary: RoundSummary): void {
  for (const [playerId, pts] of Object.entries(summary.pointsAdded)) {
    const p = state.players.get(playerId);
    if (!p) continue;
    p.score += pts;
    if (p.score === 295) {
      p.score = 0;
      summary.reset295.push(playerId);
      pushLog(state, `${p.name}: рахунок 295 — обнулено до 0`);
    } else if (p.score > 300) {
      p.eliminated = true;
      summary.eliminated.push(playerId);
      removePlayerFromOrder(state, playerId);
      pushLog(state, `${p.name} вилітає з гри (${p.score} очок)`);
    }
  }

  const remaining = [...state.players.values()].filter((p) => !p.eliminated);
  if (remaining.length <= 1) {
    state.phase = "sessionOver";
    state.winnerId = remaining[0]?.id ?? null;
    if (state.winnerId) pushLog(state, `Переможець сесії: ${state.players.get(state.winnerId)!.name}`);
  } else {
    state.phase = "roundOver";
  }
}

// --- Public view ---

export function toPublicState(state: RoomState, forPlayerId: string): PublicGameState {
  const players: PublicPlayer[] = [...state.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    cardCount: p.hand.length,
    score: p.score,
    eliminated: p.eliminated,
    connected: p.connected,
  }));
  const you = state.players.get(forPlayerId);
  const top = topCard(state);
  return {
    roomId: state.roomId,
    phase: state.phase,
    players,
    hostId: state.hostId,
    you: { id: forPlayerId, hand: you ? you.hand : [] },
    topCard: top,
    activeSuit: state.activeSuit,
    stockCount: state.stock.length,
    pileCount: state.pile.length,
    turnPlayerId: currentPlayerId(state),
    pendingEffect: state.pendingEffect,
    roundMultiplier: state.roundMultiplier,
    bridgeAvailable: bridgeAvailable(state),
    awaitingJackBonusFrom: state.awaitingJackBonusFrom,
    jackBonusAmount: state.jackBonusAmount,
    log: state.log.slice(-20),
    winnerId: state.winnerId,
    lastRoundSummary: state.lastRoundSummary,
  };
}
