import { create } from "zustand";

export interface Activity {
  id: string;
  tool: string;
  label: string;
  done: boolean;
  elapsed?: number;
}

const MAX_VISIBLE_ACTIVITIES = 6;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  activities: Activity[];
  timestamp: number;
}

interface TriageChatState {
  messages: ChatMessage[];
  isStreaming: boolean;

  addUserMessage: (text: string) => string;
  startAssistantMessage: () => string;
  appendText: (msgId: string, text: string) => void;
  addActivity: (msgId: string, activity: Activity) => void;
  markActivityDone: (msgId: string, activityId: string) => void;
  updateActivityElapsed: (
    msgId: string,
    activityId: string,
    elapsed: number
  ) => void;
  setStreaming: (v: boolean) => void;
  clear: () => void;
}

let _id = 0;
const nextId = () => `tmsg_${++_id}_${Date.now()}`;

export const useTriageChatStore = create<TriageChatState>((set) => ({
  messages: [],
  isStreaming: false,

  addUserMessage: (text) => {
    const id = nextId();
    set((s) => ({
      messages: [
        ...s.messages,
        { id, role: "user", text, activities: [], timestamp: Date.now() },
      ],
    }));
    return id;
  },

  startAssistantMessage: () => {
    const id = nextId();
    set((s) => ({
      messages: [
        ...s.messages,
        { id, role: "assistant", text: "", activities: [], timestamp: Date.now() },
      ],
    }));
    return id;
  },

  appendText: (msgId, text) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === msgId ? { ...m, text: m.text + text } : m
      ),
    })),

  addActivity: (msgId, activity) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id !== msgId
          ? m
          : {
              ...m,
              activities: (() => {
                const duplicate = m.activities.find(
                  (a) =>
                    a.tool === activity.tool &&
                    a.label === activity.label &&
                    !a.done
                );
                if (duplicate) return m.activities;

                const next = [...m.activities, activity];
                if (next.length <= MAX_VISIBLE_ACTIVITIES) return next;

                const firstDoneIndex = next.findIndex((a) => a.done);
                if (firstDoneIndex !== -1) {
                  return next.filter((_, index) => index !== firstDoneIndex);
                }
                return next.slice(next.length - MAX_VISIBLE_ACTIVITIES);
              })(),
            }
      ),
    })),

  markActivityDone: (msgId, activityId) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === msgId
          ? {
              ...m,
              activities: m.activities.map((a) =>
                a.id === activityId ? { ...a, done: true } : a
              ),
            }
          : m
      ),
    })),

  updateActivityElapsed: (msgId, activityId, elapsed) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === msgId
          ? {
              ...m,
              activities: m.activities.map((a) =>
                a.id === activityId ? { ...a, elapsed } : a
              ),
            }
          : m
      ),
    })),

  setStreaming: (v) => set({ isStreaming: v }),
  clear: () => set({ messages: [], isStreaming: false }),
}));
