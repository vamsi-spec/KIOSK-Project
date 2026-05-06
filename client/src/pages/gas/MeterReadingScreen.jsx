import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import api from '../../lib/axios.js'
import KioskLayout from '../../components/KioskLayout.jsx'


const MeterReadingScreen = () => {
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
            if (data.accounts.length === 1) handleSelectedAccount(data.accounts[0])
        } catch (err) { setErrMsg(err.response?.data?.error || t('error_generic')) }
        finally { setFetching(false) }
    }


    const handleSelectedAccount = async (account) => {
        setSelectedAcc(account);
        setLoading(true)
        setHistory(null)
        setErrMsg('')
        try {
            const { data } = await api.get(`/core/gas/meter/history/${account.id}`)
            setHistory(data.history)
        } catch (err) { setErrMsg(err.response?.data?.error || t('error_generic')) }
        finally { setLoading(false) }
    }

    const lastVerifiedReading = history?.readings?.[0] ? Number(history.readings[0].readingValue) : 0
    const currentReadingNum = Number(reading)
    const unitsConsumed = reading && currentReadingNum > lastVerifiedReading
        ? (currentReadingNum - lastVerifiedReading).toFixed(2)
        : null

    const handleSubmit = async () => {
        if (!reading || isNaN(currentReadingNum)) {
            setErrMsg('Please enter a valid meter reading')
            return
        }

        if (currentReadingNum < lastVerifiedReading) {
            setErrMsg(`Reading cannot be less than last verified reading ${lastVerifiedReading}`)
            return
        }
        setLoading(true)
        setErrMsg('')

        try {
            const { data } = await api.post('/core/gas/meter/submit', { accountId: selectedAcc.id, readingValue: currentReadingNum })
            setDone(data)
        } catch (error) {
            setErrMsg(error.response?.data?.error || t('error_generic'))
        } finally { setLoading(false) }
    }


    return (
        <div>MeterReadingScreen</div>
    )
}

export default MeterReadingScreen