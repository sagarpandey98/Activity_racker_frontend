import { create } from 'zustand';

const useUIStore = create((set) => ({
  isQuickLogOpen: false,
  setIsQuickLogOpen: (val) => set({ isQuickLogOpen: val }),
}));

export default useUIStore;
