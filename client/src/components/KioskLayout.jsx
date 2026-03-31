import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useIdleTimer } from '../hooks/useIdleTimer.js'
import useStore from '../store/useStore.js'

// Wraps every screen except IdleScreen
// Provides: idle timer, Back button, Home button, top status bar
export default function KioskLayout({ children, showBack = true, showHome = true }) {
  const navigate    = useNavigate()
  const location    = useLocation()
  const { t }       = useTranslation()
  const { reset }   = useStore()

  // Attach idle timer to this layout — fires on every protected screen
  useIdleTimer()

  const handleHome = () => {
    reset()
    navigate('/', { replace: true })
  }

  const handleBack = () => {
    navigate(-1)
  }

  // Don't show back button on /home (service hub) — use End Session instead
  const isHome = location.pathname === '/home'

  return (
    <div className="kiosk-screen">

      <div className="flex items-center justify-between px-6 py-3 bg-brand-blue text-white">
        <span className="text-sm font-semibold tracking-wide">SUVIDHA</span>
        <span className="text-xs opacity-75">
          {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-white">
        {showBack && !isHome && (
          <button
            onClick={handleBack}
            className="flex-1 min-h-[60px] rounded-xl border-2 border-gray-300
                       text-gray-600 text-lg font-semibold
                       active:scale-95 transition-transform"
          >
            ← {t('back')}
          </button>
        )}

        {showHome && (
          <button
            onClick={handleHome}
            className="flex-1 min-h-[60px] rounded-xl border-2 border-brand-blue
                       text-brand-blue text-lg font-semibold
                       active:scale-95 transition-transform"
          >
            {isHome ? t('end_session') : `⌂  ${t('home')}`}
          </button>
        )}
      </div>

    </div>
  )
}