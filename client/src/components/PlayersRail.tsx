import type { PublicPlayer } from "../shared";

interface Props {
  players: PublicPlayer[];
  myId: string;
  turnPlayerId: string | null;
  hostId: string;
}

export function PlayersRail({ players, myId, turnPlayerId, hostId }: Props) {
  const others = players.filter((p) => p.id !== myId);
  return (
    <div className="players-rail">
      {others.map((p) => (
        <div key={p.id} className={`player-chip ${p.id === turnPlayerId ? "player-chip-active" : ""} ${p.eliminated ? "player-chip-eliminated" : ""}`}>
          <div className="player-chip-name">
            {p.id === hostId && "👑 "}
            {p.name}
            {!p.connected && " (офлайн)"}
          </div>
          <div className="player-chip-meta">
            <span>🂠 {p.cardCount}</span>
            <span className={p.score > 250 ? "score-warn" : ""}>{p.score} очок</span>
          </div>
        </div>
      ))}
    </div>
  );
}
