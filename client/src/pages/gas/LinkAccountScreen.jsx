import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import KioskLayout from '../../components/KioskLayout'
import { AnimatePresence } from 'framer-motion'



const GAS_PROVIDERS = [
    'Bhagyanagar Gas Limited (BGL)',
    'GAIL Gas', 'Adani Total Gas',
    'Indraprastha Gas (IGL)', 'Mahanagar Gas (MGL)',
    'Gujarat Gas', 'Torrent Gas', 'Other'
]

const LinkAccountScreen = () => {

    const navigate = useNavigate()
    const { t } = useTranslation()

    const [step, setStep] = useState('enter')
    const [consumerNo, setConsumerNo] = useState('')
    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)
    const [errMsg, setErrMsg] = useState('')
    const [linkData, setLinkData] = useState(null)
    const [linkedData, setLinkedData] = useState(null)
    const [linkedAcct, setLinkedAcct] = useState(null)
    const [verifyData, setVerifyData] = useState(null)
    const [vForm, setVForm] = useState({ accountHolderName: '', registeredMobile: '', address: '', providerName: '' })
    const [vErrors, setVErrors] = useState({})

    const setV = (k, v) => { setVForm(p => ({ ...p, [k]: v })); setVErrors(p => ({ ...p, [k]: '' })) }

    const inputCls = (err) =>
        `w-full px-4 py-3 rounded-xl border-2 text-base outline-none transition-colors
    ${err ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-brand-blue focus:bg-white'}`

    const handleCheckConsumerNo = async () => {
        if (!consumerNo.trim()) {
            setErrMsg('Please enter your gas consumer number'); return
        }
        setLoading(true)
        setErrMsg('')
        try {
            const { data } = await api.post('/core/gas/accounts/verify-ownership', { consumerNo: consumerNo.trim() })
            if (data.linked) { setLinkedAcct(data.account); setStep('success') }
            else if (data.requiresOtp) { setLinkData(data); setStep('otp') }
            else if (!data.found) {
                if (data.verificationRequest?.exists) { setVerifyData(data.verificationRequest); setStep('status') }
                else setStep('verify_form')
            }
        } catch (err) { setErrMsg(err.response?.data?.error || t('error_generic')) }
        finally { setLoading(false) }
    }

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) { setErrMsg('Enter the 6-digit OTP'); return }
        setLoading(true); setErrMsg('')
        try {
            const { data } = await api.post('/core/gas/accounts/confirm-link', { consumerNo: consumerNo.trim(), otp })
            setLinkedAcct(data.account); setStep('success')
        } catch (err) { setErrMsg(err.response?.data?.error || t('error_generic')); setOtp('') }
        finally { setLoading(false) }
    }

    const validateVForm = () => {
        const errs = {}
        if (!vForm.accountHolderName.trim() || vForm.accountHolderName.trim().length < 2) errs.accountHolderName = 'Enter name as printed on your gas bill'
        if (!vForm.providerName) errs.providerName = 'Please select your gas provider'
        if (!/^[6-9]\d{9}$/.test(vForm.registeredMobile)) errs.registeredMobile = 'Enter the 10-digit mobile registered with your gas provider'
        if (!vForm.address.trim() || vForm.address.trim().length < 10) errs.address = 'Enter the full service address'
        setVErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmitVerification = async () => {
        if (!validateVForm()) return
        setLoading(true); setErrMsg('')
        try {
            const { data } = await api.post('/core/gas/accounts/request-verification', {
                consumerNo: consumerNo.trim(), accountHolderName: vForm.accountHolderName.trim(),
                registeredMobile: vForm.registeredMobile.trim(), address: vForm.address.trim(), providerName: vForm.providerName
            })
            setVerifyData({ exists: true, status: 'PENDING', refNo: data.refNo, submittedAt: data.submittedAt })
            setStep('status')
        } catch (err) {
            if (err.response?.status === 409) { setVerifyData({ exists: true, status: 'PENDING', refNo: err.response.data.refNo }); setStep('status') }
            else setErrMsg(err.response?.data?.error || t('error_generic'))
        } finally { setLoading(false) }
    }

    return (
        <KioskLayout>
            <div className='flex flex-col h-full px-8 pt-6 gap-4'>
                <h1 className='text-kiosk-lg font-bold text-gray-900'>Link Gas Account</h1>

                <AnimatePresence mode="wait">
                    {step === 'enter' && (
                        <motion.div key="enter" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="flex flex-col gap-5 flex-1">
                            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                                <p className="text-sm font-semibold text-orange-800 mb-1">Where to find your consumer number</p>
                                <p className="text-sm text-orange-700">Printed on your gas bill under <span className="font-bold">"Consumer No."</span> or <span className="font-bold">"BP Number"</span></p>
                                <p className="text-xs text-orange-500 mt-1">Example: GAS-HYD-44521</p>
                            </div>
                            <div>
                                <label className="block text-base font-semibold text-gray-700 mb-2">Gas Consumer Number</label>
                                <input type="text" value={consumerNo} onChange={e => { setConsumerNo(e.target.value); setErrMsg('') }} placeholder="e.g. GAS-HYD-44521" className={inputCls(errMsg)} onKeyDown={e => e.key === 'Enter' && handleCheckConsumerNo()} />
                                {errMsg && <p className="text-red-500 text-sm mt-2">{errMsg}</p>}
                            </div>
                            <div className="mt-auto">
                                <button onClick={handleCheckConsumerNo} disabled={loading} className={`btn-kiosk-primary w-full ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}>{loading ? t('loading') : 'Continue'}</button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'otp' && (
                        <motion.div key="otp" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="flex flex-col gap-5 flex-1">
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                <p className="text-sm font-semibold text-amber-800 mb-1">Ownership Verification Required</p>
                                <p className="text-sm text-amber-700">OTP sent to <span className="font-bold">+91 {linkData?.maskedMobile}</span> — the mobile registered with your gas provider.</p>
                            </div>
                            <div className="flex gap-3 justify-center">
                                {Array.from({ length: 6 }).map((_, idx) => (
                                    <div key={idx} className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-colors ${otp[idx] ? 'border-brand-blue bg-blue-50 text-brand-blue' : idx === otp.length ? 'border-brand-blue bg-white' : 'border-gray-200 bg-gray-50 text-gray-300'}`}>
                                        {otp[idx] || (idx === otp.length ? '|' : '•')}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, idx) => (
                                    <motion.button key={idx} whileTap={{ scale: key ? 0.92 : 1 }}
                                        onClick={() => { if (key === '⌫') { setOtp(p => p.slice(0, -1)); setErrMsg('') } else if (key && otp.length < 6) { setOtp(p => p + key); setErrMsg('') } }}
                                        disabled={!key || loading}
                                        className={`min-h-[60px] rounded-xl text-xl font-semibold transition-colors ${key === '⌫' ? 'bg-gray-100 text-gray-600 border-2 border-gray-200' : key ? 'bg-white text-gray-900 border-2 border-gray-200 active:bg-gray-100' : 'bg-transparent border-0 cursor-default'}`}
                                    >{key}</motion.button>
                                ))}
                            </div>
                            {errMsg && <p className="text-red-500 text-base text-center">{errMsg}</p>}
                            <div className="mt-auto flex gap-3">
                                <button onClick={() => { setStep('enter'); setOtp(''); setErrMsg('') }} className="flex-1 btn-kiosk-secondary">Back</button>
                                <button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6} className={`flex-1 btn-kiosk-primary ${(loading || otp.length !== 6) ? 'opacity-40 cursor-not-allowed' : ''}`}>{loading ? t('loading') : 'Verify OTP'}</button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'verify_form' && (
                        <motion.div key="verify_form" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="flex flex-col gap-4 flex-1 overflow-y-auto">
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                <p className="text-sm font-semibold text-amber-800 mb-1">Account not in SUVIDHA system yet</p>
                                <p className="text-sm text-amber-700">Consumer number <span className="font-bold">{consumerNo}</span> is not registered. Fill in your details so our team can verify with BGL/GAIL records.</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                                <p className="text-xs text-gray-400">Consumer number</p>
                                <p className="text-base font-semibold text-gray-800">{consumerNo}</p>
                            </div>
                            <Field label="Account holder name" hint="As printed on your gas bill" error={vErrors.accountHolderName}>
                                <input type="text" value={vForm.accountHolderName} onChange={e => setV('accountHolderName', e.target.value)} placeholder="Full name on the bill" className={inputCls(vErrors.accountHolderName)} />
                            </Field>
                            <Field label="Gas provider" hint="Which company supplies gas to this address" error={vErrors.providerName}>
                                <select value={vForm.providerName} onChange={e => setV('providerName', e.target.value)} className={inputCls(vErrors.providerName)}>
                                    <option value="">Select your gas provider</option>
                                    {GAS_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </Field>
                            <Field label="Mobile registered with your gas provider" hint="The mobile on record with BGL/GAIL" error={vErrors.registeredMobile}>
                                <input type="tel" inputMode="numeric" value={vForm.registeredMobile} onChange={e => setV('registeredMobile', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" className={inputCls(vErrors.registeredMobile)} />
                            </Field>
                            <Field label="Service address" hint="Address where gas connection is installed" error={vErrors.address}>
                                <textarea value={vForm.address} onChange={e => setV('address', e.target.value)} rows={3} placeholder="House/Flat, Street, Area, City, Pincode" className={`${inputCls(vErrors.address)} resize-none`} />
                            </Field>
                            {errMsg && <p className="text-red-500 text-base text-center">{errMsg}</p>}
                            <div className="mt-auto flex gap-3">
                                <button onClick={() => { setStep('enter'); setErrMsg('') }} className="flex-1 btn-kiosk-secondary">Back</button>
                                <button onClick={handleSubmitVerification} disabled={loading} className={`flex-1 btn-kiosk-primary ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}>{loading ? t('loading') : 'Submit for Verification'}</button>
                            </div>
                        </motion.div>
                    )}


                    {step === 'status' && verifyData && (
                        <motion.div key="status" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="flex flex-col gap-5 flex-1">
                            <StatusCard status={verifyData.status} refNo={verifyData.refNo} submittedAt={verifyData.submittedAt} remarks={verifyData.remarks} canRetryLink={verifyData.canRetryLink} onRetryLink={handleCheckConsumerNo} onResubmit={() => { setVerifyData(null); setStep('verify_form') }} />
                            <button onClick={() => navigate('/gas/accounts')} className="btn-kiosk-secondary w-full">Back to My Gas Accounts</button>
                        </motion.div>
                    )}

                    {step === 'success' && linkedAcct && (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center flex-1 gap-6">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-green-600 text-5xl">✓</span>
                            </motion.div>
                            <div className="text-center">
                                <h2 className="text-kiosk-xl font-bold text-green-700 mb-2">Gas Account Linked!</h2>
                                <p className="text-base text-gray-500">{linkedAcct.providerName} — {linkedAcct.accountNo}</p>
                                <p className="text-sm text-gray-400 mt-1">{linkedAcct.address}</p>
                            </div>
                            <button onClick={() => navigate('/gas/accounts')} className="btn-kiosk-primary w-full max-w-sm">View My Bills</button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </KioskLayout>
    )
}


function StatusCard({ status, refNo, submittedAt, remarks, canRetryLink, onRetryLink, onResubmit }) {
    const cfg = {
        PENDING: { color: 'bg-amber-50 border-amber-300', icon: '⏳', title: 'Verification Pending', desc: 'Our team is checking with your gas provider. Usually 1–2 working days.' },
        APPROVED: { color: 'bg-green-50 border-green-300', icon: '✓', title: 'Verification Approved', desc: 'Your account is verified. You can now link it.' },
        REJECTED: { color: 'bg-red-50 border-red-300', icon: '✗', title: 'Verification Rejected', desc: 'Please check the reason and resubmit.' }
    }[status] || { color: 'bg-gray-50 border-gray-300', icon: '?', title: 'Unknown', desc: '' }

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
                <p className="text-xs text-gray-400">Reference Number</p>
                <p className="text-base font-bold font-mono text-gray-900">{refNo}</p>
                {submittedAt && <p className="text-xs text-gray-400 mt-1">Submitted: {new Date(submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
            </div>
            {remarks && status === 'REJECTED' && <div className="bg-red-100 rounded-xl p-3"><p className="text-sm text-red-700 font-semibold">Reason:</p><p className="text-sm text-red-600">{remarks}</p></div>}
            {status === 'APPROVED' && canRetryLink && <button onClick={onRetryLink} className="btn-kiosk-primary mt-2">Link Account Now</button>}
            {status === 'REJECTED' && <button onClick={onResubmit} className="btn-kiosk-secondary mt-2">Resubmit with Corrections</button>}
        </div>
    )
}

function Field({ label, hint, error, children }) {
    return (
        <div>
            <label className="block text-base font-semibold text-gray-700 mb-1">
                {label}{hint && <span className="font-normal text-gray-400 text-sm ml-1">({hint})</span>}
            </label>
            {children}
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    )
}

export default LinkAccountScreen