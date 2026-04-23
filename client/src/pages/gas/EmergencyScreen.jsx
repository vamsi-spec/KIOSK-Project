import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/axios'



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
        <div>EmergencyScreen</div>
    )
}

export default EmergencyScreen