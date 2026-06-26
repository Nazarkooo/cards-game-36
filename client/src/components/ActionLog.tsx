import type { ActionLogEntry } from "../shared";

interface Props {
  log: ActionLogEntry[];
}

export function ActionLog({ log }: Props) {
  const recent = log.slice(-6).reverse();
  return (
    <div className="action-log">
      {recent.map((entry) => (
        <div key={entry.id} className="action-log-entry">
          {entry.text}
        </div>
      ))}
    </div>
  );
}
