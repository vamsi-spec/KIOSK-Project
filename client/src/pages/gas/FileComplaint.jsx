import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import api from "../../lib/axios"
import KioskLayout from "../../components/KioskLayout"




const GAS_CATEGORIES = [
  'Gas leak',
  'No gas supply',
  'Low gas pressure',
  'Meter fault',
  'Billing error',
  'Regulator issue',
  'Pipeline damage',
  'New appliance connection',
  'Other'
]


const FileComplaint = () => {

  const navigate = useNavigate()
  const { t } = useTranslation()

  const [form, setForm] = useState({ category: '', description: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })) }

  const handleCategorySelect = (cat) => {
    if (cat === 'Gas leak') {
      navigate('/gas/emergency')
      return
    }
    set('category', cat)
  }

  const validate = () => {
    const errs = {}
    if (!form.category) errs.category = 'Please select a category'
    if (!form.description.trim() || form.description.trim().length < 10) errs.description = 'Describe the issue (at least 10 characters)'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const { data } = await api.post('/core/gas/complaints', { category: form.category, description: form.description.trim() })
      setResult(data)
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || t('error_generic') })
    }
    finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <KioskLayout showBack={false} showHome={true}>
        <div className="flex flex-col items-center justify-center h-full px-8 gap-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 text-5xl">✓</span>
          </motion.div>
          <h1 className="text-kiosk-xl font-bold text-green-700 text-center">Complaint Filed</h1>
          <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Reference Number</p>
            <p className="text-koisk-lg font-bold text-brand-blue mb-3">{result.refNo}</p>
            <p className="text-sm text-gray-500 mb-1">Category</p>
            <p className="text-base font-semibold text-gray-800 mb-4">{result.category}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-700">Note this reference number. Track your complaint at any SUVIDHA kiosk.</p>
            </div>
          </div>
          <button onClick={() => navigate('/home', { replace: true })} className="btn-kiosk-primary w-full max-w-sm">{t('done')}</button>
        </div>
      </KioskLayout>
    )
  }

  return (
    <KioskLayout>
      <div className="flex flex-col h-full px-8 pt-6 gap-5">
        <h1 className="text-kiosk-lg font-bold text-gray-900">File Gas Complaint</h1>

        {/* Emergency notice */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-3">
          <span style={{ fontSize: 20 }}>🚨</span>
          <p className="text-sm text-red-700">
            For a <span className="font-bold">gas leak</span>, use the emergency button — do not file it here.
          </p>
        </div>

        {/* Category selection */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">Complaint Category</label>
          <div className="grid grid-cols-2 gap-2">
            {GAS_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => handleCategorySelect(cat)}
                className={`min-h-[52px] rounded-xl border-2 text-sm font-medium px-3 transition-colors
                  ${cat === 'Gas leak'
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : form.category === cat
                      ? 'border-brand-blue bg-blue-50 text-brand-blue'
                      : 'border-gray-200 bg-white text-gray-700'}`}
              >
                {cat === 'Gas leak' ? '🚨 ' : ''}{cat}
              </button>
            ))}
          </div>
          {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">Describe the issue</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={4}
            placeholder="Provide details to help us resolve faster..."
            maxLength={1000}
            className={`w-full px-4 py-3 rounded-xl border-2 text-base outline-none transition-colors resize-none ${errors.description ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-brand-blue'}`}
          />
          <div className="flex justify-between mt-1">
            {errors.description ? <p className="text-red-500 text-sm">{errors.description}</p> : <span />}
            <p className="text-xs text-gray-400">{form.description.length}/1000</p>
          </div>
        </div>

        {errors.submit && <p className="text-red-500 text-base text-center">{errors.submit}</p>}

        <div className="mt-auto">
          <button onClick={handleSubmit} disabled={loading} className={`btn-kiosk-primary w-full ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}>
            {loading ? t('loading') : 'Submit Complaint'}
          </button>
        </div>
      </div>
    </KioskLayout>
  )
}


export default FileComplaint