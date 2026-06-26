import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../shared";

interface Props {
  messages: ChatMessage[];
  myId: string;
  open: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
}

export function ChatPanel({ messages, myId, open, onClose, onSend }: Props) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  const handleSend = () => {
    const clean = text.trim();
    if (!clean) return;
    onSend(clean);
    setText("");
  };

  return (
    <>
      {open && <div className="chat-overlay" onClick={onClose} />}
      <aside className={`chat-panel ${open ? "chat-panel-open" : ""}`}>
        <div className="chat-header">
          <span>💬 Чат</span>
          <button className="btn btn-link" onClick={onClose}>
            Закрити
          </button>
        </div>
        <div className="chat-messages" ref={listRef}>
          {messages.length === 0 && <p className="chat-empty">Поки що тихо... напишіть щось!</p>}
          {messages.map((m) => (
            <div key={m.id} className={`chat-msg ${m.playerId === myId ? "chat-msg-me" : ""}`}>
              <span className="chat-msg-name">{m.name}</span>
              <span className="chat-msg-text">{m.text}</span>
            </div>
          ))}
        </div>
        <div className="chat-input-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Повідомлення..."
            maxLength={280}
          />
          <button className="btn btn-primary chat-send-btn" onClick={handleSend} disabled={!text.trim()}>
            ➤
          </button>
        </div>
      </aside>
    </>
  );
}
