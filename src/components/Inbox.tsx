import { useState } from "react";
import { Inbox as InboxIcon } from "lucide-react";
import { useStore } from "../store";
import MessageDetail from "./MessageDetail";
import type { Message } from "../types";

function formatTime(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
}

function Inbox() {
  const { messages, selectedSubscriptionId, markRead, deleteMessage } =
    useStore();
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(
    null,
  );

  const selectedMsg =
    selectedMessageId !== null
      ? (messages.find((m) => m.id === selectedMessageId) ?? null)
      : null;

  const handleSelect = (msg: Message) => {
    setSelectedMessageId(msg.id);
    if (!msg.is_read && msg.id !== null) {
      markRead(msg.id);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteMessage(id);
    if (selectedMessageId === id) {
      setSelectedMessageId(null);
    }
  };

  return (
    <div className="flex h-full gap-0">
      {/* Message List */}
      <div className="w-1/2 border-r border-white/[0.08] overflow-y-auto">
        <h2 className="text-[16px] font-semibold px-4 py-3 border-b border-white/[0.08]">
          Inbox
        </h2>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <InboxIcon size={40} className="text-[#999] opacity-40 mb-3" />
            <p className="text-sm text-text-tertiary">
              {selectedSubscriptionId === null
                ? "Select a subscription to view messages."
                : "No messages for this subscription."}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <button
              key={msg.id ?? `msg-${msg.received_at}`}
              data-testid="message-item"
              onClick={() => handleSelect(msg)}
              className={`w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.08] transition-colors ${
                selectedMessageId === msg.id ? "bg-white/[0.06]" : ""
              } ${!msg.is_read ? "border-l-[3px] border-l-[#0078d4]" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-1.5 min-w-0">
                  {!msg.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#0078d4] shrink-0 mt-1.5" />}
                  <span
                    className={`text-[14px] ${
                      msg.is_read ? "text-[#999]" : "text-white font-semibold"
                    } line-clamp-1`}
                  >
                    {msg.title || "(no title)"}
                  </span>
                </span>
                <time className="text-[11px] text-[#999] whitespace-nowrap shrink-0">
                  {formatTime(msg.received_at)}
                </time>
              </div>
              {msg.body && (
                <p className="text-[12px] text-[#999] mt-1 line-clamp-2">
                  {msg.body}
                </p>
              )}
            </button>
          ))
        )}
      </div>

      {/* Message Detail Panel */}
      <div className="w-1/2 overflow-y-auto">
        {selectedMsg ? (
          <MessageDetail
            message={selectedMsg}
            onDelete={() => {
              if (selectedMsg.id !== null) handleDelete(selectedMsg.id);
            }}
            onMarkRead={() => {
              if (selectedMsg.id !== null) markRead(selectedMsg.id);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <InboxIcon size={40} className="text-[#999] opacity-40 mb-3" />
            <p className="text-sm text-text-tertiary">
              Select a message to view details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Inbox;
