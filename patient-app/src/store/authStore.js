import { create } from 'zustand';

/**
 * Global auth + account state.
 *
 * activeProfile: the currently viewed profile (self or a child).
 * This allows seamless switching between a parent's own record
 * and any of their children's records.
 */
export const useAuthStore = create((set, get) => ({
  // Firebase user object (set on login)
  user: null,

  // Registered MedLink patient profile for the logged-in user
  patientProfile: null,

  // Children registered under this account
  children: [],

  // The profile currently being viewed (self or child)
  activeProfile: null,

  setUser: (user) => set({ user }),

  setPatientProfile: (profile) =>
    set({ patientProfile: profile, activeProfile: profile }),

  setChildren: (children) => set({ children }),

  addChild: (child) =>
    set((s) => ({ children: [...s.children, child] })),

  // Switch active profile between self and a child account
  switchProfile: (profileOrNull) =>
    set((s) => ({
      activeProfile: profileOrNull ?? s.patientProfile,
    })),

  // Returns patientID of whoever is currently active
  activePatientID: () => get().activeProfile?.patientID ?? null,

  logout: () =>
    set({ user: null, patientProfile: null, children: [], activeProfile: null }),
}));