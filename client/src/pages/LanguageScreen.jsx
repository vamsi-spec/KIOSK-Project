import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import useStore from '../store/useStore.js'
import { useState } from "react"
import { motion } from 'framer-motion'
import KioskLayout from '../components/KioskLayout' 



const LANGUAGES = [
  { code: 'en', label: 'English',  native: 'English'  },
  { code: 'hi', label: 'Hindi',    native: 'हिंदी'    },
  { code: 'te', label: 'Telugu',   native: 'తెలుగు'   },
]



export default function LanguageScreen() {
    const navigate = useNavigate()
    const {i18n,t} = useTranslation()
    const {setLanguage,language} = useStore()
    const [selected,setSelected] = useState(language || 'en')

    const handleSelect = (code) => {
        setSelected(code)
        setLanguage(code)
        i18n.changeLanguage(code)
    }

    const handleContinue = () =>{
        navigate('/auth')
    }

    return (
    <KioskLayout showBack={false} showHome={false}>
      <div className="flex flex-col items-center justify-center h-full px-8 gap-10">

        <h1 className="text-kiosk-xl font-bold text-gray-900 text-center">
          {t('choose_language')}
        </h1>

        <div className="grid grid-cols-3 gap-4 w-full max-w-xl">
          {LANGUAGES.map((lang) => (
            <motion.button
              key={lang.code}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(lang.code)}
              className={`
                flex flex-col items-center justify-center gap-2
                min-h-[140px] rounded-2xl border-2 p-6
                transition-colors duration-150
                ${selected === lang.code
                  ? 'border-brand-blue bg-blue-50'
                  : 'border-gray-200 bg-white'}
              `}
            >
              <span className={`text-kiosk-lg font-bold
                ${selected === lang.code ? 'text-brand-blue' : 'text-gray-800'}`}>
                {lang.native}
              </span>

              <span className={`text-base
                ${selected === lang.code ? 'text-brand-blue' : 'text-gray-400'}`}>
                {lang.label}
              </span>

              {selected === lang.code && (
                <div className="w-6 h-6 rounded-full bg-brand-blue
                                flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              )}
            </motion.button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          className="btn-kiosk-primary max-w-xs"
        >
          {t('continue')} →
        </button>

      </div>
    </KioskLayout>
  )

}

