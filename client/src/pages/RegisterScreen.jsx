import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/axios.js'
import KioskLayout from '../components/KioskLayout.jsx'

const GENDER_OPTIONS = [
  { value: 'MALE', labelKey: 'gender_male' },
  { value: 'FEMALE', labelKey: 'gender_female' },
  { value: 'OTHER', labelKey: 'gender_other' },
  { value: 'PREFER_NOT_TO_SAY', labelKey: 'gender_prefer_not' }
]
const TOTAL_STEPS = 3

export default function RegisterScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const mobile = location.state?.mobile
  if (!mobile) { navigate('/auth', { replace: true }) }

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    name: '', aadhaar: '', dateOfBirth: '', address: '', gender: '', email: ''
  })

  const set = (field, value) => {
    setForm(p => ({ ...p, [field]: value }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  const validateStep = () => {
    const errs = {}
    if (step === 1) {
      if (!form.name.trim() || form.name.trim().length < 2) errs.name = t('error_name')
      if (!/^\d{12}$/.test(form.aadhaar.replace(/\s/g, ''))) errs.aadhaar = t('error_aadhaar')
    }
    if (step === 2) {
      if (!form.dateOfBirth) { errs.dateOfBirth = t('error_dob') }
      else {
        const age = new Date().getFullYear() - new Date(form.dateOfBirth).getFullYear()
        if (age < 18) errs.dateOfBirth = 'You must be at least 18 years old'
      }
      if (!form.gender) errs.gender = t('error_gender')
    }
    if (step === 3) {
      if (!form.address.trim() || form.address.trim().length < 10) errs.address = t('error_address')
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = () => { if (validateStep()) setStep(s => s + 1) }

  const handleSubmit = async () => {
    if (!validateStep()) return
    setLoading(true)
    try {
      await api.post('/auth/register', {
        name: form.name.trim(),
        mobile,
        aadhaar: form.aadhaar.replace(/\s/g, ''),
        dateOfBirth: form.dateOfBirth,
        address: form.address.trim(),
        gender: form.gender,
        email: form.email || undefined
      })
      navigate('/otp', { state: { mobile, isNewUser: true } })
    } catch (err) {
      if (err.response?.status === 409) {
        navigate('/otp', { state: { mobile } })
      } else {
        setErrors({ submit: err.response?.data?.error || t('error_generic') })
      }
    } finally {
      setLoading(false)
    }
  }

  const formatAadhaar = (val) =>
    val.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ').trim()

  const inputCls = (err) =>
    `w-full px-4 py-3 rounded-xl border-2 text-base outline-none transition-colors
    ${err ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-brand-blue focus:bg-white'}`

  return (
    <KioskLayout showBack={step === 1} showHome={false}>
      <div className="flex flex-col h-full px-8 pt-6 pb-4">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-kiosk-lg font-bold text-gray-900">{t('register_title')}</h1>
            <span className="text-base text-gray-400">{t('step', { current: step, total: TOTAL_STEPS })}</span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i < step ? 'bg-brand-blue' : 'bg-gray-200'}`} />
            ))}
          </div>
          <p className="text-base text-gray-400 mt-2">{t('register_subtitle')}</p>
        </div>

        {/* Mobile display */}
        <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <span className="text-green-600 text-xs">✓</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Mobile number</p>
            <p className="text-base font-semibold text-gray-800">
              +91 {mobile?.slice(0, 5)} {mobile?.slice(5)}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col gap-5 overflow-y-auto"
          >
            {/* Step 1 */}
            {step === 1 && (
              <>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-1">
                    {t('full_name')} <span className="font-normal text-gray-400 text-sm">({t('full_name_hint')})</span>
                  </label>
                  <input type="text" value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder={t('full_name_hint')}
                    className={inputCls(errors.name)} autoComplete="off" />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-1">
                    {t('aadhaar')} <span className="font-normal text-gray-400 text-sm">({t('aadhaar_hint')})</span>
                  </label>
                  <input type="text" inputMode="numeric"
                    value={form.aadhaar}
                    onChange={e => set('aadhaar', formatAadhaar(e.target.value))}
                    placeholder="XXXX XXXX XXXX" maxLength={14}
                    className={inputCls(errors.aadhaar)} autoComplete="off" />
                  {errors.aadhaar && <p className="text-red-500 text-sm mt-1">{errors.aadhaar}</p>}
                </div>
              </>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-1">{t('dob')}</label>
                  <input type="date" value={form.dateOfBirth}
                    onChange={e => set('dateOfBirth', e.target.value)}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    className={inputCls(errors.dateOfBirth)} />
                  {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>}
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">{t('gender')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {GENDER_OPTIONS.map(g => (
                      <button key={g.value} type="button" onClick={() => set('gender', g.value)}
                        className={`min-h-[56px] rounded-xl border-2 text-base font-medium px-3 transition-colors
                          ${form.gender === g.value ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-gray-200 bg-white text-gray-700'}`}>
                        {t(g.labelKey)}
                      </button>
                    ))}
                  </div>
                  {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
                </div>
              </>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-1">
                    {t('address')} <span className="font-normal text-gray-400 text-sm">({t('address_hint')})</span>
                  </label>
                  <textarea value={form.address} onChange={e => set('address', e.target.value)}
                    rows={3} placeholder={t('address_hint')}
                    className={`${inputCls(errors.address)} resize-none`} />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-1">
                    {t('email')}
                  </label>
                  <input type="email" inputMode="email" value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder={t('email_hint')}
                    className={inputCls(errors.email)} autoComplete="off" />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {errors.submit && <p className="text-red-500 text-base text-center mt-2">{errors.submit}</p>}

        <div className="flex gap-4 mt-5">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} disabled={loading} className="flex-1 btn-kiosk-secondary">
              ← {t('back')}
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button onClick={handleNext} className="flex-1 btn-kiosk-primary">{t('next')} →</button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className={`flex-1 btn-kiosk-primary ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}>
              {loading ? t('loading') : t('register_submit')}
            </button>
          )}
        </div>

        <p className="text-center text-base text-gray-400 mt-3">
          {t('already_registered')}{' '}
          <button onClick={() => navigate('/auth', { replace: true })} className="text-brand-blue font-semibold underline">
            {t('login_here')}
          </button>
        </p>
      </div>
    </KioskLayout>
  )
}