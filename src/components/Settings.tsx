import { useEffect, useState } from "react";
import { Trash2, Plus, X } from "lucide-react";
import { useStore } from "../store";

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

  useEffect(() => {
    if (!showDialog) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDialog(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showDialog]);

  const handleAdd = async () => {
    if (!url.trim() || !topic.trim()) return;
    await addSubscription(url.trim(), topic.trim());
    setUrl("");
    setTopic("");
    setShowDialog(false);
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Subscriptions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold">Subscriptions</h2>
          <button
            data-testid="add-subscription-btn"
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-1 px-3 py-2 bg-[#0078d4] hover:bg-[#005a9e] text-white text-sm rounded-lg transition-colors"
          >
            <Plus size={14} /> Add Subscription
          </button>
        </div>
        <div className="space-y-2">
          {subscriptions.length === 0 ? (
            <p className="text-xs text-[#999] py-4">
              No subscriptions configured.
            </p>
          ) : (
            subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${sub.is_active ? "bg-[#107c10]" : "bg-[#c50f1f]"}`}
                    />
                    <span className="text-[14px] font-medium truncate">
                      {sub.topic}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#999] truncate mt-1 pl-4">
                    {sub.url}
                  </p>
                </div>
                <button
                  onClick={() => sub.id !== null && removeSubscription(sub.id)}
                  className="p-2 hover:bg-[#c50f1f]/20 text-[#999] hover:text-[#c50f1f] rounded transition-colors shrink-0 ml-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Dialog */}
        {showDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#2d2d2d] border border-white/[0.08] rounded-lg p-6 w-96 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-semibold">
                  Add Subscription
                </h3>
                <button
                  onClick={() => setShowDialog(false)}
                  className="p-1 hover:bg-white/[0.08] rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                data-testid="sub-url-input"
                placeholder="ntfy server URL (e.g. https://ntfy.sh/mytopic)"
                className="w-full px-3 py-2 bg-[#2d2d2d] border border-white/[0.08] rounded-lg text-white text-sm placeholder-[#999] focus:border-[#0078d4] outline-none mb-3"
              />
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                data-testid="sub-topic-input"
                placeholder="Topic name"
                className="w-full px-3 py-2 bg-[#2d2d2d] border border-white/[0.08] rounded-lg text-white text-sm placeholder-[#999] focus:border-[#0078d4] outline-none mb-6"
              />
              <div className="flex gap-2">
                <button
                  data-testid="sub-add-btn"
                  onClick={handleAdd}
                  disabled={!url.trim() || !topic.trim()}
                  className="flex-1 px-4 py-2 bg-[#0078d4] hover:bg-[#005a9e] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Add
                </button>
                <button
                  data-testid="sub-cancel-btn"
                  onClick={() => setShowDialog(false)}
                  className="flex-1 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Do Not Disturb */}
      <section>
        <h2 className="text-[16px] font-semibold mb-4">Do Not Disturb</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg cursor-pointer">
            <span className="text-[14px]">Enable DND</span>
            <input
              type="checkbox"
              data-testid="dnd-toggle"
              checked={settings.dnd_enabled}
              onChange={(e) =>
                updateSetting("dnd_enabled", String(e.target.checked))
              }
              className="w-4 h-4 cursor-pointer accent-[#0078d4]"
            />
          </label>
          {settings.dnd_enabled && (
            <div className="grid grid-cols-2 gap-3 px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg">
              <div>
                <label className="text-[12px] text-[#999] block mb-1">
                  Start
                </label>
                <input
                  type="time"
                  value={settings.dnd_start}
                  onChange={(e) => updateSetting("dnd_start", e.target.value)}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-white/[0.08] rounded text-white text-sm focus:border-[#0078d4] outline-none"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#999] block mb-1">
                  End
                </label>
                <input
                  type="time"
                  value={settings.dnd_end}
                  onChange={(e) => updateSetting("dnd_end", e.target.value)}
                  className="w-full px-3 py-2 bg-[#2d2d2d] border border-white/[0.08] rounded text-white text-sm focus:border-[#0078d4] outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Notifications */}
      <section>
        <h2 className="text-[16px] font-semibold mb-4">Notifications</h2>
        <div className="px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg">
          <label className="text-[14px] block mb-2">
            Volume ({settings.notification_volume}%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.notification_volume}
            onChange={(e) => updateSetting("notification_volume", e.target.value)}
            className="w-full h-1 bg-white/[0.12] rounded-lg appearance-none cursor-pointer accent-[#0078d4]"
          />
        </div>
      </section>

      {/* Application */}
      <section>
        <h2 className="text-[16px] font-semibold mb-4">Application</h2>
        <div className="space-y-3">
          <div className="px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg">
            <label className="text-[14px] block mb-2">
              Message retention ({settings.message_retention_days} days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.message_retention_days}
              onChange={(e) =>
                updateSetting("message_retention_days", e.target.value)
              }
              className="w-24 px-3 py-2 bg-[#2d2d2d] border border-white/[0.08] rounded text-white text-sm focus:border-[#0078d4] outline-none"
            />
          </div>
          <label className="flex items-center justify-between px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg cursor-pointer">
            <span className="text-[14px]">Run on startup</span>
            <input
              type="checkbox"
              checked={settings.startup_run}
              onChange={(e) =>
                updateSetting("startup_run", String(e.target.checked))
              }
              className="w-4 h-4 cursor-pointer accent-[#0078d4]"
            />
          </label>
          <label className="flex items-center justify-between px-4 py-3 bg-[#2d2d2d] border border-white/[0.08] rounded-lg cursor-pointer">
            <span className="text-[14px]">Minimize to tray</span>
            <input
              type="checkbox"
              checked={settings.minimize_to_tray}
              onChange={(e) =>
                updateSetting("minimize_to_tray", String(e.target.checked))
              }
              className="w-4 h-4 cursor-pointer accent-[#0078d4]"
            />
          </label>
        </div>
      </section>
    </div>
  );
}

export default Settings;
