import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/axios'
import KioskLayout from '../../components/KioskLayout'
import { motion } from 'framer-motion'


const PROPERTY_TYPES = [
    { value: 'RESIDENTIAL', label: 'Residential', desc: 'Home / Apartment / Villa' },
    { value: 'COMMERCIAL', label: 'Commercial', desc: 'Shop / Office / Restaurant' },
    { value: 'INDUSTRIAL', label: 'Industrial', desc: 'Factory / Warehouse' }
]

const CONNECTION_TYPES = [
    { value: 'PNG', label: 'PNG — Piped Natural Gas', desc: 'Underground pipeline · 7–14 working days', icon: '🔌' },
    { value: 'LPG', label: 'LPG — Cylinder Based', desc: 'For areas without pipeline · 3–5 days', icon: '🔴' }
]


const GAS_PROVIDERS = [
    'Bhagyanagar Gas Limited (BGL)', 'GAIL Gas', 'Adani Total Gas',
    'Indraprastha Gas (IGL)', 'Mahanagar Gas (MGL)', 'Gujarat Gas', 'Other'
]

const NewConnectionScreen = () => {

    const navigate = useNavigate()
    const { t } = useTranslation()

    const [form, setForm] = useState({
        applicantName: '',
        contactMobile: '',
        address: '',
        propertyType: '',
        connectionType: '',
        providerName: ''
    })

    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)

    const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })) }

    const validate = () => {
        const errs = {}
        if (!form.applicantName.trim() || form.applicantName.trim().length < 2) errs.applicantName = 'Enter your full name'
        if (!/^[6-9]\d{9}$/.test(form.contactMobile)) errs.contactMobile = 'Enter a valid 10-digit mobile number'
        if (!form.address.trim() || form.address.trim().length < 10) errs.address = 'Enter the full address where connection is needed'
        if (!form.propertyType) errs.propertyType = 'Please select a property type'
        if (!form.connectionType) errs.connectionType = 'Please select PNG or LPG'
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            const { data } = await api.post('/core/gas/connections/apply', {
                applicantName: form.applicantName.trim(),
                contactMobile: form.contactMobile.trim(),
                address: form.address.trim(),
                propertyType: form.propertyType,
                connectionType: form.connectionType,
                providerName: form.providerName
            })
            setResult(data)
        } catch (err) {
            if (err.response?.status === 409) setErrors({ submit: `You already have a pending application (Ref: ${err.response.data.refNo})` })
            else setErrors({ submit: err.response?.data?.error || t('error_generic') })
        } finally { setLoading(false) }
    }

    if (result) {
        return (
            <KioskLayout showBack={false} showHome={true}>
                <div className='flex flex-col items-center justify-center h-full px-8 gap-6'>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center" >
                        <span className='text-green-600 text-5xl'>✓</span>
                    </motion.div>

                    <div className="text-center">
                        <h1 className="text-kiosk-xl font-bold text-green-700 mb-1">Application Submitted</h1>
                        <p className="text-base text-gray-500">{result.nextSteps}</p>
                    </div>

                    <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-200 p-5">
                        <p className="text-sm text-gray-500 mb-1">Reference Number</p>
                        <p className="text-kiosk-lg font-bold text-brand-blue mb-2">{result.refNo}</p>
                        <p className="text-sm text-gray-500 mb-1">Connection Type</p>
                        <p className="text-base font-semibold text-gray-800 mb-3">{result.connectionType}</p>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                            <p className="text-xs text-yellow-700">Save this reference number. Track your application at any SUVIDHA kiosk.</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/home', { replace: true })} className="btn-kiosk-primary w-full max-w-sm">{t('done')}</button>

                </div>
            </KioskLayout>
        )
    }



    return (
        <KioskLayout>
            <div className='flex flex-col h-full px-8 pt-6 gap-5 overflow-y-auto'>
                <div>
                    <h1 className='text-kiosk-lg font-bold text-gray-900 mb-1'>Apply for Gas Connection</h1>
                    <p className=' text-sm text-gray-500'>Fill the form below to apply for a new gas connection at your property</p>
                </div>

                <Field label="Applicant name" error={errors.applicantName}>
                    <input type="text" value={form.applicantName} onChange={e => set('applicantName', e.target.value)} placeholder='Full name' className={inputCls(errors.applicantName)} />
                </Field>

                <Field label="Contact mobile number" error={errors.contactMobile}>
                    <input type="tel" inputMode="numeric" value={form.contactMobile} onChange={e => set('contactMobile', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" className={inputCls(errors.contactMobile)} />
                </Field>

                <Field label="Address where connection is required" error={errors.address}>
                    <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={3} placeholder="House/Flat, Street, Area, City, Pincode" className={`${inputCls(errors.address)} resize-none`} />
                </Field>

                <Field label="Connection type" error={errors.connectionType}>
                    <div className="flex flex-col gap-2">
                        {CONNECTION_TYPES.map(ct => (
                            <button key={ct.value} type="button" onClick={() => set('connectionType', ct.value)}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${form.connectionType === ct.value ? 'border-brand-blue bg-blue-50' : 'border-gray-200 bg-white'}`}
                            >
                                <span style={{ fontSize: 24 }}>{ct.icon}</span>
                                <div className="flex-1">
                                    <p className={`text-base font-semibold ${form.connectionType === ct.value ? 'text-brand-blue' : 'text-gray-800'}`}>{ct.label}</p>
                                    <p className="text-xs text-gray-400">{ct.desc}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${form.connectionType === ct.value ? 'border-brand-blue bg-brand-blue' : 'border-gray-300'}`} />
                            </button>
                        ))}
                    </div>
                </Field>

                <Field label="Property type" error={errors.propertyType}>
                    <div className="flex flex-col gap-2">
                        {PROPERTY_TYPES.map(pt => (
                            <button key={pt.value} type="button" onClick={() => set('propertyType', pt.value)}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${form.propertyType === pt.value ? 'border-brand-blue bg-blue-50' : 'border-gray-200 bg-white'}`}
                            >
                                <div className="flex-1">
                                    <p className={`text-base font-semibold ${form.propertyType === pt.value ? 'text-brand-blue' : 'text-gray-800'}`}>{pt.label}</p>
                                    <p className="text-xs text-gray-400">{pt.desc}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${form.propertyType === pt.value ? 'border-brand-blue bg-brand-blue' : 'border-gray-300'}`} />
                            </button>
                        ))}
                    </div>
                </Field>

                <Field label="Gas provider (optional)" error={errors.providerName}>
                    <select value={form.providerName} onChange={e => set('providerName', e.target.value)} className={inputCls(errors.providerName)}>
                        <option value="">I don't know / Not sure</option>
                        {GAS_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Admin will confirm the provider based on your area during approval.</p>
                </Field>

                {errors.submit && <p className="text-red-500 text-base text-center">{errors.submit}</p>}

                <div className='pb-6'>
                    <button onClick={handleSubmit} disabled={loading} className={`btn-kiosk-primary ${loading ? 'opacity-50' : ''}`}>
                        {loading ? 'Submitting...' : 'Submit Application'}
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
    return `w-full px-4 py-3 rounded-xl border-2 text-base outline-none transition-colors ${err ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-brand-blue focus:bg-white'}`
}

export default NewConnectionScreen