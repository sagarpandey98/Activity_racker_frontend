import { create } from 'zustand';

const useUIStore = create((set) => ({
  isQuickLogOpen: false,
  setIsQuickLogOpen: (val) => set({ isQuickLogOpen: val }),
  prefillGoal: null,
  setPrefillGoal: (goal) => set({ prefillGoal: goal }),
}));

export default useUIStore;
