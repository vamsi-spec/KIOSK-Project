import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import KioskLayout from '../../components/KioskLayout'

const OPTIONS = [
    { key: 'view_bill', route: '/gas/accounts', color: 'bg-blue-50 border-blue-300', icon: '🧾' },
    { key: 'new_connection', route: '/gas/connection', color: 'bg-green-50 border-green-300', icon: '🔌' },
    { key: 'meter_reading', route: '/gas/meter', color: 'bg-yellow-50 border-yellow-300', icon: '📊' },
    { key: 'file_complaint', route: '/gas/complaint', color: 'bg-orange-50 border-orange-300', icon: '📋' },
    { key: 'track_complaint', route: '/gas/track', color: 'bg-purple-50 border-purple-300', icon: '🔍' },
    { key: 'bill_history', route: '/gas/accounts', color: 'bg-gray-50 border-gray-300', icon: '📂' }
]


export default function GasHome() {
    const navigate = useNavigate()
    const { t } = useTranslation()

    return (
        <KioskLayout>
            <div className='flex flex-col h-full px-8 pt-6'>

                <div>
                    <span style={{ fontSize: 32 }}>🔥</span>
                    <h1 className='test-kiosk-lg font-bold text-gray-900'>Gas Service</h1>
                </div>

                <motion.button
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/gas/emergency')}
                    className="w-full mb-4 min-h-[70px] rounded-2xl bg-red-600 border-2 border-red-700
                     flex items-center justify-center gap-3 active:scale-95 transition-transform"
                >
                    <span style={{ fontSize: 28 }}>🚨</span>
                    <div className='text-left'>
                        <p className='text-white text-lg font-bold leading-tight'>Report Gas Leak Emergency</p>
                        <p className='text-red-100 text-sm'>
                            No login needed . 24X7 emergency response
                        </p>
                    </div>
                </motion.button>

                <div className='grid grid-cols-2 gap-4 flex-1'>
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

                <div className="py-3 text-center border-t border-gray-100 mt-2">
                    <p className="text-xs text-gray-400">
                        Gas Emergency: <span className="font-semibold text-red-600">040-23234701</span>
                        {' '}· National: <span className="font-semibold text-red-600">1906</span>
                    </p>
                </div>

            </div>
        </KioskLayout>
    )
}