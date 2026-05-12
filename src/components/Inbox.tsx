import { useState } from "react";
import { InboxIcon, MailOpenIcon, ClockIcon } from "lucide-react";
import { useStore } from "../store";
import MessageDetail from "./MessageDetail";
import type { Message } from "../types";

function formatRelativeTime(ts: string | null): string {
  if (!ts) return "";
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getPriorityChip(priority?: string | null) {
  if (!priority) return null;
  const map: Record<string, { label: string; cls: string }> = {
    urgent: { label: "Urgent", cls: "chip chip-red" },
    high:   { label: "High",   cls: "chip chip-red" },
    low:    { label: "Low",    cls: "chip chip-gray" },
    min:    { label: "Min",    cls: "chip chip-gray" },
  };
  const entry = map[priority.toLowerCase()];
  if (!entry) return null;
  return <span className={entry.cls}>{entry.label}</span>;
}

function Inbox() {
  const { messages, subscriptions, selectedSubscriptionId, markRead, deleteMessage } =
    useStore();
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);

  const selectedMsg =
    selectedMessageId !== null
      ? (messages.find((m) => m.id === selectedMessageId) ?? null)
      : null;

  const selectedSub = subscriptions.find((s) => s.id === selectedSubscriptionId);
  const unreadCount = messages.filter((m) => !m.is_read).length;

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
    <div className="flex h-full min-h-0">

      {/* ── Message List ── */}
      <div className="w-[48%] flex flex-col border-r border-white/[0.07] min-h-0">
        {/* List header */}
        <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-2 shrink-0">
          <InboxIcon size={15} className="text-[#0078d4]" strokeWidth={2} />
          <h2 className="text-[14px] font-semibold text-white">
            {selectedSub ? selectedSub.topic : "Inbox"}
          </h2>
          {unreadCount > 0 && (
            <span className="ml-1 chip chip-blue text-[10px]">
              {unreadCount} unread
            </span>
          )}
          {messages.length > 0 && (
            <span className="ml-auto text-[11px] text-[#555]">
              {messages.length} messages
            </span>
          )}
        </div>

        {/* List body */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center fade-in">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
                <InboxIcon size={24} className="text-[#444]" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] text-[#555] leading-relaxed">
                  {selectedSubscriptionId === null
                    ? "Select a subscription to view messages."
                    : "No messages for this subscription."}
                </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {messages.map((msg) => {
                const isSelected = selectedMessageId === msg.id;
                const isUnread = !msg.is_read;
                return (
                  <button
                    key={msg.id ?? `msg-${msg.received_at}`}
                    data-testid="message-item"
                    onClick={() => handleSelect(msg)}
                    className={[
                      "w-full text-left px-4 py-3.5 group transition-all duration-150",
                      isUnread ? "msg-unread" : "msg-read",
                      isSelected
                        ? "bg-[#0078d4]/10"
                        : "hover:bg-white/[0.04]",
                    ].join(" ")}
                  >
                    {/* Row 1: title + time */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0078d4] shrink-0 mt-[3px]" />
                        )}
                        <span
                          className={`text-[13px] leading-snug truncate ${
                            isUnread ? "font-semibold text-white" : "font-normal text-[#aaa]"
                          }`}
                        >
                          {msg.title || "(no title)"}
                        </span>
                      </div>
                      <time className="text-[10px] text-[#555] whitespace-nowrap shrink-0 mt-0.5 flex items-center gap-1">
                        <ClockIcon size={9} strokeWidth={2} />
                        {formatRelativeTime(msg.received_at)}
                      </time>
                    </div>

                    {/* Row 2: body preview */}
                    {msg.body && (
                      <p className="text-[11px] text-[#666] line-clamp-2 leading-relaxed pl-3">
                        {msg.body}
                      </p>
                    )}

                    {/* Row 3: badges */}
                    {((msg as any).priority) && (
                      <div className="flex items-center gap-1.5 mt-2 pl-3">
                        {getPriorityChip((msg as any).priority)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Message Detail ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
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
          <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center fade-in">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
              <MailOpenIcon size={24} className="text-[#444]" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] text-[#555] leading-relaxed">
              Select a message to view details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Inbox;
