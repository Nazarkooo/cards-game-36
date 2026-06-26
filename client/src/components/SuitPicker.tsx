import type { Suit } from "../shared";
import { SUIT_SYMBOLS, SUITS } from "../shared";

interface Props {
  open: boolean;
  onPick: (suit: Suit) => void;
  onCancel: () => void;
}

export function SuitPicker({ open, onPick, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>Оберіть масть</h2>
        <div className="suit-grid">
          {SUITS.map((s) => (
            <button key={s} className={`suit-btn ${s === "H" || s === "D" ? "suit-red" : "suit-black"}`} onClick={() => onPick(s)}>
              {SUIT_SYMBOLS[s]}
            </button>
          ))}
        </div>
        <button className="btn btn-secondary" onClick={onCancel}>
          Відмінити
        </button>
      </div>
    </div>
  );
}
