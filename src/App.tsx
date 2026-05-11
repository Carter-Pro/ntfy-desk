import { useEffect } from "react";
import { useStore } from "./store";
import Inbox from "./components/Inbox";
import Settings from "./components/Settings";

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
    loadSubscriptions();
    loadSettings();
  }, [loadSubscriptions, loadSettings]);

  useEffect(() => {
    if (activeTab === "inbox") {
      loadMessages();
    }
  }, [selectedSubscriptionId, activeTab, loadMessages]);

  return (
    <div className="h-screen flex flex-col bg-[#202020] text-white">
      {/* App Header */}
      <header className="h-[52px] flex items-center px-4 bg-[#202020]/80 backdrop-blur border-b border-white/[0.08] shrink-0">
        <h1 className="text-[16px] font-semibold">ntfy desk</h1>
        <span className="ml-auto text-[12px] text-[#999999]">v0.1.0</span>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-[280px] flex flex-col border-r border-white/[0.08] shrink-0">
          {/* Subscriptions header */}
          <div className="px-4 py-3 border-b border-white/[0.08]">
            <h2 className="text-[13px] font-semibold text-[#e0e0e0] uppercase tracking-wide">
              Subscriptions
              {subscriptions.length > 0 && (
                <span className="text-[#999999] font-normal normal-case ml-1">
                  ({subscriptions.length})
                </span>
              )}
            </h2>
          </div>

          {/* Subscription list */}
          <div className="flex-1 overflow-y-auto">
            {subscriptions.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-[#999999]">
                No subscriptions yet. Add one in Settings.
              </p>
            ) : (
              subscriptions.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => selectSubscription(sub.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/[0.05] transition-colors ${
                    selectedSubscriptionId === sub.id ? "bg-white/[0.08]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        sub.is_active
                          ? "bg-[#107c10]"
                          : "bg-[#c50f1f]"
                      }`}
                    />
                    <span className="text-[14px] font-medium truncate">
                      {sub.topic}
                    </span>
                  </div>
                  <span className="block text-[12px] text-[#999999] mt-1 truncate pl-4">
                    {sub.url}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Nav buttons */}
          <div className="border-t border-white/[0.08] p-2 flex flex-col gap-1">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`w-full text-left px-3 py-2 rounded text-[14px] transition-colors ${
                activeTab === "inbox"
                  ? "bg-white/[0.08] text-white"
                  : "text-[#e0e0e0] hover:bg-white/[0.05]"
              }`}
            >
              Inbox
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full text-left px-3 py-2 rounded text-[14px] transition-colors ${
                activeTab === "settings"
                  ? "bg-white/[0.08] text-white"
                  : "text-[#e0e0e0] hover:bg-white/[0.05]"
              }`}
            >
              Settings
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {/* Error banner */}
          {error && (
            <div className="mx-4 mt-4 px-4 py-3 bg-[#c50f1f]/20 border border-[#c50f1f]/40 rounded text-[13px] text-[#e0e0e0]">
              {error}
            </div>
          )}

          {/* Inbox tab */}
          {activeTab === "inbox" && <Inbox />}

          {/* Settings tab */}
          {activeTab === "settings" && (
            <div className="overflow-y-auto h-full p-6">
              <Settings />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
