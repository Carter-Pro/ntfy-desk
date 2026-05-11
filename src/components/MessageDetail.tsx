import { Trash2, CheckCircle } from "lucide-react";
import type { Message } from "../types";

interface Props {
  message: Message;
  onDelete: () => void;
  onMarkRead: () => void;
}

function MessageDetail({ message, onDelete, onMarkRead }: Props) {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-[20px] font-semibold mb-1">
          {message.title || "(no title)"}
        </h2>
        {message.timestamp && (
          <p className="text-[12px] text-[#999]">
            {new Date(message.timestamp).toLocaleString()}
          </p>
        )}
        <p className="text-[12px] text-[#999]">
          Received: {new Date(message.received_at).toLocaleString()}
        </p>
      </div>

      {message.body && (
        <div className="py-2">
          <p className="text-[14px] text-[#e0e0e0] whitespace-pre-wrap leading-relaxed">
            {message.body}
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-4 border-t border-white/[0.08]">
        <button
          data-testid="delete-message-btn"
          onClick={onDelete}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#c50f1f] hover:bg-[#a00d1a] text-white text-sm rounded-lg transition-colors"
        >
          <Trash2 size={14} />
          Delete
        </button>
        {!message.is_read && (
          <button
            data-testid="mark-read-btn"
            onClick={onMarkRead}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm rounded-lg transition-colors"
          >
            <CheckCircle size={14} />
            Mark Read
          </button>
        )}
      </div>
    </div>
  );
}

export default MessageDetail;
