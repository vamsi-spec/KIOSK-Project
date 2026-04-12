import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import api from '../../lib/axios.js'
import KioskLayout from '../../components/KioskLayout.jsx'

const PROPERTY_TYPES = [
    { value: 'RESIDENTIAL', labelKey: 'residential', descKey: 'residential_desc' },
    { value: 'COMMERCIAL', labelKey: 'commercial', descKey: 'commercial_desc' },
    { value: 'INDUSTRIAL', labelKey: 'industrial', descKey: 'industrial_desc' }
]

const PROVIDERS = [
    'TSSPDCL', 'TSNPDCL', 'APEPDCL',
    'APSPDCL', 'GESCOM', 'HESCOM',
    'BESCOM', 'MSEDCL', 'Other'
]

export default function NewConnectionScreen() {
    const navigate = useNavigate()
    const { t } = useTranslation()

    const [form, setForm] = useState({
        applicantName: '',
        contactMobile: '',
        address: '',
        propertyType: '',
        providerName: '',   // optional — citizen may know their area's provider
        sanctionedLoad: ''
    })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)

    const set = (k, v) => {
        setForm(p => ({ ...p, [k]: v }))
        setErrors(p => ({ ...p, [k]: '' }))
    }

    const validate = () => {
        const errs = {}
        if (!form.applicantName.trim() || form.applicantName.trim().length < 2)
            errs.applicantName = t('error_full_name')
        if (!/^[6-9]\d{9}$/.test(form.contactMobile))
            errs.contactMobile = t('error_valid_mobile')
        if (!form.address.trim() || form.address.trim().length < 10)
            errs.address = t('error_full_address')
        if (!form.propertyType)
            errs.propertyType = t('error_select_property')
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            const { data } = await api.post('/core/electricity/connections/apply', {
                applicantName: form.applicantName.trim(),
                contactMobile: form.contactMobile.trim(),
                address: form.address.trim(),
                propertyType: form.propertyType,
                providerName: form.providerName || undefined,
                sanctionedLoad: form.sanctionedLoad ? Number(form.sanctionedLoad) : undefined
            })
            setResult(data)
        } catch (err) {
            if (err.response?.status === 409) {
                setErrors({ submit: t('pending_application_exists', { refNo: err.response.data.refNo }) })
            } else {
                setErrors({ submit: t('error_generic') })
            }
        } finally {
            setLoading(false)
        }
    }

    // ── Success screen ────────────────────────────────────────
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

                    <div className="text-center">
                        <h1 className="text-kiosk-xl font-bold text-green-700 mb-1">{t('application_submitted')}</h1>
                        <p className="text-base text-gray-500">{t('estimated_days')}</p>
                    </div>

                    <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-200 p-5">
                        <p className="text-sm text-gray-500 mb-1">{t('ref_no')}</p>
                        <p className="text-kiosk-lg font-bold text-brand-blue mb-3">{result.refNo}</p>
                        <p className="text-sm text-gray-500 mb-1">{t('status')}</p>
                        <span className="bg-blue-100 text-blue-700 text-sm font-semibold px-3 py-1 rounded-full">
                            {t(`status_${result.status?.toLowerCase()}`)}
                        </span>
                        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                            <p className="text-xs text-yellow-700">
                                {t('save_ref_track_hint')}
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
            <div className="flex flex-col h-full px-8 pt-6 gap-5 overflow-y-auto">

                <div>
                    <h1 className="text-kiosk-lg font-bold text-gray-900 mb-1">{t('connection_title')}</h1>
                    <p className="text-sm text-gray-500">
                        {t('connection_subtitle')}
                    </p>
                </div>

                {/* Applicant name */}
                <Field label={t('applicant_name')} error={errors.applicantName}>
                    <input type="text" value={form.applicantName}
                        onChange={e => set('applicantName', e.target.value)}
                        placeholder={t('full_name_placeholder')}
                        className={inputCls(errors.applicantName)} />
                </Field>

                {/* Contact mobile */}
                <Field label={t('contact_mobile')} error={errors.contactMobile}>
                    <input type="tel" inputMode="numeric" value={form.contactMobile}
                        onChange={e => set('contactMobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder={t('mobile_placeholder')}
                        className={inputCls(errors.contactMobile)} />
                </Field>

                {/* Address */}
                <Field label={t('connection_address')} error={errors.address}>
                    <textarea value={form.address}
                        onChange={e => set('address', e.target.value)}
                        rows={3} placeholder={t('address_placeholder')}
                        className={`${inputCls(errors.address)} resize-none`} />
                </Field>

                {/* Property type */}
                <Field label={t('property_type')} error={errors.propertyType}>
                    <div className="flex flex-col gap-2">
                        {PROPERTY_TYPES.map(pt => (
                            <button key={pt.value} type="button" onClick={() => set('propertyType', pt.value)}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2
                  transition-colors text-left
                  ${form.propertyType === pt.value
                                        ? 'border-brand-blue bg-blue-50'
                                        : 'border-gray-200 bg-white'}`}
                            >
                                <div className="flex-1">
                                    <p className={`text-base font-semibold
                    ${form.propertyType === pt.value ? 'text-brand-blue' : 'text-gray-800'}`}>
                                        {t(pt.labelKey)}
                                    </p>
                                    <p className="text-xs text-gray-400">{t(pt.descKey)}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0
                  ${form.propertyType === pt.value
                                        ? 'border-brand-blue bg-brand-blue'
                                        : 'border-gray-300'}`} />
                            </button>
                        ))}
                    </div>
                </Field>

                {/* Provider — optional */}
                <Field label={t('provider_optional')} error={errors.providerName}>
                    <select value={form.providerName} onChange={e => set('providerName', e.target.value)}
                        className={inputCls(errors.providerName)}>
                        <option value="">{t('provider_unknown')}</option>
                        {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                        {t('provider_area_hint')}
                    </p>
                </Field>

                {/* Sanctioned load — optional */}
                <Field label={t('load_optional')} error={errors.sanctionedLoad}>
                    <input type="number" inputMode="numeric" value={form.sanctionedLoad}
                        onChange={e => set('sanctionedLoad', e.target.value)}
                        placeholder={t('load_placeholder')} min="0" step="0.5"
                        className={inputCls(errors.sanctionedLoad)} />
                </Field>

                {errors.submit && (
                    <p className="text-red-500 text-base text-center">{errors.submit}</p>
                )}

                <div className="pb-6">
                    <button onClick={handleSubmit} disabled={loading}
                        className={`btn-kiosk-primary w-full ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}>
                        {loading ? t('loading') : t('submit_application')}
                    </button>
                </div>

            </div>
        </KioskLayout>
    )
}

function Field({ label, error, children }) {
    return (
        <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">{label}</label>
            {children}
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    )
}

function inputCls(err) {
    return `w-full px-4 py-3 rounded-xl border-2 text-base outline-none transition-colors
    ${err ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-brand-blue focus:bg-white'}`
}
