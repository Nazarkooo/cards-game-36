import { RoomState, addPlayer, createRoom as createRoomState } from "./gameEngine.js";

const rooms = new Map<string, RoomState>();
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomId(): string {
  let code = "";
  do {
    code = Array.from({ length: 4 }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join("");
  } while (rooms.has(code));
  return code;
}

export function createRoom(hostId: string, hostName: string): RoomState {
  const roomId = generateRoomId();
  const state = createRoomState(roomId, hostId, hostName);
  rooms.set(roomId, state);
  return state;
}

export function getRoom(roomId: string): RoomState | undefined {
  return rooms.get(roomId.toUpperCase());
}

export function joinRoom(roomId: string, playerId: string, name: string): RoomState | null {
  const state = getRoom(roomId);
  if (!state) return null;
  if (state.players.size >= 5 && !state.players.has(playerId)) return null;
  addPlayer(state, playerId, name);
  return state;
}

export function deleteRoomIfEmpty(roomId: string): void {
  const state = rooms.get(roomId);
  if (!state) return;
  const anyoneConnected = [...state.players.values()].some((p) => p.connected);
  if (!anyoneConnected) rooms.delete(roomId);
}
