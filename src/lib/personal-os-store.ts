import { useEffect, useState } from "react";

export type PlanTask = { id: string; title: string; dueDate: string; priority: "Low" | "Normal" | "High"; done: boolean };
export type Routine = { id: string; title: string; cadence: string; time: string };
export type Commitment = { id: string; title: string };
export type GrowthItem = { id: string; title: string; detail: string; status: string; targetDate: string };
export type PersonalOSData = {
  tasks: PlanTask[];
  routines: Routine[];
  focusTarget: number;
  challenge: { name: string; duration: number; startDate: string; commitments: Commitment[]; active: boolean };
  calendar: { embedUrl: string; label: string; timezone: string };
  growth: { goals: GrowthItem[]; learning: GrowthItem[]; skills: GrowthItem[]; projects: GrowthItem[]; milestones: GrowthItem[] };
  ai: { provider: string };
};

export const defaultPersonalOS: PersonalOSData = {
  tasks: [],
  routines: [],
  focusTarget: 2,
  challenge: { name: "Consistency Challenge", duration: 30, startDate: new Date().toISOString().slice(0, 10), commitments: [], active: false },
  calendar: { embedUrl: "", label: "My Google Calendar", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Nairobi" },
  growth: { goals: [], learning: [], skills: [], projects: [], milestones: [] },
  ai: { provider: "openai" },
};

const KEY = "morelifeos:personal-os:v1";

export function usePersonalOS() {
  const [data, setData] = useState<PersonalOSData>(defaultPersonalOS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersonalOSData>;
        setData({
          ...defaultPersonalOS,
          ...parsed,
          challenge: { ...defaultPersonalOS.challenge, ...parsed.challenge },
          calendar: { ...defaultPersonalOS.calendar, ...parsed.calendar },
          growth: { ...defaultPersonalOS.growth, ...parsed.growth },
          ai: { ...defaultPersonalOS.ai, ...parsed.ai },
        });
      }
    } catch { /* keep safe defaults if local data is unreadable */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(data));
  }, [data, loaded]);
  return { data, setData, loaded };
}

export function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}
