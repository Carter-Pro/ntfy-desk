import { useEffect, useRef, useState } from "react";
import {
  Trash2,
  Plus,
  X,
  Bell,
  BellOff,
  MonitorSmartphone,
  ServerIcon,
  Volume2,
  Clock3,
  CalendarDays,
} from "lucide-react";
import { useStore } from "../store";

/* ─── Toggle component ─────────────────────────────── */
interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
  testId?: string;
}
function Toggle({ checked, onChange, id, testId }: ToggleProps) {
  return (
    <label className="toggle-root" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        data-testid={testId}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="toggle-input"
      />
      <span className="toggle-track" />
      <span className="toggle-thumb" />
    </label>
  );
}

/* ─── Section wrapper ──────────────────────────────── */
function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#0078d4]">{icon}</span>
        <h2 className="text-[13px] font-semibold text-[#bbb] uppercase tracking-widest">
          {title}
        </h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

/* ─── Setting row ──────────────────────────────────── */
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 bg-[#252525] border border-white/[0.07] rounded-xl hover:border-white/[0.12] transition-colors">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-[13px] text-[#e0e0e0] font-medium">{label}</p>
        {description && (
          <p className="text-[11px] text-[#666] mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─── Main Settings component ──────────────────────── */
function Settings() {
  const {
    subscriptions,
    settings,
    addSubscription,
    removeSubscription,
    updateSetting,
  } = useStore();

  const [showDialog, setShowDialog] = useState(false);
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Expose for E2E – open dialog programmatically
  useEffect(() => {
    (window as any).__openAddDialog = () => setShowDialog(true);
  }, []);

  useEffect(() => {
    if (!showDialog) return;
    // Auto-focus URL input
    setTimeout(() => urlInputRef.current?.focus(), 50);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDialog(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showDialog]);

  const handleAdd = async () => {
    if (!url.trim() || !topic.trim()) return;
    await addSubscription(url.trim(), topic.trim());
    setUrl("");
    setTopic("");
    setShowDialog(false);
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-6">
      <h1 className="text-[20px] font-semibold mb-6 text-white">Settings</h1>

      {/* ══ Subscriptions ══ */}
      <Section icon={<ServerIcon size={14} strokeWidth={2.2} />} title="Subscriptions">
        {/* List */}
        {subscriptions.length === 0 ? (
          <div className="px-4 py-5 bg-[#252525] border border-dashed border-white/[0.08] rounded-xl text-center">
            <p className="text-[12px] text-[#555]">No subscriptions configured.</p>
          </div>
        ) : (
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center gap-3 px-4 py-3 bg-[#252525] border border-white/[0.07] rounded-xl hover:border-white/[0.12] transition-colors group"
            >
              {/* Status dot */}
              {sub.is_active ? (
                <span className="status-dot-connected shrink-0" />
              ) : (
                <span className="status-dot-disconnected shrink-0" />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#e0e0e0] truncate">
                  {sub.topic}
                </p>
                <p className="text-[11px] text-[#555] truncate mt-0.5">{sub.url}</p>
              </div>

              {/* Status badge */}
              <span
                className={`chip shrink-0 ${sub.is_active ? "chip-green" : "chip-red"}`}
              >
                {sub.is_active ? "Active" : "Offline"}
              </span>

              {/* Delete */}
              <button
                onClick={() => sub.id !== null && removeSubscription(sub.id)}
                title="Remove subscription"
                className="p-1.5 rounded-lg text-[#555] hover:text-[#ff6b6b] hover:bg-[#c50f1f]/15 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>
          ))
        )}

        {/* Add button */}
        <button
          data-testid="add-subscription-btn"
          onClick={() => setShowDialog(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-[#0078d4]/40 hover:border-[#0078d4] hover:bg-[#0078d4]/08 rounded-xl text-[#0078d4] text-[13px] font-medium transition-all"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Subscription
        </button>
      </Section>

      {/* ══ Do Not Disturb ══ */}
      <Section icon={<BellOff size={14} strokeWidth={2.2} />} title="Do Not Disturb">
        <SettingRow
          label="Enable DND"
          description="Silence all notifications during the set time window."
        >
          <Toggle
            id="dnd-toggle"
            testId="dnd-toggle"
            checked={settings.dnd_enabled}
            onChange={(v) => updateSetting("dnd_enabled", String(v))}
          />
        </SettingRow>

        {settings.dnd_enabled && (
          <div className="grid grid-cols-2 gap-2 px-4 py-3.5 bg-[#252525] border border-white/[0.07] rounded-xl fade-in">
            <div>
              <label className="flex items-center gap-1.5 text-[11px] text-[#666] mb-1.5">
                <Clock3 size={10} strokeWidth={2} />
                Start time
              </label>
              <input
                type="time"
                value={settings.dnd_start}
                onChange={(e) => updateSetting("dnd_start", e.target.value)}
                className="input-field py-2 text-[13px]"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-[11px] text-[#666] mb-1.5">
                <Clock3 size={10} strokeWidth={2} />
                End time
              </label>
              <input
                type="time"
                value={settings.dnd_end}
                onChange={(e) => updateSetting("dnd_end", e.target.value)}
                className="input-field py-2 text-[13px]"
              />
            </div>
          </div>
        )}
      </Section>

      {/* ══ Notifications ══ */}
      <Section icon={<Bell size={14} strokeWidth={2.2} />} title="Notifications">
        <div className="px-4 py-3.5 bg-[#252525] border border-white/[0.07] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-[13px] font-medium text-[#e0e0e0]">
              <Volume2 size={14} strokeWidth={2} className="text-[#0078d4]" />
              Alert volume
            </label>
            <span className="chip chip-blue text-[11px]">
              {settings.notification_volume}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.notification_volume}
            onChange={(e) => updateSetting("notification_volume", e.target.value)}
            className="w-full"
            style={{
              background: `linear-gradient(to right, #0078d4 ${settings.notification_volume}%, rgba(255,255,255,0.1) ${settings.notification_volume}%)`,
            }}
          />
          <div className="flex justify-between text-[10px] text-[#555] mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </Section>

      {/* ══ Application ══ */}
      <Section icon={<MonitorSmartphone size={14} strokeWidth={2.2} />} title="Application">
        <div className="px-4 py-3.5 bg-[#252525] border border-white/[0.07] rounded-xl">
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#e0e0e0] mb-2">
            <CalendarDays size={14} strokeWidth={2} className="text-[#0078d4]" />
            Message retention
          </label>
          <p className="text-[11px] text-[#666] mb-3">
            Automatically delete messages older than this many days.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="365"
              value={settings.message_retention_days}
              onChange={(e) => updateSetting("message_retention_days", e.target.value)}
              className="input-field w-20 text-center py-2 text-[13px]"
            />
            <span className="text-[13px] text-[#666]">days</span>
          </div>
        </div>

        <SettingRow
          label="Run on startup"
          description="Launch ntfy desk automatically when you log in."
        >
          <Toggle
            id="startup-run"
            checked={settings.startup_run}
            onChange={(v) => updateSetting("startup_run", String(v))}
          />
        </SettingRow>

        <SettingRow
          label="Minimize to tray"
          description="Keep ntfy desk running in the system tray when closed."
        >
          <Toggle
            id="minimize-to-tray"
            checked={settings.minimize_to_tray}
            onChange={(v) => updateSetting("minimize_to_tray", String(v))}
          />
        </SettingRow>
      </Section>

      {/* ══ Add Subscription Dialog ══ */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass dialog-enter rounded-2xl p-6 w-[400px] shadow-2xl shadow-black/60">
            {/* Dialog header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0078d4]/20 border border-[#0078d4]/30 flex items-center justify-center">
                  <ServerIcon size={15} className="text-[#0078d4]" strokeWidth={2} />
                </div>
                <h3 className="text-[15px] font-semibold text-white">New Subscription</h3>
              </div>
              <button
                onClick={() => setShowDialog(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#666] hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Fields */}
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] text-[#666] mb-1.5 font-medium uppercase tracking-wide">
                  Server URL
                </label>
                <input
                  ref={urlInputRef}
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  data-testid="sub-url-input"
                  placeholder="ntfy server URL (e.g. https://ntfy.sh/mytopic)"
                  className="input-field"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#666] mb-1.5 font-medium uppercase tracking-wide">
                  Topic name
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  data-testid="sub-topic-input"
                  placeholder="Topic name"
                  className="input-field"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                data-testid="sub-add-btn"
                onClick={handleAdd}
                disabled={!url.trim() || !topic.trim()}
                className="flex-1 py-2.5 bg-[#0078d4] hover:bg-[#005a9e] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-xl transition-all shadow-lg shadow-[#0078d4]/20"
              >
                Add
              </button>
              <button
                data-testid="sub-cancel-btn"
                onClick={() => setShowDialog(false)}
                className="px-4 py-2.5 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] text-[#ccc] text-[13px] font-medium rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
