import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import type { PublicGameState, Suit } from "../shared";

const PLAYER_ID_KEY = "cards-game-player-id";
const SESSION_KEY = "cards-game-session"; // { roomId, name }

function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

function saveSession(roomId: string, name: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId, name }));
}

function loadSession(): { roomId: string; name: string } | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function useGame() {
  const [connected, setConnected] = useState(false);
  const [myId] = useState<string>(() => getOrCreatePlayerId());
  const [state, setState] = useState<PublicGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const session = loadSession();

    const onConnect = () => {
      setConnected(true);
      if (session) {
        setReconnecting(true);
        socket.emit("join_room", { roomId: session.roomId, name: session.name, playerId: myId });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onRoomCreated = (data: { roomId: string }) => setRoomId(data.roomId);
    const onGameState = (s: PublicGameState) => {
      setRoomId(s.roomId);
      setState(s);
      setReconnecting(false);
      const me = s.players.find((p) => p.id === myId);
      if (me) saveSession(s.roomId, me.name);
    };
    const onError = (data: { message: string }) => {
      setReconnecting(false);
      if (session) clearSession(); // stale/invalid session (room gone, etc.)
      setError(data.message);
      if (errorTimer.current) clearTimeout(errorTimer.current);
      errorTimer.current = setTimeout(() => setError(null), 4000);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room_created", onRoomCreated);
    socket.on("game_state", onGameState);
    socket.on("error_msg", onError);

    socket.connect();
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_created", onRoomCreated);
      socket.off("game_state", onGameState);
      socket.off("error_msg", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createRoom = useCallback(
    (name: string) => {
      saveSession("", name);
      socket.emit("create_room", { name, playerId: myId });
    },
    [myId]
  );
  const joinRoom = useCallback(
    (id: string, name: string) => {
      saveSession(id, name);
      socket.emit("join_room", { roomId: id, name, playerId: myId });
    },
    [myId]
  );
  const startRound = useCallback(() => socket.emit("start_round"), []);
  const playCards = useCallback((cardIds: string[], declareSuit?: Suit) => socket.emit("play_cards", { cardIds, declareSuit }), []);
  const drawCard = useCallback(() => socket.emit("draw_card"), []);
  const passTurn = useCallback(() => socket.emit("pass_turn"), []);
  const callBridge = useCallback(() => socket.emit("call_bridge"), []);
  const chooseJackBonus = useCallback((mode: "all" | "self") => socket.emit("choose_jack_bonus", { mode }), []);
  const sendChat = useCallback((text: string) => socket.emit("send_chat", { text }), []);
  const declareSuit = useCallback((suit: Suit) => socket.emit("declare_suit", { suit }), []);
  const leaveRoom = useCallback(() => {
    socket.emit("leave_room");
    clearSession();
    setState(null);
    setRoomId(null);
  }, []);

  return {
    connected,
    reconnecting,
    myId,
    state,
    error,
    roomId,
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
  };
}
