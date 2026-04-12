import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/axios.js'
import KioskLayout from '../../components/KioskLayout.jsx'

const PROVIDERS = [
  'TSSPDCL',
  'TSNPDCL',
  'APEPDCL',
  'APSPDCL',
  'GESCOM',
  'HESCOM',
  'BESCOM',
  'MSEDCL',
  'Other'
]

export default function LinkAccountScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [step, setStep] = useState('enter')
  const [consumerNo, setConsumerNo] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [linkData, setLinkData] = useState(null)
  const [linkedAcct, setLinkedAcct] = useState(null)
  const [verifyData, setVerifyData] = useState(null)

  const [vForm, setVForm] = useState({
    accountHolderName: '',
    registeredMobile: '',
    address: '',
    providerName: ''
  })
  const [vErrors, setVErrors] = useState({})

  const getLinkError = (err) => {
    const code = err?.response?.data?.code
    if (code === 'OTP_COOLDOWN') {
      const msg = err?.response?.data?.error || ''
      const match = msg.match(/(\d+)/)
      if (match?.[1]) return t('resend_wait', { seconds: match[1] })
    }
    if (code === 'INVALID_OTP') return t('error_otp')
    if (code === 'OTP_EXPIRED') return t('session_timeout')
    return t('error_generic')
  }

  const setV = (k, v) => {
    setVForm(p => ({ ...p, [k]: v }))
    setVErrors(p => ({ ...p, [k]: '' }))
  }

  const inputCls = (err) =>
    `w-full px-4 py-3 rounded-xl border-2 text-base outline-none transition-colors
    ${err
      ? 'border-red-400 bg-red-50'
      : 'border-gray-200 bg-gray-50 focus:border-brand-blue focus:bg-white'}`

  // ── Step 1: Check consumer number ────────────────────────
  const handleCheckConsumerNo = async () => {
    if (!consumerNo.trim()) { setErrMsg(t('enter_consumer_no')); return }
    setLoading(true)
    setErrMsg('')
    try {
      const { data } = await api.post('/core/electricity/accounts/verify-ownership', {
        consumerNo: consumerNo.trim()
      })

      if (data.linked) {
        setLinkedAcct(data.account)
        setStep('success')
      } else if (data.requiresOtp) {
        setLinkData(data)
        setStep('otp')
      } else if (!data.found) {
        if (data.verificationRequest?.exists) {
          setVerifyData(data.verificationRequest)
          setStep('status')
        } else {
          setStep('verify_form')
        }
      }
    } catch (err) {
      setErrMsg(getLinkError(err))
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2A: Verify OTP ───────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setErrMsg(t('enter_6digit_otp')); return }
    setLoading(true)
    setErrMsg('')
    try {
      const { data } = await api.post('/core/electricity/accounts/confirm-link', {
        consumerNo: consumerNo.trim(),
        otp
      })
      setLinkedAcct(data.account)
      setStep('success')
    } catch (err) {
      setErrMsg(getLinkError(err))
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2B: Submit verification form ────────────────────
  const validateVForm = () => {
    const errs = {}
    if (!vForm.accountHolderName.trim() || vForm.accountHolderName.trim().length < 2)
      errs.accountHolderName = t('enter_name_on_bill')
    if (!/^[6-9]\d{9}$/.test(vForm.registeredMobile))
      errs.registeredMobile = t('enter_registered_mobile')
    if (!vForm.address.trim() || vForm.address.trim().length < 10)
      errs.address = t('enter_full_address')
    if (!vForm.providerName)
      errs.providerName = t('error_select_provider')
    setVErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmitVerification = async () => {
    if (!validateVForm()) return
    setLoading(true)
    setErrMsg('')
    try {
      const { data } = await api.post('/core/electricity/accounts/request-verification', {
        consumerNo: consumerNo.trim(),
        accountHolderName: vForm.accountHolderName.trim(),
        registeredMobile: vForm.registeredMobile.trim(),
        address: vForm.address.trim(),
        providerName: vForm.providerName
      })
      setVerifyData({ exists: true, status: 'PENDING', refNo: data.refNo, submittedAt: data.submittedAt })
      setStep('status')
    } catch (err) {
      if (err.response?.status === 409) {
        setVerifyData({ exists: true, status: 'PENDING', refNo: err.response.data.refNo })
        setStep('status')
      } else {
        setErrMsg(getLinkError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KioskLayout>
      <div className="flex flex-col h-full px-8 pt-6 gap-4">

        <h1 className="text-kiosk-lg font-bold text-gray-900">
          {t('link_account_title')}
        </h1>

        <AnimatePresence mode="wait">

          {/* ── STEP: Enter consumer number ──────────────── */}
          {step === 'enter' && (
            <motion.div key="enter"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}
              className="flex flex-col gap-5 flex-1"
            >
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-1">
                  {t('consumer_no_help_title')}
                </p>
                <p className="text-sm text-blue-700">
                  {t('consumer_no_help_desc')}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  {t('consumer_no_help_example')}
                </p>
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  {t('consumer_number')}
                </label>
                <input
                  type="text"
                  value={consumerNo}
                  onChange={e => { setConsumerNo(e.target.value); setErrMsg('') }}
                  placeholder={t('consumer_no_hint')}
                  className={inputCls(errMsg)}
                  onKeyDown={e => e.key === 'Enter' && handleCheckConsumerNo()}
                />
                {errMsg && <p className="text-red-500 text-sm mt-2">{errMsg}</p>}
              </div>

              <div className="mt-auto">
                <button
                  onClick={handleCheckConsumerNo}
                  disabled={loading}
                  className={`btn-kiosk-primary w-full ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {loading ? t('loading') : t('continue')}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP: OTP verification ────────────────────── */}
          {step === 'otp' && (
            <motion.div key="otp"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}
              className="flex flex-col gap-5 flex-1"
            >
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  {t('ownership_verification')}
                </p>
                <p className="text-sm text-amber-700">
                  {t('account_diff_mobile')}{' '}
                  {t('otp_sent_to')}{' '}
                  <span className="font-bold">+91 {linkData?.maskedMobile}</span>
                  {' '}{t('registered_with_provider')}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  {t('ask_registered_holder_otp')}
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx}
                    className={`w-12 h-14 rounded-xl border-2 flex items-center
                      justify-center text-2xl font-bold transition-colors
                      ${otp[idx]
                        ? 'border-brand-blue bg-blue-50 text-brand-blue'
                        : idx === otp.length
                          ? 'border-brand-blue bg-white'
                          : 'border-gray-200 bg-gray-50 text-gray-300'}`}
                  >
                    {otp[idx] || (idx === otp.length ? '|' : '•')}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, idx) => (
                  <motion.button key={idx}
                    whileTap={{ scale: key ? 0.92 : 1 }}
                    onClick={() => {
                      if (key === '⌫') { setOtp(p => p.slice(0, -1)); setErrMsg('') }
                      else if (key && otp.length < 6) { setOtp(p => p + key); setErrMsg('') }
                    }}
                    disabled={!key || loading}
                    className={`min-h-[60px] rounded-xl text-xl font-semibold transition-colors
                      ${key === '⌫' ? 'bg-gray-100 text-gray-600 border-2 border-gray-200'
                        : key ? 'bg-white text-gray-900 border-2 border-gray-200 active:bg-gray-100'
                          : 'bg-transparent border-0 cursor-default'}`}
                  >
                    {key}
                  </motion.button>
                ))}
              </div>

              {errMsg && <p className="text-red-500 text-base text-center">{errMsg}</p>}

              <div className="mt-auto flex gap-3">
                <button
                  onClick={() => { setStep('enter'); setOtp(''); setErrMsg('') }}
                  className="flex-1 btn-kiosk-secondary"
                >
                  {t('back')}
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length !== 6}
                  className={`flex-1 btn-kiosk-primary
                    ${(loading || otp.length !== 6) ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {loading ? t('loading') : t('verify_otp')}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP: Verification form (not in DB) ───────── */}
          {step === 'verify_form' && (
            <motion.div key="verify_form"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}
              className="flex flex-col gap-4 flex-1 overflow-y-auto"
            >
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  {t('account_not_in_system')}
                </p>
                <p className="text-sm text-amber-700">
                  {t('account_not_in_system_desc', { consumerNo })}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <p className="text-xs text-gray-400">{t('consumer_no_prefilled')}</p>
                <p className="text-base font-semibold text-gray-800">{consumerNo}</p>
              </div>

              {/* Account holder name */}
              <Field label={t('account_holder_name_label')} hint={t('as_printed_on_bill')} error={vErrors.accountHolderName}>
                <input
                  type="text"
                  value={vForm.accountHolderName}
                  onChange={e => setV('accountHolderName', e.target.value)}
                  placeholder={t('full_name_on_bill')}
                  className={inputCls(vErrors.accountHolderName)}
                />
              </Field>

              {/* Provider name — REQUIRED — admin checks this utility's records */}
              <Field
                label={t('electricity_provider')}
                hint={t('provider_hint')}
                error={vErrors.providerName}
              >
                <select
                  value={vForm.providerName}
                  onChange={e => setV('providerName', e.target.value)}
                  className={inputCls(vErrors.providerName)}
                >
                  <option value="">{t('select_provider')}</option>
                  {PROVIDERS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>

              {/* Registered mobile */}
              <Field
                label={t('mobile_with_provider')}
                hint={t('mobile_with_provider_hint')}
                error={vErrors.registeredMobile}
              >
                <input
                  type="tel"
                  inputMode="numeric"
                  value={vForm.registeredMobile}
                  onChange={e => setV('registeredMobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder={t('mobile_placeholder')}
                  className={inputCls(vErrors.registeredMobile)}
                />
              </Field>

              {/* Address */}
              <Field
                label={t('service_address_label')}
                hint={t('service_address_hint')}
                error={vErrors.address}
              >
                <textarea
                  value={vForm.address}
                  onChange={e => setV('address', e.target.value)}
                  rows={3}
                  placeholder={t('address_placeholder')}
                  className={`${inputCls(vErrors.address)} resize-none`}
                />
              </Field>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-700">
                  {t('bring_bill_copy')}
                </p>
              </div>

              {errMsg && <p className="text-red-500 text-base text-center">{errMsg}</p>}

              <div className="mt-auto flex gap-3">
                <button
                  onClick={() => { setStep('enter'); setErrMsg('') }}
                  className="flex-1 btn-kiosk-secondary"
                >
                  {t('back')}
                </button>
                <button
                  onClick={handleSubmitVerification}
                  disabled={loading}
                  className={`flex-1 btn-kiosk-primary ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {loading ? t('loading') : t('submit_for_verification')}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP: Verification request status ─────────── */}
          {step === 'status' && verifyData && (
            <motion.div key="status"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}
              className="flex flex-col gap-5 flex-1"
            >
              <StatusCard
                status={verifyData.status}
                refNo={verifyData.refNo}
                submittedAt={verifyData.submittedAt}
                remarks={verifyData.remarks}
                canRetryLink={verifyData.canRetryLink}
                onRetryLink={handleCheckConsumerNo}
                onResubmit={() => { setVerifyData(null); setStep('verify_form') }}
              />
              <button
                onClick={() => navigate('/electricity/accounts')}
                className="btn-kiosk-secondary w-full"
              >
                {t('back_to_my_accounts')}
              </button>
            </motion.div>
          )}

          {/* ── STEP: Success ─────────────────────────────── */}
          {step === 'success' && linkedAcct && (
            <motion.div key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center flex-1 gap-6"
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
              >
                <span className="text-green-600 text-5xl">✓</span>
              </motion.div>

              <div className="text-center">
                <h2 className="text-kiosk-xl font-bold text-green-700 mb-2">{t('account_linked')}</h2>
                <p className="text-base text-gray-500">{linkedAcct.providerName} — {linkedAcct.accountNo}</p>
                <p className="text-sm text-gray-400 mt-1">{linkedAcct.address}</p>
              </div>

              <button
                onClick={() => navigate('/electricity/accounts')}
                className="btn-kiosk-primary w-full max-w-sm"
              >
                {t('view_my_bills')}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </KioskLayout>
  )
}

function StatusCard({ status, refNo, submittedAt, remarks, canRetryLink, onRetryLink, onResubmit }) {
  const { t } = useTranslation()
  const cfg = {
    PENDING: {
      color: 'bg-amber-50 border-amber-300',
      icon: '⏳',
      title: t('verification_pending'),
      desc: t('verification_pending_desc')
    },
    APPROVED: {
      color: 'bg-green-50 border-green-300',
      icon: '✓',
      title: t('verification_approved'),
      desc: t('verification_approved_desc')
    },
    REJECTED: {
      color: 'bg-red-50 border-red-300',
      icon: '✗',
      title: t('verification_rejected'),
      desc: t('verification_rejected_desc')
    }
  }[status] || { color: 'bg-gray-50 border-gray-300', icon: '?', title: t('status'), desc: '' }

  return (
    <div className={`rounded-2xl border-2 p-5 flex flex-col gap-3 ${cfg.color}`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{cfg.icon}</span>
        <div>
          <p className="text-base font-bold text-gray-900">{cfg.title}</p>
          <p className="text-sm text-gray-600">{cfg.desc}</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs text-gray-400">{t('reference_number')}</p>
        <p className="text-base font-bold font-mono text-gray-900">{refNo}</p>
        {submittedAt && (
          <p className="text-xs text-gray-400 mt-1">
            {t('submitted_label', {
              date: new Date(submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            })}
          </p>
        )}
      </div>

      {remarks && status === 'REJECTED' && (
        <div className="bg-red-100 rounded-xl p-3">
          <p className="text-sm text-red-700 font-semibold">{t('reason')}</p>
          <p className="text-sm text-red-600">{remarks}</p>
        </div>
      )}

      {status === 'APPROVED' && canRetryLink && (
        <button onClick={onRetryLink} className="btn-kiosk-primary mt-2">{t('link_account_now')}</button>
      )}
      {status === 'REJECTED' && (
        <button onClick={onResubmit} className="btn-kiosk-secondary mt-2">{t('resubmit_corrections')}</button>
      )}
    </div>
  )
}

function Field({ label, hint, error, children }) {
  return (
    <div>
      <label className="block text-base font-semibold text-gray-700 mb-1">
        {label}
        {hint && <span className="font-normal text-gray-400 text-sm ml-1">({hint})</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
}
