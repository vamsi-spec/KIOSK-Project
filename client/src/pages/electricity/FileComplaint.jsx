import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import api from '../../lib/axios.js'
import KioskLayout from '../../components/KioskLayout.jsx'

const CATEGORIES = [
    { value: 'Power outage', key: 'cat_power_outage' },
    { value: 'Voltage fluctuation', key: 'cat_voltage_fluctuation' },
    { value: 'Meter fault', key: 'cat_meter_fault' },
    { value: 'Billing error', key: 'cat_billing_error' },
    { value: 'Transformer issue', key: 'cat_transformer_issue' },
    { value: 'Line damage', key: 'cat_line_damage' },
    { value: 'Street light issue', key: 'cat_street_light' },
    { value: 'Other', key: 'cat_other' }
]

export default function FileComplaint() {
    const navigate = useNavigate()
    const { t } = useTranslation()

    const [form, setForm] = useState({ category: '', description: '' })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [needsLinkedAccount, setNeedsLinkedAccount] = useState(false)

    const set = (k, v) => {
        setForm(p => ({ ...p, [k]: v }))
        setErrors(p => ({ ...p, [k]: '' }))
    }

    const validate = () => {
        const errs = {}
        if (!form.category) errs.category = t('error_select_category')
        if (!form.description.trim() || form.description.trim().length < 10)
            errs.description = t('error_describe_issue')
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const getCategoryLabel = (value) => {
        const match = CATEGORIES.find(c => c.value === value)
        return match ? t(match.key) : value
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        setNeedsLinkedAccount(false)
        try {
            const { data } = await api.post('/core/electricity/complaints', {
                category: form.category,
                description: form.description.trim()
            })
            setResult(data)
        } catch (err) {
            const code = err?.response?.data?.code
            if (code === 'NO_LINKED_ACCOUNT') {
                setErrors({ submit: t('no_linked_accounts') })
                setNeedsLinkedAccount(true)
            } else {
                setErrors({ submit: t('error_generic') })
            }
        } finally {
            setLoading(false)
        }
    }

    if (result) {
        return (
            <KioskLayout showBack={false} showHome={true}>
                <div className="flex flex-col items-center justify-center h-full px-8 gap-6">
                    <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
                    >
                        <span className="text-green-600 text-5xl">✓</span>
                    </motion.div>

                    <h1 className="text-kiosk-xl font-bold text-green-700 text-center">
                        {t('complaint_submitted')}
                    </h1>

                    <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-200 p-5">
                        <p className="text-sm text-gray-500 mb-1">{t('ref_no')}</p>
                        <p className="text-kiosk-lg font-bold text-brand-blue mb-3">{result.refNo}</p>
                        <p className="text-sm text-gray-500 mb-1">{t('complaint_category')}</p>
                        <p className="text-base font-semibold text-gray-800 mb-4">{getCategoryLabel(result.category)}</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                            <p className="text-xs text-blue-700">
                                {t('complaint_note')}
                            </p>
                        </div>
                    </div>

                    <button onClick={() => navigate('/home', { replace: true })} className="btn-kiosk-primary w-full max-w-sm">
                        {t('done')}
                    </button>
                </div>
            </KioskLayout>
        )
    }

    return (
        <KioskLayout>
            <div className="flex flex-col h-full px-8 pt-6 gap-5">

                <h1 className="text-kiosk-lg font-bold text-gray-900">{t('complaint_title')}</h1>

                {/* Category */}
                <div>
                    <label className="block text-base font-semibold text-gray-700 mb-2">
                        {t('complaint_category')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map(cat => (
                            <button key={cat.value} onClick={() => set('category', cat.value)}
                                className={`min-h-[52px] rounded-xl border-2 text-sm font-medium px-3 transition-colors
                  ${form.category === cat.value
                                        ? 'border-brand-blue bg-blue-50 text-brand-blue'
                                        : 'border-gray-200 bg-white text-gray-700'}`}
                            >
                                {t(cat.key)}
                            </button>
                        ))}
                    </div>
                    {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                </div>

                {/* Description */}
                <div>
                    <label className="block text-base font-semibold text-gray-700 mb-2">
                        {t('complaint_desc')}
                    </label>
                    <textarea
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                        rows={4}
                        placeholder={t('complaint_desc_hint')}
                        maxLength={1000}
                        className={`w-full px-4 py-3 rounded-xl border-2 text-base
              outline-none transition-colors resize-none
              ${errors.description
                                ? 'border-red-400 bg-red-50'
                                : 'border-gray-200 bg-gray-50 focus:border-brand-blue'}`}
                    />
                    <div className="flex justify-between mt-1">
                        {errors.description
                            ? <p className="text-red-500 text-sm">{errors.description}</p>
                            : <span />}
                        <p className="text-xs text-gray-400">{form.description.length}/1000</p>
                    </div>
                </div>

                {errors.submit && <p className="text-red-500 text-base text-center">{errors.submit}</p>}

                {needsLinkedAccount && (
                    <button
                        onClick={() => navigate('/electricity/link-account')}
                        className="btn-kiosk-secondary w-full"
                    >
                        {t('link_account')}
                    </button>
                )}

                <div className="mt-auto">
                    <button onClick={handleSubmit} disabled={loading}
                        className={`btn-kiosk-primary w-full ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}>
                        {loading ? t('loading') : t('submit_complaint')}
                    </button>
                </div>

            </div>
        </KioskLayout>
    )
}
