import { useGame } from "./hooks/useGame";
import { Home } from "./pages/Home";
import { GameTable } from "./pages/GameTable";

export default function App() {
  const {
    connected,
    reconnecting,
    myId,
    state,
    error,
    createRoom,
    joinRoom,
    startRound,
    playCards,
    drawCard,
    passTurn,
    callBridge,
    chooseJackBonus,
    leaveRoom,
    sendChat,
    declareSuit,
    rejoinSession,
  } = useGame();

  return (
    <>
      {error && <div className="toast-error">{error}</div>}
      {reconnecting && !state ? (
        <div className="home-screen">
          <p className="status-warn">Відновлюємо вашу гру...</p>
        </div>
      ) : state && myId ? (
        <GameTable
          state={state}
          myId={myId}
          onStartRound={startRound}
          onPlayCards={playCards}
          onDrawCard={drawCard}
          onPassTurn={passTurn}
          onCallBridge={callBridge}
          onChooseJackBonus={chooseJackBonus}
          onLeaveRoom={leaveRoom}
          onSendChat={sendChat}
          onDeclareSuit={declareSuit}
          onRejoinSession={rejoinSession}
        />
      ) : (
        <Home connected={connected} onCreate={createRoom} onJoin={joinRoom} />
      )}
    </>
  );
}
