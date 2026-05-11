import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Subscription, Message, AppSettings } from "../types";
import { DEFAULT_SETTINGS } from "../types";

interface StoreState {
  subscriptions: Subscription[];
  messages: Message[];
  settings: AppSettings;
  selectedSubscriptionId: number | null;
  activeTab: "inbox" | "settings";
  loading: boolean;
  error: string | null;

  // IPC actions
  loadSubscriptions: () => Promise<void>;
  addSubscription: (url: string, topic: string) => Promise<void>;
  removeSubscription: (id: number) => Promise<void>;
  loadMessages: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  deleteMessage: (id: number) => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;

  // UI actions
  selectSubscription: (id: number | null) => void;
  setActiveTab: (tab: "inbox" | "settings") => void;
}

export const useStore = create<StoreState>((set, get) => ({
  subscriptions: [],
  messages: [],
  settings: { ...DEFAULT_SETTINGS },
  selectedSubscriptionId: null,
  activeTab: "inbox",
  loading: false,
  error: null,

  loadSubscriptions: async () => {
    set({ loading: true, error: null });
    try {
      const subscriptions = await invoke<Subscription[]>("list_subscriptions");
      set({ subscriptions, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  addSubscription: async (url, topic) => {
    set({ loading: true, error: null });
    try {
      await invoke<Subscription>("add_subscription", { url, topic });
      await get().loadSubscriptions();
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  removeSubscription: async (id) => {
    set({ loading: true, error: null });
    try {
      await invoke<void>("remove_subscription", { id });
      const state = get();
      const subscriptions = state.subscriptions.filter((s) => s.id !== id);
      if (state.selectedSubscriptionId === id) {
        set({
          subscriptions,
          selectedSubscriptionId: null,
          messages: [],
          loading: false,
        });
      } else {
        set({ subscriptions, loading: false });
      }
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  loadMessages: async () => {
    set({ loading: true, error: null });
    try {
      const { selectedSubscriptionId } = get();
      const args: Record<string, unknown> = {};
      if (selectedSubscriptionId !== null) {
        args.subscriptionId = selectedSubscriptionId;
      }
      const messages = await invoke<Message[]>("get_messages", args);
      set({ messages, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  markRead: async (id) => {
    const previousMessages = get().messages;
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, is_read: true } : m,
      ),
    }));
    try {
      await invoke<void>("mark_read", { id });
      set({ error: null });
    } catch (err) {
      set({ messages: previousMessages, error: String(err) });
    }
  },

  deleteMessage: async (id) => {
    const previousMessages = get().messages;
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    }));
    try {
      await invoke<void>("delete_message", { id });
      set({ error: null });
    } catch (err) {
      set({ messages: previousMessages, error: String(err) });
    }
  },

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await invoke<AppSettings>("get_settings");
      set({ settings, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  updateSetting: async (key, value) => {
    set({ loading: true, error: null });
    try {
      await invoke<void>("update_setting", { key, value });
      await get().loadSettings();
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  selectSubscription: (id) => {
    set({ selectedSubscriptionId: id });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },
}));
