import type { Server, Socket } from "socket.io";
import { applyCallBridge, applyChooseJackBonus, applyDeclareSuit, applyDrawCard, applyPassTurn, applyPlayCards, applySendChat, startRound, toPublicState } from "./gameEngine.js";
import { createRoom, deleteRoomIfEmpty, getRoom, joinRoom } from "./rooms.js";
import type { ClientToServerEvents, ServerToClientEvents } from "./shared.js";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function broadcast(io: Server<ClientToServerEvents, ServerToClientEvents>, roomId: string) {
  const state = getRoom(roomId);
  if (!state) return;
  for (const player of state.players.values()) {
    if (!player.socketId) continue;
    io.to(player.socketId).emit("game_state", toPublicState(state, player.id));
  }
}

function sanitizeId(raw: string): string {
  return (raw || "").trim().slice(0, 64);
}

export function registerSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>, socket: AppSocket) {
  let joinedRoomId: string | null = null;
  let playerId: string | null = null;

  socket.on("create_room", ({ name, playerId: clientId }) => {
    const cleanName = (name || "Гравець").trim().slice(0, 20) || "Гравець";
    const id = sanitizeId(clientId);
    if (!id) return;
    playerId = id;
    const state = createRoom(playerId, cleanName);
    const player = state.players.get(playerId)!;
    player.socketId = socket.id;
    joinedRoomId = state.roomId;
    socket.join(state.roomId);
    socket.emit("room_created", { roomId: state.roomId });
    broadcast(io, state.roomId);
  });

  socket.on("join_room", ({ roomId, name, playerId: clientId }) => {
    const cleanName = (name || "Гравець").trim().slice(0, 20) || "Гравець";
    const id = sanitizeId(clientId);
    if (!id) return;
    const state = joinRoom(roomId, id, cleanName);
    if (!state) {
      socket.emit("error_msg", { message: "Кімнату не знайдено або вона заповнена (максимум 5)" });
      return;
    }
    playerId = id;
    const player = state.players.get(playerId)!;
    player.socketId = socket.id;
    player.connected = true;
    joinedRoomId = state.roomId;
    socket.join(state.roomId);
    broadcast(io, state.roomId);
  });

  socket.on("start_round", () => {
    if (!joinedRoomId || !playerId) return;
    const state = getRoom(joinedRoomId);
    if (!state) return;
    if (state.hostId !== playerId) {
      socket.emit("error_msg", { message: "Тільки хост може почати гру" });
      return;
    }
    const active = [...state.players.values()].filter((p) => !p.eliminated);
    if (active.length < 2) {
      socket.emit("error_msg", { message: "Потрібно щонайменше 2 гравці" });
      return;
    }
    if (active.length > 5) {
      socket.emit("error_msg", { message: "Максимум 5 гравців" });
      return;
    }
    if (state.phase === "sessionOver") {
      socket.emit("error_msg", { message: "Сесія завершена" });
      return;
    }
    startRound(state);
    broadcast(io, state.roomId);
  });

  socket.on("play_cards", ({ cardIds, declareSuit }) => {
    if (!joinedRoomId || !playerId) return;
    const state = getRoom(joinedRoomId);
    if (!state) return;
    const result = applyPlayCards(state, playerId, cardIds, declareSuit);
    if (!result.ok) {
      socket.emit("error_msg", { message: result.error });
      return;
    }
    broadcast(io, state.roomId);
  });

  socket.on("draw_card", () => {
    if (!joinedRoomId || !playerId) return;
    const state = getRoom(joinedRoomId);
    if (!state) return;
    const result = applyDrawCard(state, playerId);
    if (!result.ok) {
      socket.emit("error_msg", { message: result.error });
      return;
    }
    broadcast(io, state.roomId);
  });

  socket.on("call_bridge", () => {
    if (!joinedRoomId || !playerId) return;
    const state = getRoom(joinedRoomId);
    if (!state) return;
    const result = applyCallBridge(state, playerId);
    if (!result.ok) {
      socket.emit("error_msg", { message: result.error });
      return;
    }
    broadcast(io, state.roomId);
  });

  socket.on("choose_jack_bonus", ({ mode }) => {
    if (!joinedRoomId || !playerId) return;
    const state = getRoom(joinedRoomId);
    if (!state) return;
    const result = applyChooseJackBonus(state, playerId, mode);
    if (!result.ok) {
      socket.emit("error_msg", { message: result.error });
      return;
    }
    broadcast(io, state.roomId);
  });

  socket.on("leave_room", () => {
    handleDisconnect();
  });

  socket.on("disconnect", () => {
    handleDisconnect();
  });

  function handleDisconnect() {
    if (!joinedRoomId || !playerId) return;
    const roomId = joinedRoomId;
    const id = playerId;
    const state = getRoom(roomId);
    if (state) {
      const player = state.players.get(id);
      // only mark disconnected if this socket is still the one on record
      // (a fast reload may have already re-registered a new socket for this player)
      if (player && player.socketId === socket.id) {
        player.connected = false;
        broadcast(io, roomId);
      }
      // grace period: give the player a chance to reconnect (page reload) before cleanup
      setTimeout(() => {
        const stillThere = getRoom(roomId);
        if (stillThere) deleteRoomIfEmpty(roomId);
      }, 30000);
    }
    joinedRoomId = null;
    playerId = null;
  }

  socket.on("declare_suit", ({ suit }) => {
    if (!joinedRoomId || !playerId) return;
    const state = getRoom(joinedRoomId);
    if (!state) return;
    const result = applyDeclareSuit(state, playerId, suit);
    if (!result.ok) {
      socket.emit("error_msg", { message: result.error });
      return;
    }
    broadcast(io, state.roomId);
  });

  socket.on("send_chat", ({ text }) => {
    if (!joinedRoomId || !playerId) return;
    const state = getRoom(joinedRoomId);
    if (!state) return;
    const result = applySendChat(state, playerId, text);
    if (!result.ok) {
      socket.emit("error_msg", { message: result.error });
      return;
    }
    broadcast(io, state.roomId);
  });

  socket.on("pass_turn", () => {
    if (!joinedRoomId || !playerId) return;
    const state = getRoom(joinedRoomId);
    if (!state) return;
    const result = applyPassTurn(state, playerId);
    if (!result.ok) {
      socket.emit("error_msg", { message: result.error });
      return;
    }
    broadcast(io, state.roomId);
  });
}
