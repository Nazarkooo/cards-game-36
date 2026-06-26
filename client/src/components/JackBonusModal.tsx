interface Props {
  open: boolean;
  amount: number;
  onChoose: (mode: "all" | "self") => void;
}

export function JackBonusModal({ open, amount, onChoose }: Props) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>Ви завершили раунд Валетом! 🎉</h2>
        <p>Оберіть бонус:</p>
        <div className="bonus-choice">
          <button className="btn btn-primary" onClick={() => onChoose("all")}>
            Усім іншим +{amount} очок
          </button>
          <button className="btn btn-danger" onClick={() => onChoose("self")}>
            Собі -{amount} очок
          </button>
        </div>
      </div>
    </div>
  );
}
