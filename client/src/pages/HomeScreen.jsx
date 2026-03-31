import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import useStore from '../store/useStore.js'
import KioskLayout from '../components/KioskLayout.jsx'

const SERVICES = [
  {
    key:   'electricity',
    label: 'electricity',
    route: '/electricity',
    color: 'bg-yellow-50 border-yellow-300',
    icon:  '⚡'
  },
  {
    key:   'gas',
    label: 'gas',
    route: '/gas',
    color: 'bg-orange-50 border-orange-300',
    icon:  '🔥'
  },
  {
    key:   'water',
    label: 'water',
    route: '/water',
    color: 'bg-blue-50 border-blue-300',
    icon:  '💧'
  },
  {
    key:   'complaints',
    label: 'complaints',
    route: '/complaints',
    color: 'bg-red-50 border-red-300',
    icon:  '📋'
  }
]

export default function HomeScreen() {
  const navigate    = useNavigate()
  const { t }       = useTranslation()
  const { citizen } = useStore()

  return (
    <KioskLayout showBack={false} showHome={true}>
      <div className="flex flex-col h-full px-8 pt-8 gap-8">

        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-green-100
                            flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <h1 className="text-kiosk-lg font-bold text-gray-900">
              {t('welcome_back', { name: citizen?.name || '' })}
            </h1>
          </div>
          <p className="text-kiosk-sm text-gray-500 ml-12">
            {t('select_service')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5 flex-1">
          {SERVICES.map((svc, idx) => (
            <motion.button
              key={svc.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(svc.route)}
              className={`service-tile ${svc.color} border-2`}
            >
              <span style={{ fontSize: '40px', lineHeight: 1 }}>
                {svc.icon}
              </span>
              <span className="text-kiosk-base font-bold text-gray-800">
                {t(svc.label)}
              </span>
            </motion.button>
          ))}
        </div>

      </div>
    </KioskLayout>
  )
}