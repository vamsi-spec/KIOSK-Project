import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import api from '../../lib/axios.js'
import KioskLayout from '../../components/KioskLayout.jsx'

export default function GasMeterReadingScreen() {
    const navigate = useNavigate()
    const { t } = useTranslation()

    const [accounts, setAccounts] = useState([])
    const [selectedAcc, setSelectedAcc] = useState(null)
    const [history, setHistory] = useState(null)
    const [reading, setReading] = useState('')
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [errMsg, setErrMsg] = useState('')
    const [done, setDone] = useState(null)

    useEffect(() => { fetchAccounts() }, [])

    const fetchAccounts = async () => {
        setFetching(true)
        try {
            const { data } = await api.get('/core/gas/accounts/mine')
            setAccounts(data.accounts)
            if (data.accounts.length === 1) handleSelectAccount(data.accounts[0])
        } catch (err) { setErrMsg(err.response?.data?.error || t('error_generic')) }
        finally { setFetching(false) }
    }

    const handleSelectAccount = async (account) => {
        setSelectedAcc(account); setLoading(true); setHistory(null); setErrMsg('')
        try {
            const { data } = await api.get(`/core/gas/meter/history/${account.id}`)
            setHistory(data)
        } catch (err) { setErrMsg(err.response?.data?.error || t('error_generic')) }
        finally { setLoading(false) }
    }

    const lastVerifiedReading = history?.readings?.[0] ? Number(history.readings[0].readingValue) : 0
    const currentReadingNum = Number(reading)
    const unitsConsumed = reading && currentReadingNum > lastVerifiedReading
        ? (currentReadingNum - lastVerifiedReading).toFixed(2)
        : null

    const handleSubmit = async () => {
        if (!reading || isNaN(currentReadingNum)) { setErrMsg('Please enter a valid meter reading'); return }
        if (currentReadingNum < lastVerifiedReading) { setErrMsg(`Reading cannot be less than previous (${lastVerifiedReading} SCM)`); return }
        setLoading(true); setErrMsg('')
        try {
            const { data } = await api.post('/core/gas/meter/submit', { accountId: selectedAcc.id, readingValue: currentReadingNum })
            setDone(data)
        } catch (err) { setErrMsg(err.response?.data?.error || t('error_generic')) }
        finally { setLoading(false) }
    }

    if (done) {
        return (
            <KioskLayout showBack={false} showHome={true}>
                <div className="flex flex-col items-center justify-center h-full px-8 gap-6">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-600 text-5xl">✓</span>
                    </motion.div>
                    <div className="text-center">
                        <h1 className="text-kiosk-xl font-bold text-green-700 mb-2">Reading Submitted</h1>
                        <p className="text-base text-gray-500">Pending admin verification.</p>
                    </div>
                    <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-200 p-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center"><p className="text-xs text-gray-400 mb-1">Previous Reading</p><p className="text-xl font-bold text-gray-700">{done.previousReadingValue} SCM</p></div>
                            <div className="text-center"><p className="text-xs text-gray-400 mb-1">Current Reading</p><p className="text-xl font-bold text-gray-900">{done.readingValue} SCM</p></div>
                        </div>
                        <div className="text-center mt-4 border-t border-gray-200 pt-4">
                            <p className="text-xs text-gray-400 mb-1">Gas Consumed</p>
                            <p className="text-kiosk-xl font-bold text-brand-blue">{done.unitsConsumed} SCM</p>
                        </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 w-full max-w-sm">
                        <p className="text-sm text-amber-700 text-center">
                            A bill will be generated after verification. Gas bills are issued every 2 months.
                        </p>
                    </div>
                    <button onClick={() => navigate('/home', { replace: true })} className="btn-kiosk-primary w-full max-w-sm">{t('done')}</button>
                </div>
            </KioskLayout>
        )
    }

    return (
        <KioskLayout>
            <div className="flex flex-col h-full px-8 pt-6 gap-5">
                <h1 className="text-kiosk-lg font-bold text-gray-900">Submit Gas Meter Reading</h1>

                {fetching && <div className="flex-1 flex items-center justify-center"><p className="text-gray-400">{t('loading')}</p></div>}

                {!fetching && accounts.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <p className="text-gray-500 text-base text-center">No linked gas accounts. Please link an account first.</p>
                        <button onClick={() => navigate('/gas/link-account')} className="btn-kiosk-primary max-w-sm w-full">Link Account</button>
                    </div>
                )}

                {!fetching && !selectedAcc && accounts.length > 1 && (
                    <div className="flex flex-col gap-3">
                        <p className="text-base text-gray-500">Select account:</p>
                        {accounts.map(acc => (
                            <button key={acc.id} onClick={() => handleSelectAccount(acc)} className="flex items-center justify-between p-4 rounded-2xl border-2 border-gray-200 bg-white active:scale-98 transition-transform text-left">
                                <div><p className="text-base font-semibold text-gray-900">{acc.accountNo}</p><p className="text-sm text-gray-500">{acc.providerName}</p><p className="text-xs text-gray-400">{acc.address}</p></div>
                                <span className="text-brand-blue text-lg">→</span>
                            </button>
                        ))}
                    </div>
                )}

                {selectedAcc && (
                    <>
                        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                            <div className="flex justify-between items-center">
                                <div><p className="text-base font-bold text-gray-900">{selectedAcc.accountNo}</p><p className="text-sm text-gray-500">{selectedAcc.providerName}</p></div>
                                {accounts.length > 1 && <button onClick={() => { setSelectedAcc(null); setHistory(null); setReading('') }} className="text-brand-blue text-sm font-semibold">Change</button>}
                            </div>
                        </div>

                        {history?.pendingReading && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                <p className="text-sm text-amber-700 font-semibold">Reading already submitted</p>
                                <p className="text-sm text-amber-600">Value: {Number(history.pendingReading.readingValue)} SCM — Submitted {new Date(history.pendingReading.submittedAt).toLocaleDateString('en-IN')}</p>
                                <p className="text-xs text-amber-500 mt-1">Please wait for verification before submitting again.</p>
                            </div>
                        )}

                        {!loading && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                <p className="text-sm text-blue-700 font-semibold">Last verified reading</p>
                                <p className="text-xl font-bold text-blue-900 mt-1">{lastVerifiedReading > 0 ? `${lastVerifiedReading} SCM` : 'No previous reading on record'}</p>
                            </div>
                        )}

                        {!history?.pendingReading && (
                            <>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-2">Current meter reading (SCM)</label>
                                    <input
                                        type="number" inputMode="decimal" value={reading}
                                        onChange={e => { setReading(e.target.value); setErrMsg('') }}
                                        placeholder="Enter the number on your meter dial"
                                        min={lastVerifiedReading} step="0.1"
                                        className={`w-full px-4 py-3 rounded-xl border-2 text-kiosk-base font-bold outline-none transition-colors ${errMsg ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-brand-blue'}`}
                                    />
                                    {errMsg && <p className="text-red-500 text-sm mt-1">{errMsg}</p>}
                                </div>

                                {unitsConsumed && (
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 border border-green-200 rounded-xl p-3 flex justify-between items-center">
                                        <p className="text-sm text-green-700 font-semibold">Gas consumed this period</p>
                                        <p className="text-xl font-bold text-green-800">{unitsConsumed} SCM</p>
                                    </motion.div>
                                )}

                                {unitsConsumed && Number(unitsConsumed) < 4 && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                                        <p className="text-sm text-orange-700">
                                            Consumption is below the minimum of 4 SCM. A minimum charge of 4 SCM will be applied on your bill.
                                        </p>
                                    </div>
                                )}

                                <div className="mt-auto">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading || !reading || currentReadingNum < lastVerifiedReading}
                                        className={`btn-kiosk-primary w-full ${(loading || !reading || currentReadingNum < lastVerifiedReading) ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    >
                                        {loading ? t('loading') : 'Submit Reading'}
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </KioskLayout>
    )
}