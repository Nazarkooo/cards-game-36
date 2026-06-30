import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { PublicPlayer } from "../shared";

interface Props {
  players: PublicPlayer[];
  myId: string;
  turnPlayerId: string | null;
  hostId: string;
  dealTrigger?: number;
  children: ReactNode;
}

// Seats everyone evenly around an oval, with "you" always anchored at the bottom (6 o'clock)
// and the rest following clockwise — same convention as a physical card table.
function seatAngles(count: number): number[] {
  const step = 360 / count;
  return Array.from({ length: count }, (_, i) => 90 + step * i);
}

const RX = 44; // % of container width
const RY = 38; // % of container height
const CARDS_PER_SEAT = 3; // a few flying cards per seat to suggest a full deal, not just one

interface FlyingCard {
  key: string;
  left: number;
  top: number;
  delay: number;
}

export function RoundTable({ players, myId, turnPlayerId, hostId, dealTrigger, children }: Props) {
  const myIndex = players.findIndex((p) => p.id === myId);
  const ordered = myIndex >= 0 ? [...players.slice(myIndex), ...players.slice(0, myIndex)] : players;
  const angles = seatAngles(ordered.length);
  const others = ordered.slice(1); // skip "you" — your own hand is shown separately below the table
  const otherAngles = angles.slice(1);

  const seatPositions = ordered.map((_, i) => {
    const angle = (angles[i] * Math.PI) / 180;
    return { left: 50 + RX * Math.cos(angle), top: 50 + RY * Math.sin(angle) };
  });

  const [flying, setFlying] = useState<FlyingCard[]>([]);
  const [flown, setFlown] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (dealTrigger === undefined) return;
    if (isFirstRender.current) {
      // skip the very first mount (e.g. reconnecting mid-round) — only animate actual transitions
      isFirstRender.current = false;
      return;
    }
    const cards: FlyingCard[] = [];
    let order = 0;
    for (let round = 0; round < CARDS_PER_SEAT; round += 1) {
      seatPositions.forEach((pos, seatIdx) => {
        cards.push({ key: `${dealTrigger}-${round}-${seatIdx}`, left: pos.left, top: pos.top, delay: order * 70 });
        order += 1;
      });
    }
    setFlying(cards);
    setFlown(false);
    const flyTimer = setTimeout(() => setFlown(true), 20);
    const clearTimer = setTimeout(() => setFlying([]), order * 70 + 650);
    return () => {
      clearTimeout(flyTimer);
      clearTimeout(clearTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealTrigger]);

  return (
    <div className="round-table">
      <div className="round-table-felt" />
      {others.map((p, i) => {
        const angle = (otherAngles[i] * Math.PI) / 180;
        const left = 50 + RX * Math.cos(angle);
        const top = 50 + RY * Math.sin(angle);
        return (
          <div
            key={p.id}
            className={`seat ${p.id === turnPlayerId ? "seat-active" : ""} ${p.eliminated ? "seat-eliminated" : ""}`}
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <div className="seat-chip">
              <div className="seat-name">
                {p.id === hostId && "👑 "}
                {p.name}
                {!p.connected && " (офлайн)"}
              </div>
              <div className="seat-meta">
                <span>🂠 {p.cardCount}</span>
                <span className={p.score > 250 ? "score-warn" : ""}>{p.score}</span>
              </div>
            </div>
          </div>
        );
      })}
      <div className="round-table-center">{children}</div>
      {flying.map((c) => (
        <div
          key={c.key}
          className="deal-fly-card"
          style={
            {
              left: flown ? `${c.left}%` : "50%",
              top: flown ? `${c.top}%` : "50%",
              opacity: flown ? 0 : 1,
              "--stagger": `${c.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
