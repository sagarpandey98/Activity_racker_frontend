import { create } from 'zustand';

const useUIStore = create((set) => ({
  isQuickLogOpen: false,
  setIsQuickLogOpen: (val) => set({ isQuickLogOpen: val }),
  prefillGoal: null,
  setPrefillGoal: (goal) => set({ prefillGoal: goal }),
  activityLogVersion: 0,
  bumpActivityLogVersion: () => set((state) => ({
    activityLogVersion: state.activityLogVersion + 1,
  })),
}));

export default useUIStore;
