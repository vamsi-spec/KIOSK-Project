import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import KioskLayout from '../../components/KioskLayout.jsx'

const OPTIONS = [
  { key: 'view_bill', route: '/electricity/accounts', color: 'bg-blue-50 border-blue-300', icon: '🧾' },
  { key: 'new_connection', route: '/electricity/connection', color: 'bg-green-50 border-green-300', icon: '🔌' },
  { key: 'meter_reading', route: '/electricity/meter', color: 'bg-yellow-50 border-yellow-300', icon: '⚡' },
  { key: 'file_complaint', route: '/electricity/complaint', color: 'bg-red-50 border-red-300', icon: '📋' },
  { key: 'track_complaint', route: '/electricity/track', color: 'bg-purple-50 border-purple-300', icon: '🔍' },
  { key: 'bill_history', route: '/electricity/accounts', color: 'bg-gray-50 border-gray-300', icon: '📂' }
]

export default function ElectricityHome() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <KioskLayout>
      <div className="flex flex-col h-full px-8 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <span style={{ fontSize: 32 }}>⚡</span>
          <h1 className="text-kiosk-lg font-bold text-gray-900">{t('electricity_title')}</h1>
        </div>
        <div className="grid grid-cols-2 gap-4 flex-1">
          {OPTIONS.map((opt, idx) => (
            <motion.button
              key={opt.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(opt.route)}
              className={`service-tile ${opt.color} border-2`}
            >
              <span style={{ fontSize: 36, lineHeight: 1 }}>{opt.icon}</span>
              <span className="text-base font-bold text-gray-800 text-center">{t(opt.key)}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </KioskLayout>
  )
}