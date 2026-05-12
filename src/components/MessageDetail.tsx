import { Trash2, CheckCircle, CalendarIcon, ServerIcon } from "lucide-react";
import type { Message } from "../types";
import { useStore } from "../store";

interface Props {
  message: Message;
  onDelete: () => void;
  onMarkRead: () => void;
}

function formatFullDate(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageDetail({ message, onDelete, onMarkRead }: Props) {
  const subscriptions = useStore((s) => s.subscriptions);
  const sub = subscriptions.find((s) => s.id === message.subscription_id);

  return (
    <div className="flex flex-col h-full fade-in">
      {/* ── Header block ── */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.07]">
        {/* Unread badge */}
        {!message.is_read && (
          <div className="mb-2">
            <span className="chip chip-blue text-[10px]">● Unread</span>
          </div>
        )}

        {/* Title */}
        <h2 className="text-[18px] font-semibold text-white leading-snug mb-3">
          {message.title || "(no title)"}
        </h2>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {/* Timestamp */}
          <span className="flex items-center gap-1.5 text-[11px] text-[#666]">
            <CalendarIcon size={11} strokeWidth={2} />
            Received: {formatFullDate(message.received_at)}
          </span>

          {/* Source subscription */}
          {sub && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#666]">
              <ServerIcon size={11} strokeWidth={2} />
              <span className="chip chip-blue py-0 text-[10px]">{sub.topic}</span>
            </span>
          )}

          {/* Message timestamp (if different from received) */}
          {message.timestamp && message.timestamp !== message.received_at && (
            <span className="text-[11px] text-[#555]">
              Sent: {formatFullDate(message.timestamp)}
            </span>
          )}
        </div>
      </div>

      {/* ── Message body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {message.body ? (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-4">
            <p className="text-[13px] text-[#d4d4d4] whitespace-pre-wrap leading-relaxed">
              {message.body}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-[#555] italic">No message body.</p>
        )}
      </div>

      {/* ── Action bar ── */}
      <div className="px-5 py-3.5 border-t border-white/[0.07] flex items-center gap-2 shrink-0">
        <button
          data-testid="delete-message-btn"
          onClick={onDelete}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#c50f1f]/15 hover:bg-[#c50f1f]/25 border border-[#c50f1f]/30 hover:border-[#c50f1f]/50 text-[#ff6b6b] text-[12px] font-medium rounded-lg transition-all"
        >
          <Trash2 size={13} strokeWidth={2} />
          Delete
        </button>

        {!message.is_read && (
          <button
            data-testid="mark-read-btn"
            onClick={onMarkRead}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-[#ccc] text-[12px] font-medium rounded-lg transition-all"
          >
            <CheckCircle size={13} strokeWidth={2} />
            Mark Read
          </button>
        )}

        {message.is_read && (
          <span className="flex items-center gap-1.5 text-[11px] text-[#555]">
            <CheckCircle size={12} strokeWidth={2} className="text-[#107c10]" />
            Read
          </span>
        )}
      </div>
    </div>
  );
}

export default MessageDetail;
