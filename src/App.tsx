import { useEffect } from "react";
import { useStore } from "./store";
import ErrorBoundary from "./ErrorBoundary";
import Inbox from "./components/Inbox";
import Settings from "./components/Settings";
import {
  BellIcon,
  SettingsIcon,
  AlertCircleIcon,
  PlusIcon,
  XIcon,
  ArrowLeftIcon,
} from "lucide-react";

function App() {
  const {
    subscriptions,
    selectedSubscriptionId,
    activeTab,
    error,
    loadSubscriptions,
    loadMessages,
    loadSettings,
    selectSubscription,
    setActiveTab,
  } = useStore();

  useEffect(() => {
    // Expose store for E2E testing
    (window as any).__store = useStore;
    loadSubscriptions();
    loadSettings();
  }, [loadSubscriptions, loadSettings]);

  useEffect(() => {
    if (activeTab === "inbox") {
      loadMessages();
    }
  }, [selectedSubscriptionId, activeTab, loadMessages]);

  const unreadCount = useStore((s) =>
    s.messages.filter((m) => !m.is_read).length
  );

  /* Clicking a subscription auto-switches back to Inbox */
  const handleSubClick = (id: number) => {
    selectSubscription(id);
    if (activeTab !== "inbox") {
      setActiveTab("inbox");
    }
  };

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-[#202020] text-white overflow-hidden">

        {/* ── App Header ── */}
        <header className="glass-header h-[52px] flex items-center px-5 shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0078d4] flex items-center justify-center shadow-lg shadow-[#0078d4]/30">
              <BellIcon size={15} className="text-white" strokeWidth={2.2} />
            </div>
            <h1 className="text-[15px] font-semibold tracking-tight">ntfy desk</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] text-[#666] bg-white/[0.05] border border-white/[0.07] rounded-full font-mono">
              v0.1.0
            </span>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">

          {/* ── Sidebar — subscriptions only ── */}
          <aside className="w-[260px] flex flex-col border-r border-white/[0.07] shrink-0 bg-[#1a1a1a]">

            {/* Subscriptions header */}
            <div className="px-4 pt-5 pb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[#666] uppercase tracking-widest">
                Subscriptions
                {subscriptions.length > 0 && (
                  <span className="ml-1.5 font-normal normal-case text-[#555]">
                    {subscriptions.length}
                  </span>
                )}
              </span>
              {/* Quick-add shortcut */}
              <button
                title="Add subscription"
                onClick={() => setActiveTab("settings")}
                className="w-5 h-5 rounded flex items-center justify-center text-[#555] hover:text-[#0078d4] hover:bg-white/[0.06]"
              >
                <PlusIcon size={13} strokeWidth={2.5} />
              </button>
            </div>

            {/* Subscription list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {subscriptions.length === 0 ? (
                <div className="mx-2 mt-2 px-3 py-4 rounded-lg border border-dashed border-white/[0.07] text-center">
                  <p className="text-[11px] text-[#555] leading-relaxed">
                    No subscriptions yet. Add one in Settings.
                  </p>
                </div>
              ) : (
                subscriptions.map((sub) => {
                  const isSelected = selectedSubscriptionId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      data-testid="sidebar-sub"
                      onClick={() => handleSubClick(sub.id!)}
                      className={[
                        "w-full text-left px-3 py-2.5 rounded-lg mb-0.5 group relative transition-all duration-150",
                        isSelected
                          ? "sub-selected"
                          : "hover:bg-white/[0.05] border-l-3 border-transparent",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Status dot */}
                        {sub.is_active ? (
                          <span
                            data-testid="connection-dot-online"
                            className="status-dot-connected"
                          />
                        ) : (
                          <span
                            data-testid="connection-dot-offline"
                            className="status-dot-disconnected"
                          />
                        )}
                        <span
                          className={`text-[13px] font-medium truncate ${
                            isSelected ? "text-white" : "text-[#d4d4d4]"
                          }`}
                        >
                          {sub.topic}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#555] mt-0.5 truncate pl-[20px]">
                        {sub.url}
                      </p>
                    </button>
                  );
                })
              )}
            </div>

            {/* Sidebar footer — Settings gear only */}
            <div className="border-t border-white/[0.07] p-2">
              <button
                data-testid="nav-settings"
                onClick={() => setActiveTab("settings")}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 relative",
                  activeTab === "settings"
                    ? "nav-active"
                    : "text-[#666] hover:bg-white/[0.05] hover:text-[#999]",
                ].join(" ")}
              >
                <SettingsIcon size={15} strokeWidth={2} />
                <span>Settings</span>
              </button>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 overflow-hidden flex flex-col">
            {/* Error banner */}
            {error && (
              <div className="mx-4 mt-3 px-4 py-2.5 bg-[#c50f1f]/15 border border-[#c50f1f]/30 rounded-lg flex items-start gap-2.5 fade-in">
                <AlertCircleIcon size={15} className="text-[#ff6b6b] mt-0.5 shrink-0" />
                <p className="text-[13px] text-[#ffb3b3] leading-relaxed flex-1">{error}</p>
                <button
                  onClick={() => useStore.setState({ error: null })}
                  className="text-[#999] hover:text-white shrink-0 -mr-1"
                >
                  <XIcon size={14} />
                </button>
              </div>
            )}

            {/* ── Settings view ── */}
            {activeTab === "settings" && (
              <div className="flex flex-col h-full fade-in">
                {/* Breadcrumb header with back-to-inbox */}
                <div className="px-5 py-3 border-b border-white/[0.07] flex items-center gap-3 shrink-0 bg-white/[0.02]">
                  <button
                    data-testid="nav-inbox"
                    onClick={() => setActiveTab("inbox")}
                    className="flex items-center gap-1.5 text-[13px] text-[#0078d4] hover:text-[#40b6ff] transition-colors font-medium group"
                  >
                    <ArrowLeftIcon size={14} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
                    Inbox
                  </button>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#0078d4] text-white rounded-full min-w-[18px] text-center leading-none">
                      {unreadCount}
                    </span>
                  )}
                  <span className="text-[#333]">/</span>
                  <span className="text-[13px] font-semibold text-[#888]">Settings</span>
                </div>
                <div className="overflow-y-auto flex-1">
                  <Settings />
                </div>
              </div>
            )}

            {/* ── Inbox view (default) ── */}
            {activeTab === "inbox" && <Inbox />}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
