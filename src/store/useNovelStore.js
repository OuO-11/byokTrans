import { create } from 'zustand';

export const useNovelStore = create((set) => ({
  novels: [],
  setNovels: (novels) => set({ novels }),
  
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),
}));
