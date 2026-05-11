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
  error: null,

  loadSubscriptions: async () => {
    set({ error: null });
    try {
      const subscriptions = await invoke<Subscription[]>("list_subscriptions");
      set({ subscriptions });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  addSubscription: async (url, topic) => {
    set({ error: null });
    try {
      await invoke<Subscription>("add_subscription", { url, topic });
      await get().loadSubscriptions();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  removeSubscription: async (id) => {
    set({ error: null });
    try {
      await invoke<void>("remove_subscription", { id });
      const state = get();
      const subscriptions = state.subscriptions.filter((s) => s.id !== id);
      if (state.selectedSubscriptionId === id) {
        set({
          subscriptions,
          selectedSubscriptionId: null,
          messages: [],
        });
      } else {
        set({ subscriptions });
      }
    } catch (err) {
      set({ error: String(err) });
    }
  },

  loadMessages: async () => {
    set({ error: null });
    try {
      const { selectedSubscriptionId } = get();
      const args: Record<string, unknown> = {};
      if (selectedSubscriptionId !== null) {
        args.subscriptionId = selectedSubscriptionId;
      }
      const messages = await invoke<Message[]>("get_messages", args);
      set({ messages });
    } catch (err) {
      set({ error: String(err) });
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
    set({ error: null });
    try {
      const settings = await invoke<AppSettings>("get_settings");
      set({ settings });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  updateSetting: async (key, value) => {
    set({ error: null });
    try {
      await invoke<void>("update_setting", { key, value });
      await get().loadSettings();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  selectSubscription: (id) => {
    set({ selectedSubscriptionId: id });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },
}));
