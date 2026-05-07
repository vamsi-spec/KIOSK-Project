import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import KioskLayout from '../../components/KioskLayout'
import api from '../../lib/axios'
import { motion } from 'framer-motion'



const STATUS_COLORS = {
    SUBMITTED: 'bg-blue-100 text-blue-700',
    ACKNOWLEDGED: 'bg-yellow-100 text-yellow-700',
    IN_PROGRESS: 'bg-orange-100 text-orange-700',
    RESOLVED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-600',
    UNDER_REVIEW: 'bg-purple-100 text-purple-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    PENDING: 'bg-amber-100 text-amber-700'
}

const TrackComplaint = () => {

    const { t } = useTranslation()
    const [refNo, setRefNo] = useState('')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [errMsg, setErrMsg] = useState('')

    const handleTrack = async () => {
        if (!refNo.trim()) {
            setErrMsg('Please enter the reference number')
            return
        }
        setLoading(true)
        setErrMsg('')
        setResult(null)

        const ref = refNo.trim().toUpperCase()
        // Try complaints → connections → verification requests

        for (const [endpoint, type] of [
            [`/core/gas/complaints/${ref}`, 'complaint'],
            [`/core/gas/connections/track/${ref}`, 'connection'],
            [`/core/gas/accounts/verification-status/${ref}`, 'verification']
        ]) {
            try {
                const { data } = await api.get(endpoint)
                setResult({ ...data, type })
                setLoading(false)
                return
            } catch { /* try next */ }
        }

        setErrMsg('Reference number not found. Please check and try again.')
        setLoading(false)
    }

    const typeLabel = { complaint: 'Gas Complaint', connection: 'Gas Connection Application', verification: 'Account Verification Request' }


    return (
        <KioskLayout>
            <div className='flex flex-col h-full px-8 pt-6 gap-6'>
                <h1 className='text-kiosk-lg font-bold text-gray-900'>Track Gas Request</h1>

                <div>
                    <label htmlFor="" className='block text-base font-semibol text-gray-700 mb-2 '>Enter reference number</label>
                    <div className='flex gap-3'>
                        <input type="text" value={refNo} onChange={e => { setRefNo(e.target.value.toUpperCase()); setErrMsg('') }} placeholder='e.g. COMP-2025-00001' className={`flex-1 px-4 py-3 rounded-xl border-2 text-base font-mono outline-none transition-colors ${errMsg ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus: border-brand-blue'}`} onKeyDown={e => e.key === 'Enter' && handleTrack()} />
                        <button onClick={handleTrack} disabled={loading}
                            className={`px-6 min-h-[56px] rounded-xl bg-brand-blue text-white font-semibold text-base active:scale-95 transition-transform ${loading ? 'opacity-40' : ''}`}
                        >
                            {loading ? '...' : 'Track'}
                        </button>
                    </div>
                    {errMsg && <p className="text-red-500 text-sm mt-2">{errMsg}</p>}
                    <p className="text-xs text-gray-400 mt-2">Works for: COMP-XXXX-XXXXX · CONN-XXXX-XXXXX · AVR-XXXX-XXXXX</p>

                </div>

                {result && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 rounded-2xl border border-gray-200 p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 font-medium">{typeLabel[result.type] || 'Request'}</p>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[result.status] || 'bg-gray-100 text-gray-600'}`}>
                                {result.status?.replace('_', ' ')}
                            </span>
                        </div>

                        {result.isEmergency && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                <p className="text-sm text-red-700 font-semibold">🚨 This was an emergency gas leak report</p>
                            </div>
                        )}

                        <div className="border-t border-gray-200 pt-3 flex flex-col gap-2">
                            <Row label="Reference No" value={result.refNo} mono />
                            {result.category && <Row label="Category" value={result.category} />}
                            {result.propertyType && <Row label="Property Type" value={result.propertyType} />}
                            {result.connectionType && <Row label="Connection" value={result.connectionType} />}
                            {result.providerName && <Row label="Provider" value={result.providerName} />}
                            {result.accountHolderName && <Row label="Account Holder" value={result.accountHolderName} />}
                            {result.consumerNo && <Row label="Consumer No" value={result.consumerNo} />}
                            {result.assignedTo && <Row label="Assigned to" value={result.assignedTo} />}
                            <Row label="Filed on"
                                value={new Date(result.createdAt || result.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                            {result.resolvedAt && (
                                <Row label="Resolved on" value={new Date(result.resolvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                            )}
                        </div>

                        {result.resolutionNote && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-1">
                                <p className="text-sm text-green-700 font-semibold mb-1">Resolution</p>
                                <p className="text-sm text-green-600">{result.resolutionNote}</p>
                            </div>
                        )}

                        {result.remarks && result.status === 'REJECTED' && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-1">
                                <p className="text-sm text-red-700 font-semibold mb-1">Rejection Reason</p>
                                <p className="text-sm text-red-600">{result.remarks}</p>
                            </div>
                        )}

                        {result.resolutionNote && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-1">
                                <p className="text-sm text-green-700 font-semibold mb-1">Resolution</p>
                                <p className="text-sm text-green-600">{result.resolutionNote}</p>
                            </div>
                        )}

                        {result.remarks && result.status === 'REJECTED' && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-1">
                                <p className="text-sm text-red-700 font-semibold mb-1">Rejection Reason</p>
                                <p className="text-sm text-red-600">{result.remarks}</p>
                            </div>
                        )}

                    </motion.div>
                )}

            </div>
        </KioskLayout>
    )
}

function Row({ label, value, mono }) {
    return (
        <div className="flex justify-between items-center py-1">
            <span className="text-sm text-gray-500">{label}</span>
            <span className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
        </div>
    )
}

export default TrackComplaint