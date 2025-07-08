import { create } from 'zustand';

type State = {
  sources: string[];
  addSource: (url: string) => void;
};

export const useSourceStore = create<State>((set) => ({
  sources: JSON.parse(localStorage.getItem('sources') || '[]'),
  addSource: (url: string) =>
    set((state) => {
      const updated = [...state.sources, url];
      localStorage.setItem('sources', JSON.stringify(updated));
      return { sources: updated };
    }),
}));