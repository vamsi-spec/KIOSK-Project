import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import api from '../lib/axios.js'
import useStore from '../store/useStore.js'
import KioskLayout from '../components/KioskLayout.jsx'

const NUMPAD        = ['1','2','3','4','5','6','7','8','9','','0','⌫']
const OTP_LENGTH    = 6
const RESEND_COOLDOWN = 60

export default function OtpScreen() {
  const navigate    = useNavigate()
  const location    = useLocation()
  const { t }       = useTranslation()
  const { setAuth } = useStore()

  const mobile     = location.state?.mobile
  const isNewUser  = location.state?.isNewUser || false

  if (!mobile) { navigate('/auth', { replace: true }) }

  const [otp,       setOtp]       = useState('')
  const [loading,   setLoading]   = useState(false)
  const [errMsg,    setErrMsg]    = useState('')
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN)
  const [canResend, setCanResend] = useState(false)
  const timerRef = useRef(null)

  const startCountdown = useCallback(() => {
    setCanResend(false)
    setCountdown(RESEND_COOLDOWN)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    startCountdown()
    return () => clearInterval(timerRef.current)
  }, [startCountdown])

  const handleVerify = useCallback(async () => {
    if (otp.length !== OTP_LENGTH || loading) return
    setLoading(true)
    setErrMsg('')

    try {
      const { data } = await api.post('/auth/verify-otp', { mobile, otp })
      setAuth(data.token, data.citizen)
      navigate('/home', { replace: true })
    } catch (err) {
      setErrMsg(err.response?.data?.error || t('error_generic'))
      setOtp('')
    } finally {
      setLoading(false)
    }
  }, [otp, mobile, loading, setAuth, navigate, t])

  // Auto-submit on 6th digit
  useEffect(() => {
    if (otp.length === OTP_LENGTH) {
      handleVerify()
    }
  }, [otp, handleVerify])

  const handleKey = (key) => {
    if (loading) return
    if (key === '⌫') { setOtp(prev => prev.slice(0, -1)); setErrMsg('') }
    else if (key && otp.length < OTP_LENGTH) { setOtp(prev => prev + key); setErrMsg('') }
  }

  const handleResend = async () => {
    if (!canResend) return
    setOtp('')
    setErrMsg('')
    try {
      await api.post('/auth/send-otp', { mobile })
      startCountdown()
    } catch (err) {
      setErrMsg(err.response?.data?.error || t('error_generic'))
      setCanResend(true)
    }
  }

  const maskedMobile = mobile ? `XXXXXX${mobile.slice(-4)}` : ''

  return (
    <KioskLayout showBack={true} showHome={false}>
      <div className="flex flex-col items-center justify-center h-full px-8 gap-8">

        <div className="text-center">
          <h1 className="text-kiosk-xl font-bold text-gray-900 mb-2">
            {t('enter_otp')}
          </h1>
          <p className="text-kiosk-sm text-gray-500">
            {t('otp_sent_to')} +91 {maskedMobile}
          </p>
          <p className="text-base text-gray-400 mt-1">{t('otp_hint')}</p>
          {isNewUser && (
            <p className="text-green-600 text-base mt-1 font-medium">
              Registration successful!
            </p>
          )}
        </div>

        {/* 6-box OTP display */}
        <div className="flex gap-3 justify-center">
          {Array.from({ length: OTP_LENGTH }).map((_, idx) => (
            <motion.div
              key={idx}
              animate={otp[idx] ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.15 }}
              className={`
                w-12 h-16 rounded-xl border-2 flex items-center
                justify-center text-kiosk-xl font-bold transition-colors
                ${otp[idx]
                  ? 'border-brand-blue bg-blue-50 text-brand-blue'
                  : idx === otp.length
                    ? 'border-brand-blue bg-white'
                    : 'border-gray-200 bg-gray-50 text-gray-300'}
              `}
            >
              {otp[idx] || (idx === otp.length ? '|' : '•')}
            </motion.div>
          ))}
        </div>

        {/* Error */}
        {errMsg && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-lg text-center"
          >
            {errMsg}
          </motion.p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          {NUMPAD.map((key, idx) => (
            <motion.button
              key={idx}
              whileTap={{ scale: key ? 0.92 : 1 }}
              onClick={() => handleKey(key)}
              disabled={loading || !key}
              className={`
                min-h-[68px] rounded-xl text-kiosk-base font-semibold
                transition-colors duration-100
                ${key === '⌫'
                  ? 'bg-gray-100 text-gray-600 border-2 border-gray-200'
                  : key
                    ? 'bg-white text-gray-900 border-2 border-gray-200 active:bg-gray-100'
                    : 'bg-transparent border-0 cursor-default'}
                ${loading ? 'opacity-40' : ''}
              `}
            >
              {key}
            </motion.button>
          ))}
        </div>

        {/* Resend + Verify */}
        <div className="flex gap-4 w-full max-w-xs">
          <button
            onClick={handleResend}
            disabled={!canResend}
            className={`flex-1 min-h-[60px] rounded-xl border-2 text-base font-semibold
              transition-colors
              ${canResend
                ? 'border-brand-blue text-brand-blue active:bg-blue-50'
                : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
          >
            {canResend
              ? t('resend_otp')
              : t('resend_wait', { seconds: countdown })}
          </button>

          <button
            onClick={handleVerify}
            disabled={loading || otp.length !== OTP_LENGTH}
            className={`flex-1 btn-kiosk-primary
              ${(loading || otp.length !== OTP_LENGTH)
                ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {loading ? t('loading') : t('verify')}
          </button>
        </div>

      </div>
    </KioskLayout>
  )
}