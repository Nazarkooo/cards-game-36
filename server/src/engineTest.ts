import { addPlayer, applyCallBridge, applyChooseJackBonus, applyDrawCard, applyPlayCards, createRoom, startRound, toPublicState } from "./gameEngine.js";
import { Card } from "./shared.js";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

function findInHand(cards: Card[], rank: string, suit?: string): Card {
  const c = cards.find((x) => x.rank === rank && (!suit || x.suit === suit));
  if (!c) throw new Error(`card not found rank=${rank} suit=${suit}`);
  return c;
}

// --- Test 1: basic deal + legal move + A skip ---
{
  const room = createRoom("rp1", "p1", "Andriy");
  addPlayer(room, "p2", "Olena");
  addPlayer(room, "p3", "Bohdan");
  startRound(room);
  assert(room.order.length === 3, "3 active players in order");
  const starterDealt = [...room.players.values()].some((p) => p.hand.length === 5);
  assert(starterDealt, "everyone has 5 cards on first round (no previous winner)");
  assert(room.pile.length === 1, "table starter card placed");
}

// --- Test 2: A-skip count ---
{
  const room = createRoom("ra1", "a1", "A");
  addPlayer(room, "a2", "B");
  addPlayer(room, "a3", "C");
  addPlayer(room, "a4", "D");
  startRound(room);
  // force a known top card and active suit, then give current player two Aces of matching suit
  const top = room.pile[room.pile.length - 1];
  const currentId = room.order[room.turnIndex];
  const cur = room.players.get(currentId)!;
  const aceMatch: Card = { id: "test_ace1", rank: "A", suit: top.suit };
  const aceOther: Card = { id: "test_ace2", rank: "A", suit: top.suit === "S" ? "H" : "S" };
  cur.hand.push(aceMatch, aceOther);
  const beforeIdx = room.turnIndex;
  const res = applyPlayCards(room, currentId, [aceMatch.id, aceOther.id]);
  assert(res.ok, "playing 2 aces succeeds");
  const expectedIdx = (beforeIdx + 1 + 2) % room.order.length;
  assert(room.turnIndex === expectedIdx, `turn skips 1+2 players (got ${room.turnIndex}, expected ${expectedIdx})`);
}

// --- Test 3: 7-chain cumulative draw ---
{
  const room = createRoom("rs1", "s1", "A");
  addPlayer(room, "s2", "B");
  startRound(room);
  const top = room.pile[room.pile.length - 1];
  const p1 = room.order[room.turnIndex];
  const player1 = room.players.get(p1)!;
  const seven1: Card = { id: "t7_1", rank: "7", suit: top.suit };
  player1.hand.push(seven1);
  let res = applyPlayCards(room, p1, [seven1.id]);
  assert(res.ok, "first player throws a 7");
  assert(room.pendingEffect?.type === "draw7" && room.pendingEffect.amount === 2, "pendingEffect draw7 amount=2");

  const p2 = room.order[room.turnIndex];
  const player2 = room.players.get(p2)!;
  const seven2: Card = { id: "t7_2", rank: "7", suit: "H" };
  const seven3: Card = { id: "t7_3", rank: "7", suit: "D" };
  player2.hand.push(seven2, seven3);
  res = applyPlayCards(room, p2, [seven2.id, seven3.id]);
  assert(res.ok, "second player redirects with 2 more 7s");
  assert(room.pendingEffect?.type === "draw7" && room.pendingEffect.amount === 6, `cumulative amount should be 2+4=6 (got ${room.pendingEffect?.amount})`);

  const p3 = room.order[room.turnIndex];
  const player3 = room.players.get(p3)!;
  const handBefore = player3.hand.length;
  const stockBefore = room.stock.length;
  applyDrawCard(room, p3);
  assert(player3.hand.length === handBefore + Math.min(6, stockBefore), "third player draws accumulated 6 cards");
  assert(room.pendingEffect === null, "pendingEffect cleared after accepting draw7");
}

// --- Test 4: Bridge detection + scoring x2 ---
{
  const room = createRoom("rb1", "b1", "A");
  addPlayer(room, "b2", "B");
  startRound(room);
  room.pile.push(
    { id: "k1", rank: "K", suit: "S" },
    { id: "k2", rank: "K", suit: "H" },
    { id: "k3", rank: "K", suit: "D" },
    { id: "k4", rank: "K", suit: "C" }
  );
  const pub = toPublicState(room, room.order[0]);
  assert(pub.bridgeAvailable === true, "bridge available after 4 same-rank cards on pile");
  const caller = room.order[0];
  const scoresBefore = new Map([...room.players.values()].map((p) => [p.id, p.score]));
  const res = applyCallBridge(room, caller);
  assert(res.ok, "bridge call succeeds");
  assert(room.phase === "roundOver" || room.phase === "sessionOver", "round ends after bridge");
  for (const p of room.players.values()) {
    if (room.lastRoundSummary) {
      const added = room.lastRoundSummary.pointsAdded[p.id] ?? 0;
      assert(p.score === (scoresBefore.get(p.id) ?? 0) + added, `score updated correctly for ${p.name}`);
    }
  }
  assert(room.lastRoundSummary?.multiplier === 2, "bridge multiplier is x2 (roundMultiplier 1 * 2)");
}

// --- Test 5: Jack bonus on round finish ---
{
  const room = createRoom("rj1", "j1", "Winner");
  addPlayer(room, "j2", "Loser");
  startRound(room);
  const winnerId = room.order[room.turnIndex];
  const winner = room.players.get(winnerId)!;
  const top = room.pile[room.pile.length - 1];
  // zero out the other player's hand value so the jack-bonus contribution is isolated
  const otherIdPre = room.order.find((id) => id !== winnerId)!;
  room.players.get(otherIdPre)!.hand = [{ id: "zero1", rank: "9", suit: "S" }];
  // give winner exactly one card: a Jack of spades, matching legality via wild
  winner.hand = [{ id: "jsp", rank: "J", suit: "S" }];
  const res = applyPlayCards(room, winnerId, ["jsp"], "H");
  assert(res.ok, "winner plays last card as J♠");
  assert(room.awaitingJackBonusFrom === winnerId, "awaiting jack bonus choice from winner");
  const otherId = room.order.find((id) => id !== winnerId) ?? [...room.players.keys()].find((id) => id !== winnerId)!;
  const otherScoreBefore = room.players.get(otherId)!.score;
  applyChooseJackBonus(room, winnerId, "all");
  const otherScoreAfter = room.players.get(otherId)!.score;
  assert(otherScoreAfter === otherScoreBefore + 40, `J♠ "all" bonus adds 40 to others (before=${otherScoreBefore}, after=${otherScoreAfter})`);
}

// --- Test 6: elimination thresholds (>300 eliminated, ===295 reset to 0) ---
{
  const room = createRoom("re1", "e1", "A");
  addPlayer(room, "e2", "B");
  startRound(room);
  const pA = room.players.get("e1")!;
  const pB = room.players.get("e2")!;
  // bridge multiplier = roundMultiplier(1) * 2 = 2, each hand is one K (10 pts) -> +20 per player
  pA.score = 285; // +20 -> 305 -> eliminated (>300)
  pB.score = 275; // +20 -> 295 -> reset to 0
  pA.hand = [{ id: "x1", rank: "K", suit: "S" }];
  pB.hand = [{ id: "x2", rank: "K", suit: "H" }];
  room.pile.push({ id: "z1", rank: "9", suit: "S" }, { id: "z2", rank: "9", suit: "H" }, { id: "z3", rank: "9", suit: "D" }, { id: "z4", rank: "9", suit: "C" });
  applyCallBridge(room, "e1");
  assert(pA.eliminated === true, `e1 (296+10*mult>300) should be eliminated, got score=${pA.score}`);
  assert(pB.score === 0, `e2 (285+10*mult=295) should reset to 0, got score=${pB.score}`);
}

// --- Test 7: throwing a 6 keeps the turn with the thrower until they cover it themselves ---
{
  const room = createRoom("rs6", "s6", "Thrower");
  addPlayer(room, "s6b", "Other");
  startRound(room);
  const top = room.pile[room.pile.length - 1];
  const throwerId = room.order[room.turnIndex];
  const thrower = room.players.get(throwerId)!;
  const otherId = room.order.find((id) => id !== throwerId)!;

  const six: Card = { id: "six1", rank: "6", suit: top.suit };
  const followUp: Card = { id: "follow1", rank: "9", suit: top.suit }; // matches the 6's suit
  thrower.hand.push(six, followUp);

  let res = applyPlayCards(room, throwerId, [six.id]);
  assert(res.ok, "thrower plays a 6");
  assert(room.order[room.turnIndex] === throwerId, "turn stays with the thrower right after playing 6 (not the next player)");

  // thrower has no other legal card except the prepared follow-up; verify draw_card is rejected since they DO have one
  const drawRes = applyDrawCard(room, throwerId);
  assert(drawRes.ok === false, "thrower cannot draw instead of covering when they hold a legal cover card");

  res = applyPlayCards(room, throwerId, [followUp.id]);
  assert(res.ok, "thrower covers their own 6 with a matching-suit card");
  assert(room.order[room.turnIndex] === otherId, "turn finally passes to the other player after the 6 is resolved");
}

console.log("\nDone.");
