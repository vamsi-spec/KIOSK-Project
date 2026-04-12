import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import api from '../../lib/axios.js'
import KioskLayout from '../../components/KioskLayout.jsx'

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

const CATEGORY_LABEL_KEYS = {
    'Power outage': 'cat_power_outage',
    'Voltage fluctuation': 'cat_voltage_fluctuation',
    'Meter fault': 'cat_meter_fault',
    'Billing error': 'cat_billing_error',
    'Transformer issue': 'cat_transformer_issue',
    'Line damage': 'cat_line_damage',
    'Street light issue': 'cat_street_light',
    Other: 'cat_other'
}

const PROPERTY_LABEL_KEYS = {
    RESIDENTIAL: 'residential',
    COMMERCIAL: 'commercial',
    INDUSTRIAL: 'industrial'
}

export default function TrackComplaint() {
    const { t } = useTranslation()
    const [refNo, setRefNo] = useState('')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [errMsg, setErrMsg] = useState('')

    const formatCategory = (value) => t(CATEGORY_LABEL_KEYS[value] || value)
    const formatPropertyType = (value) => t(PROPERTY_LABEL_KEYS[value] || value)
    const formatProvider = (value) => value === 'To be assigned' ? t('provider_unknown') : value

    const handleTrack = async () => {
        if (!refNo.trim()) { setErrMsg(t('error_enter_ref')); return }
        setLoading(true)
        setErrMsg('')
        setResult(null)

        const ref = refNo.trim().toUpperCase()

        // Try complaints → connections → verification requests
        try {
            const { data } = await api.get(`/core/electricity/complaints/${ref}`)
            setResult({ ...data, type: 'complaint' })
            setLoading(false)
            return
        } catch { /* not found — try next */ }

        try {
            const { data } = await api.get(`/core/electricity/connections/track/${ref}`)
            setResult({ ...data, type: 'connection' })
            setLoading(false)
            return
        } catch { /* not found — try next */ }

        try {
            const { data } = await api.get(`/core/electricity/accounts/verification-status/${ref}`)
            setResult({ ...data, type: 'verification' })
            setLoading(false)
            return
        } catch {
            setErrMsg(t('ref_not_found'))
        }

        setLoading(false)
    }

    const typeLabel = {
        complaint: t('type_complaint'),
        connection: t('type_connection'),
        verification: t('type_verification')
    }

    return (
        <KioskLayout>
            <div className="flex flex-col h-full px-8 pt-6 gap-6">

                <h1 className="text-kiosk-lg font-bold text-gray-900">{t('track_title')}</h1>

                {/* Search input */}
                <div>
                    <label className="block text-base font-semibold text-gray-700 mb-2">
                        {t('enter_ref_no')}
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={refNo}
                            onChange={e => { setRefNo(e.target.value.toUpperCase()); setErrMsg('') }}
                            placeholder={t('ref_no_hint')}
                            className={`flex-1 px-4 py-3 rounded-xl border-2 text-base font-mono
                outline-none transition-colors
                ${errMsg
                                    ? 'border-red-400 bg-red-50'
                                    : 'border-gray-200 bg-gray-50 focus:border-brand-blue'}`}
                            onKeyDown={e => e.key === 'Enter' && handleTrack()}
                        />
                        <button
                            onClick={handleTrack}
                            disabled={loading}
                            className={`px-6 min-h-[56px] rounded-xl bg-brand-blue text-white
                font-semibold text-base active:scale-95 transition-transform
                ${loading ? 'opacity-40' : ''}`}
                        >
                            {loading ? t('loading') : t('track')}
                        </button>
                    </div>
                    {errMsg && <p className="text-red-500 text-sm mt-2">{errMsg}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                        {t('track_hint')}
                    </p>
                </div>

                {/* Result */}
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50 rounded-2xl border border-gray-200 p-5 flex flex-col gap-3"
                    >
                        {/* Type + status */}
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 font-medium">
                                {typeLabel[result.type] || t('request_label')}
                            </p>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold
                ${STATUS_COLORS[result.status] || 'bg-gray-100 text-gray-600'}`}>
                                {t(`status_${result.status?.toLowerCase()}`) || result.status}
                            </span>
                        </div>

                        <div className="border-t border-gray-200 pt-3 flex flex-col gap-2">
                            <Row label={t('ref_no')} value={result.refNo} mono />

                            {/* Complaint specific */}
                            {result.category && <Row label={t('complaint_category')} value={formatCategory(result.category)} />}
                            {result.description && (
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">{t('description_label')}</p>
                                    <p className="text-sm text-gray-700">{result.description}</p>
                                </div>
                            )}

                            {/* Connection specific */}
                            {result.propertyType && <Row label={t('property_type')} value={formatPropertyType(result.propertyType)} />}
                            {result.providerName && <Row label={t('provider')} value={formatProvider(result.providerName)} />}

                            {/* Verification specific */}
                            {result.accountHolderName && <Row label={t('account_holder')} value={result.accountHolderName} />}
                            {result.consumerNo && <Row label={t('consumer_no_label')} value={result.consumerNo} />}

                            {result.assignedTo && <Row label={t('assigned_to')} value={result.assignedTo} />}

                            <Row label={t('filed_on')}
                                value={new Date(result.createdAt || result.submittedAt).toLocaleDateString('en-IN', {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                })} />

                            {result.resolvedAt && (
                                <Row label={t('resolved_on')}
                                    value={new Date(result.resolvedAt).toLocaleDateString('en-IN', {
                                        day: 'numeric', month: 'short', year: 'numeric'
                                    })} />
                            )}
                        </div>

                        {/* Resolution note */}
                        {result.resolutionNote && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-1">
                                <p className="text-sm text-green-700 font-semibold mb-1">{t('resolution_note')}</p>
                                <p className="text-sm text-green-600">{result.resolutionNote}</p>
                            </div>
                        )}

                        {/* Rejection remarks */}
                        {result.remarks && result.status === 'REJECTED' && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-1">
                                <p className="text-sm text-red-700 font-semibold mb-1">{t('rejection_reason')}</p>
                                <p className="text-sm text-red-600">{result.remarks}</p>
                            </div>
                        )}

                        {/* Approved verification — linkable */}
                        {result.type === 'verification' && result.status === 'APPROVED' && result.linkable && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-1">
                                <p className="text-sm text-green-700 font-semibold">
                                    {t('account_verified_link')}
                                </p>
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
            <span className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono' : ''}`}>
                {value}
            </span>
        </div>
    )
}
