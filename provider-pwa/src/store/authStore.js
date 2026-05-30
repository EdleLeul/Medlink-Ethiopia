import { create } from 'zustand'

const useAuthStore = create((set) => ({
  // Provider auth
  provider: null,          // { uid, email, providerID, providerName, facilityName, facilityCode, role }
  isLoading: true,

  setProvider: (provider) => set({ provider, isLoading: false }),
  clearProvider: () => set({ provider: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  // Active patient session (set after OTP verified or break glass granted)
  activePatient: null,     // { patientID, patientData, sessionExpiry, accessType }
  setActivePatient: (data) => set({ activePatient: data }),
  clearActivePatient: () => set({ activePatient: null }),

  // OTP flow state
  otpDocID: null,
  setOtpDocID: (id) => set({ otpDocID: id }),
  clearOtpDocID: () => set({ otpDocID: null }),
}))

export default useAuthStore