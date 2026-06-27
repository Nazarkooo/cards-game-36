import { useMemo, useState } from "react";
import type { PublicGameState, Suit } from "../shared";
import { isLegalCoverHint, SUIT_SYMBOLS, SUITS } from "../shared";
import { Hand, useCardSelection } from "../components/Hand";
import { TableStack } from "../components/TableStack";
import { PlayersRail } from "../components/PlayersRail";
import { ScoreBoard } from "../components/ScoreBoard";
import { SuitPicker } from "../components/SuitPicker";
import { JackBonusModal } from "../components/JackBonusModal";
import { ActionLog } from "../components/ActionLog";
import { GameOverModal } from "../components/GameOverModal";
import { ChatPanel } from "../components/ChatPanel";
import { ActiveSuitBadge } from "../components/ActiveSuitBadge";

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
  onSendChat: (text: string) => void;
  onDeclareSuit: (suit: Suit) => void;
}

function ChatFab({ unread, onClick }: { unread: number; onClick: () => void }) {
  return (
    <button className="chat-fab" onClick={onClick}>
      💬
      {unread > 0 && <span className="chat-fab-badge">{unread > 9 ? "9+" : unread}</span>}
    </button>
  );
}

export function GameTable({
  state,
  myId,
  onStartRound,
  onPlayCards,
  onDrawCard,
  onPassTurn,
  onCallBridge,
  onChooseJackBonus,
  onLeaveRoom,
  onSendChat,
  onDeclareSuit,
}: Props) {
  const { selectedIds, toggle, clear } = useCardSelection();
  const [showScores, setShowScores] = useState(false);
  const [pendingSuitPick, setPendingSuitPick] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [lastSeenChatCount, setLastSeenChatCount] = useState(0);
  const unreadChat = Math.max(0, state.chat.length - lastSeenChatCount);

  const openChat = () => {
    setChatOpen(true);
    setLastSeenChatCount(state.chat.length);
  };
  const closeChat = () => {
    setChatOpen(false);
    setLastSeenChatCount(state.chat.length);
  };

  const isMyTurn = state.turnPlayerId === myId;
  const isHost = state.hostId === myId;
  const hand = state.you.hand;

  const selectedRank = selectedIds.length ? hand.find((c) => c.id === selectedIds[0])?.rank : null;

  // the table started with a dealt Jack — its suit hasn't been declared yet
  const needsSuitDeclare = isMyTurn && state.phase === "playing" && state.activeSuit === null;

  const canDraw = isMyTurn && state.phase === "playing" && !state.awaitingJackBonusFrom && !needsSuitDeclare;
  // skipping without drawing is only allowed on the very first move of the round (the 4-card starter's dealt card already counts as theirs)
  const canPass = canDraw && state.canPassWithoutDraw && state.pendingEffect?.type !== "draw7" && state.topCard?.rank !== "6";

  const hasAnyLegal = useMemo(() => {
    if (!state.topCard || !state.activeSuit) return false;
    return hand.some((c) => isLegalCoverHint(c, state.topCard!.rank, state.activeSuit!));
  }, [hand, state.topCard, state.activeSuit]);

  const selectionIsLegal = useMemo(() => {
    if (!selectedIds.length || !state.topCard) return false;
    if (selectedRank === "J") return true;
    if (!state.activeSuit) return false;
    if (state.pendingEffect?.type === "draw7") return selectedRank === "7";
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
        <ChatFab unread={unreadChat} onClick={openChat} />
        <ChatPanel messages={state.chat} myId={myId} open={chatOpen} onClose={closeChat} onSend={onSendChat} />
      </div>
    );
  }

  return (
    <div className="game-table">
      <ActiveSuitBadge suit={state.activeSuit} />

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
        {isMyTurn && !needsSuitDeclare && !hasAnyLegal && !state.pendingEffect && (
          <span className="hint-text">
            {state.canPassWithoutDraw ? " — немає ходу, можете пропустити без добору або взяти карту" : " — немає ходу, візьміть карту"}
          </span>
        )}
        {!isMyTurn && state.activeSuit === null && (
          <span className="hint-text"> — очікуємо вибір масті</span>
        )}
      </div>

      {needsSuitDeclare && (
        <div className="declare-suit-banner">
          <p>Стіл відкрито Валетом — оберіть масть, або зіграйте свого Валета з руки</p>
          <div className="declare-suit-options">
            {SUITS.map((s) => (
              <button
                key={s}
                className={`suit-btn ${s === "H" || s === "D" ? "suit-red" : "suit-black"}`}
                onClick={() => onDeclareSuit(s)}
              >
                {SUIT_SYMBOLS[s]}
              </button>
            ))}
          </div>
        </div>
      )}

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

      <ChatFab unread={unreadChat} onClick={openChat} />
      <ChatPanel messages={state.chat} myId={myId} open={chatOpen} onClose={closeChat} onSend={onSendChat} />
    </div>
  );
}
