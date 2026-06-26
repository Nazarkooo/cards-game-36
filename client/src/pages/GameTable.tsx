import { useMemo, useState } from "react";
import type { PublicGameState, Suit } from "../shared";
import { isLegalCoverHint } from "../shared";
import { Hand, useCardSelection } from "../components/Hand";
import { TableStack } from "../components/TableStack";
import { PlayersRail } from "../components/PlayersRail";
import { ScoreBoard } from "../components/ScoreBoard";
import { SuitPicker } from "../components/SuitPicker";
import { JackBonusModal } from "../components/JackBonusModal";
import { ActionLog } from "../components/ActionLog";
import { GameOverModal } from "../components/GameOverModal";

interface Props {
  state: PublicGameState;
  myId: string;
  onStartRound: () => void;
  onPlayCards: (cardIds: string[], declareSuit?: Suit) => void;
  onDrawCard: () => void;
  onPassTurn: () => void;
  onCallBridge: () => void;
  onChooseJackBonus: (mode: "all" | "self") => void;
  onLeaveRoom: () => void;
}

export function GameTable({ state, myId, onStartRound, onPlayCards, onDrawCard, onPassTurn, onCallBridge, onChooseJackBonus, onLeaveRoom }: Props) {
  const { selectedIds, toggle, clear } = useCardSelection();
  const [showScores, setShowScores] = useState(false);
  const [pendingSuitPick, setPendingSuitPick] = useState(false);

  const isMyTurn = state.turnPlayerId === myId;
  const isHost = state.hostId === myId;
  const hand = state.you.hand;

  const selectedRank = selectedIds.length ? hand.find((c) => c.id === selectedIds[0])?.rank : null;

  const canDraw = isMyTurn && state.phase === "playing" && !state.awaitingJackBonusFrom;
  const canPass = canDraw && state.pendingEffect?.type !== "draw7" && state.topCard?.rank !== "6";

  const hasAnyLegal = useMemo(() => {
    if (!state.topCard || !state.activeSuit) return false;
    return hand.some((c) => isLegalCoverHint(c, state.topCard!.rank, state.activeSuit!));
  }, [hand, state.topCard, state.activeSuit]);

  const selectionIsLegal = useMemo(() => {
    if (!selectedIds.length || !state.topCard || !state.activeSuit) return false;
    if (state.pendingEffect?.type === "draw7") return selectedRank === "7";
    if (selectedRank === "J") return true;
    const selectedCards = hand.filter((c) => selectedIds.includes(c.id));
    return selectedCards.some((c) => isLegalCoverHint(c, state.topCard!.rank, state.activeSuit!));
  }, [selectedIds, selectedRank, hand, state.topCard, state.activeSuit, state.pendingEffect]);

  const handlePlayClick = () => {
    if (!selectedIds.length) return;
    if (selectedRank === "J") {
      setPendingSuitPick(true);
      return;
    }
    onPlayCards(selectedIds);
    clear();
  };

  const handleSuitPick = (suit: Suit) => {
    onPlayCards(selectedIds, suit);
    clear();
    setPendingSuitPick(false);
  };

  if (state.phase === "lobby") {
    return (
      <div className="lobby-screen">
        <h1>Кімната {state.roomId}</h1>
        <p className="subtitle">Поділіться кодом кімнати з друзями (2–5 гравців)</p>
        <div className="lobby-players">
          {state.players.map((p) => (
            <div key={p.id} className="lobby-player-row">
              {p.id === state.hostId && "👑 "}
              {p.name} {p.id === myId && "(ви)"}
            </div>
          ))}
        </div>
        {isHost ? (
          <button className="btn btn-primary" disabled={state.players.length < 2} onClick={onStartRound}>
            {state.players.length < 2 ? "Чекаємо ще гравців..." : "Почати гру"}
          </button>
        ) : (
          <p className="status-warn">Очікуємо, поки хост почне гру...</p>
        )}
        <button className="btn btn-ghost" onClick={onLeaveRoom}>
          Вийти з кімнати
        </button>
      </div>
    );
  }

  return (
    <div className="game-table">
      <header className="game-header">
        <span className="room-badge">Кімната {state.roomId}</span>
        {state.roundMultiplier > 1 && <span className="multiplier-badge">x{state.roundMultiplier}</span>}
        <button className="btn btn-link" onClick={() => setShowScores(true)}>
          Рахунок
        </button>
        <button className="btn btn-link" onClick={onLeaveRoom}>
          Вийти
        </button>
      </header>

      <PlayersRail players={state.players} myId={myId} turnPlayerId={state.turnPlayerId} hostId={state.hostId} />

      <TableStack topCard={state.topCard} activeSuit={state.activeSuit} stockCount={state.stockCount} pileCount={state.pileCount} />

      <ActionLog log={state.log} />

      {state.pendingEffect && (
        <div className="effect-banner">
          {state.pendingEffect.type === "draw7"
            ? `Активна 7: наступний гравець бере ${state.pendingEffect.amount} карт або переводить`
            : `Активна 8`}
        </div>
      )}

      {state.bridgeAvailable && (
        <button className="btn btn-bridge" onClick={onCallBridge}>
          🌉 БРИДЖ!
        </button>
      )}

      <div className="turn-indicator">
        {isMyTurn ? <strong>Ваш хід</strong> : <span>Хід: {state.players.find((p) => p.id === state.turnPlayerId)?.name ?? "?"}</span>}
        {isMyTurn && !hasAnyLegal && !state.pendingEffect && <span className="hint-text"> — немає ходу, візьміть карту</span>}
      </div>

      <Hand cards={hand} selectedIds={selectedIds} onToggle={(c) => toggle(c, hand)} />

      <div className="action-bar">
        <button className="btn btn-primary" disabled={!isMyTurn || !selectionIsLegal} onClick={handlePlayClick}>
          Зіграти {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
        </button>
        <button className="btn btn-secondary" disabled={!canDraw} onClick={onDrawCard}>
          Взяти карту
        </button>
        <button className="btn btn-ghost" disabled={!canPass} onClick={onPassTurn}>
          Пропустити
        </button>
        {selectedIds.length > 0 && (
          <button className="btn btn-ghost" onClick={clear}>
            Скасувати вибір
          </button>
        )}
      </div>

      <SuitPicker open={pendingSuitPick} onPick={handleSuitPick} onCancel={() => setPendingSuitPick(false)} />

      <JackBonusModal
        open={state.awaitingJackBonusFrom === myId}
        amount={state.jackBonusAmount}
        onChoose={onChooseJackBonus}
      />

      {(state.phase === "roundOver" || state.phase === "sessionOver") && (
        <GameOverModal
          phase={state.phase}
          summary={state.lastRoundSummary}
          players={state.players}
          winnerId={state.winnerId}
          isHost={isHost}
          onContinue={onStartRound}
        />
      )}

      <ScoreBoard players={state.players} myId={myId} open={showScores} onClose={() => setShowScores(false)} />
    </div>
  );
}
