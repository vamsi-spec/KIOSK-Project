import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/axios'
import KioskLayout from '../../components/KioskLayout'
import { motion } from 'framer-motion'



const SAFETY_STEPS = [
    { icon: '🔴', text: 'Turn off the valve near your gas meter immediately' },
    { icon: '🪟', text: 'Open all doors and windows' },
    { icon: '⚡', text: 'Do NOT switch any electrical appliances on or off' },
    { icon: '🚶', text: 'Leave the premises immediately' },
    { icon: '🔥', text: 'Do NOT use any open flame or lighter' },
    { icon: '📵', text: 'Do NOT use your mobile phone inside the building' }
]

const EmergencyScreen = () => {

    const navigate = useNavigate()

    const [step, setStep] = useState('instructions')
    const [address, setAddress] = useState('')
    const [mobile, setMobile] = useState('')
    const [desc, setDesc] = useState('')
    const [loading, setLoading] = useState(false)
    const [errMsg, setErrMsg] = useState('')
    const [result, setResult] = useState(null)

    const handleReport = async () => {
        if (!address.trim()) { setErrMsg('Please enter the location of the leak'); return }
        if (!/^[6-9]\d{9}$/.test(mobile)) { setErrMsg('Please enter a valid mobile number'); return }

        setLoading(true)
        setErrMsg('')
        try {
            const { data } = await api.post('/core/gas/complaints/emergency', {
                address: address.trim(),
                mobileForCallback: mobile.trim(),
                description: desc.trim() || undefined
            })
            setResult(data)
            setStep('success')
        } catch (err) {
            setErrMsg(err.response?.data?.error || 'Could not submit. Please call the helpline directly.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <KioskLayout showBack={step === 'form'} showHome={false}>

            <div className='flex flex-col h-full px-8 pt-6 gap-4'>
                {step === 'instructions' && (
                    <>
                        <motion.div
                            animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                            className='bg-red-600 rounded-2xl p-4 flex items-center gap-3'
                        >

                            <span style={{ fontSize: 32 }}>🚨</span>
                            <div>
                                <p className='text-white text-lg font-bold'>GAS LEAK EMERGENCY</p>
                                <p className='text-red-100 text-sm'>
                                    Follow these steps immediately
                                </p>
                            </div>
                        </motion.div>

                        <div className="flex flex-col gap-3 flex-1">
                            {SAFETY_STEPS.map((s, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.08 }}
                                    className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3"
                                >
                                    <span style={{ fontSize: 24, minWidth: 32 }}>{s.icon}</span>
                                    <p className="text-base font-medium text-gray-900">{s.text}</p>
                                </motion.div>
                            ))}
                        </div>

                        <div className='flex flex-col gap-3 pb-2'>
                            <div className='bg-gray-900 rounded-2xl p-4 text-center'>
                                <p className='text-white text-sm mb-1'>Call emergency helpline directly</p>
                                <p className="text-red-400 text-2xl font-bold">040-23234701</p>
                                <p className="text-gray-400 text-sm mt-1">National Helpline: 1906</p>
                            </div>

                            <button
                                onClick={() => setStep('form')}
                                className="w-full min-h-[60px] rounded-2xl bg-red-600 text-white text-lg font-bold active:scale-95 transition-transform"
                            >
                                Report This Emergency →
                            </button>

                            <button
                                onClick={() => navigate('/gas')}
                                className="w-full min-h-[56px] rounded-2xl border-2 border-gray-300 text-gray-600 text-base font-semibold active:scale-95 transition-transform"
                            >
                                Not an emergency — go back
                            </button>

                        </div>
                    </>
                )}


                {step === 'form' && (
                    <>

                        <div className="bg-red-50 border border-red-300 rounded-2xl p-4">
                            <p className="text-red-700 text-base font-semibold">🚨 Emergency Report — No login required</p>
                            <p className="text-red-600 text-sm mt-1">Our team will respond immediately after you submit.</p>
                        </div>


                        <div>
                            <label className="block text-base font-semibold text-gray-700 mb-2">Location of gas leak *</label>
                            <textarea
                                value={address}
                                onChange={e => { setAddress(e.target.value); setErrMsg('') }}
                                rows={3}
                                placeholder="House/Flat number, Street, Area, City..."
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-base outline-none resize-none focus:border-red-500"
                            />
                        </div>


                        <div>
                            <label className="block text-base font-semibold text-gray-700 mb-2">Your mobile number (for callback) *</label>
                            <input
                                type="tel"
                                inputMode="numeric"
                                value={mobile}
                                onChange={e => { setMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setErrMsg('') }}
                                placeholder="10-digit mobile number"
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-base outline-none focus:border-red-500"
                            />
                        </div>

                        <div>
                            <label className="block text-base font-semibold text-gray-700 mb-2">Additional details (optional)</label>
                            <input
                                type="text"
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                                placeholder="e.g. smell from kitchen, hissing sound..."
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-base outline-none focus:border-red-500"
                            />
                        </div>

                        {errMsg && <p className="text-red-500 text-base">{errMsg}</p>}



                        <div className="mt-auto">
                            <button
                                onClick={handleReport}
                                disabled={loading}
                                className={`w-full min-h-[60px] rounded-2xl bg-red-600 text-white text-lg font-bold active:scale-95 transition-transform ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Submitting emergency report...' : '🚨 Submit Emergency Report'}
                            </button>
                        </div>

                    </>
                )}



                {step === 'success' && result && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center flex-1 gap-5"
                    >
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                            className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
                        >
                            <span className="text-green-600 text-5xl">✓</span>
                        </motion.div>

                        <div className="text-center">
                            <h1 className="text-kiosk-xl font-bold text-green-700 mb-2">Emergency Reported</h1>
                            <p className="text-base text-gray-600">Our team has been alerted and will respond immediately.</p>
                        </div>

                        <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-200 p-5">
                            <p className="text-sm text-gray-500 mb-1">Reference Number</p>
                            <p className="text-xl font-bold font-mono text-brand-blue mb-4">{result.refNo}</p>
                            <p className="text-sm font-semibold text-gray-700 mb-2">Emergency instructions:</p>
                            {result.instructions?.map((inst, idx) => (
                                <p key={idx} className="text-xs text-gray-600 mb-1">• {inst}</p>
                            ))}
                        </div>

                        <div className="bg-gray-900 rounded-2xl p-4 text-center w-full">
                            <p className="text-white text-sm mb-1">Also call directly:</p>
                            <p className="text-red-400 text-2xl font-bold">{result.emergencyPhone}</p>
                        </div>

                        <button
                            onClick={() => navigate('/', { replace: true })}
                            className="btn-kiosk-primary w-full max-w-sm"
                        >
                            Return to Home Screen
                        </button>
                    </motion.div>
                )}

            </div>

        </KioskLayout>
    )
}

export default EmergencyScreen