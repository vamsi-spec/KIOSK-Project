import { create } from 'zustand'

// Global kiosk state — persists for the duration of one session
// Cleared on logout or idle timeout reset
const useStore = create((set) => ({

  // ── Auth state ───────────────────────────────────────────
  token:    null,
  citizen:  null,   // { id, name, preferredLang }

  setAuth: (token, citizen) => set({ token, citizen }),

  clearAuth: () => set({ token: null, citizen: null }),

  // ── Language state ───────────────────────────────────────
  // Set on LanguageScreen, used by i18n and stored in citizen.preferredLang
  language: 'en',

  setLanguage: (lang) => set({ language: lang }),

  // ── Loading / error state ────────────────────────────────
  loading: false,
  error:   null,

  setLoading: (loading) => set({ loading }),
  setError:   (error)   => set({ error }),
  clearError: ()        => set({ error: null }),

  // ── Full reset — called on idle timeout or logout ────────
  reset: () => set({
    token:    null,
    citizen:  null,
    language: 'en',
    loading:  false,
    error:    null
  })
}))

export default useStore