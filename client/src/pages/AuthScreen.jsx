import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import api from '../lib/axios.js'
import KioskLayout from '../components/KioskLayout.jsx'

const NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export default function AuthScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [mobile, setMobile] = useState('')
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const handleKey = (key) => {
    if (loading) return
    setErrMsg('')
    if (key === '⌫') setMobile(p => p.slice(0, -1))
    else if (key && mobile.length < 10) setMobile(p => p + key)
  }

  const handleContinue = async () => {
    if (mobile.length !== 10) { setErrMsg(t('error_mobile')); return }
    setLoading(true)
    setErrMsg('')
    try {
      const { data } = await api.get(`/auth/check-mobile?mobile=${mobile}`)
      if (data.registered) {
        await api.post('/auth/send-otp', { mobile })
        navigate('/otp', { state: { mobile, name: data.name } })
      } else {
        navigate('/register', { state: { mobile } })
      }
    } catch (err) {
      setErrMsg(err.response?.data?.error || t('error_generic'))
    } finally {
      setLoading(false)
    }
  }

  const displayMobile = mobile.length > 5
    ? `${mobile.slice(0, 5)} ${mobile.slice(5)}`
    : mobile

  return (
    <KioskLayout showBack={true} showHome={false}>
      <div className="flex flex-col items-center justify-center h-full px-8 gap-8">
        <div className="text-center">
          <h1 className="text-kiosk-xl font-bold text-gray-900 mb-2">{t('enter_mobile')}</h1>
          <p className="text-kiosk-sm text-gray-500">{t('mobile_hint')}</p>
        </div>

        <div className={`w-full max-w-sm rounded-2xl border-2 px-6 py-5 text-center transition-colors
          ${errMsg ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
          <p className="text-kiosk-2xl font-bold tracking-widest text-gray-900 min-h-[56px]">
            {displayMobile || <span className="text-gray-300">__________</span>}
          </p>
          {errMsg && <p className="text-red-500 text-base mt-2">{errMsg}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          {NUMPAD.map((key, idx) => (
            <motion.button
              key={idx}
              whileTap={{ scale: key ? 0.92 : 1 }}
              onClick={() => handleKey(key)}
              disabled={loading || !key}
              className={`min-h-[68px] rounded-xl text-kiosk-base font-semibold transition-colors
                ${key === '⌫' ? 'bg-gray-100 text-gray-600 border-2 border-gray-200'
                  : key ? 'bg-white text-gray-900 border-2 border-gray-200 active:bg-gray-100'
                    : 'bg-transparent border-0 cursor-default'}
                ${loading ? 'opacity-40' : ''}`}
            >
              {key}
            </motion.button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={loading || mobile.length !== 10}
          className={`btn-kiosk-primary max-w-xs
            ${(loading || mobile.length !== 10) ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {loading ? t('checking') : t('continue')}
        </button>
      </div>
    </KioskLayout>
  )
}