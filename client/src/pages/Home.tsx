import { useState } from "react";

interface Props {
  connected: boolean;
  onCreate: (name: string) => void;
  onJoin: (roomId: string, name: string) => void;
}

export function Home({ connected, onCreate, onJoin }: Props) {
  const [name, setName] = useState(() => localStorage.getItem("cards-game-name") ?? "");
  const [roomCode, setRoomCode] = useState("");

  const persistName = (n: string) => {
    setName(n);
    localStorage.setItem("cards-game-name", n);
  };

  const canSubmit = name.trim().length > 0 && connected;

  return (
    <div className="home-screen">
      <div className="home-card">
        <h1>🃏 Карти 36</h1>
        <p className="subtitle">Дурень + Уно за вашими правилами</p>

        <label className="field">
          <span>Ваше ім'я</span>
          <input
            value={name}
            onChange={(e) => persistName(e.target.value)}
            placeholder="Андрій"
            maxLength={20}
            autoFocus
          />
        </label>

        <button className="btn btn-primary" disabled={!canSubmit} onClick={() => onCreate(name.trim())}>
          Створити кімнату
        </button>

        <div className="divider">або</div>

        <label className="field">
          <span>Код кімнати</span>
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="XXXX"
            maxLength={4}
          />
        </label>
        <button
          className="btn btn-secondary"
          disabled={!canSubmit || roomCode.trim().length === 0}
          onClick={() => onJoin(roomCode.trim(), name.trim())}
        >
          Приєднатись
        </button>

        {!connected && <p className="status-warn">Підключення до сервера...</p>}
      </div>
    </div>
  );
}
