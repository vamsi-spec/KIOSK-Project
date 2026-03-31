import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useStore from '../store/useStore.js'

const SERVICES = ['Electricity', 'Gas', 'Water', 'Complaints', 'New Connection']

export default function IdleScreen() {
  const navigate = useNavigate()
  const { reset } = useStore()

  useEffect(() => { reset() }, [])

  return (
    <div
      className="kiosk-screen items-center justify-center gap-8 cursor-pointer select-none"
      onClick={() => navigate('/language')}
    >

      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="w-28 h-28 rounded-full bg-brand-blue flex items-center
                   justify-center text-white text-4xl font-bold shadow-lg"
      >
        S
      </motion.div>

      <div className="text-center px-8">
        <h1 className="text-kiosk-2xl font-bold text-gray-900 mb-2">
          Namaste
        </h1>
        <p className="text-kiosk-base text-gray-500">
          SUVIDHA — Civic Services Kiosk
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 px-10">
        {SERVICES.map(s => (
          <span
            key={s}
            className="px-5 py-2 rounded-full border-2 border-gray-200
                       text-gray-500 text-lg bg-gray-50"
          >
            {s}
          </span>
        ))}
      </div>

      <motion.p
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="text-kiosk-base text-brand-blue font-semibold mt-4"
      >
        Touch anywhere to begin
      </motion.p>

      <p className="text-base text-gray-400">
        हिंदी · తెలుగు · English
      </p>
    </div>
  )
}