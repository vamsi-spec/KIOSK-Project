import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import KioskLayout from '../../components/KioskLayout'
import { motion } from 'framer-motion'




const METHODS = [
    { key: 'upi', label: 'UPI / PhonePe / GPay', icon: '📱' },
    { key: 'card', label: 'Debit / Credit Card', icon: '💳' },
    { key: 'netbanking', label: 'Net Banking', icon: '🏦' }
]

const PayBillScreen = () => {

    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation()

    const { billId, amount, billNo, period, accountNo, lateFee, originalAmt } = location.state || {}
    if (!billId) { navigate('/gas/accounts', { replace: true }); return null }
    const [method, setMethod] = useState('')
    const [loading, setLoading] = useState(false)
    const [errMsg, setErrMsg] = useState('')
    const [success, setSuccess] = useState(null)
    const [payBtnDisabled, setPayBtnDisabled] = useState(false)

    const handlePay = async () => {
        if (payBtnDisabled) return
        setPayBtnDisabled(true)
        setLoading(true); setErrMsg('')
        let orderId = null

        try {
            const { data: order } = await api.post('/core/gas/payments/create-order', { billId })
            orderId = order.orderId

            if (import.meta.env.PROD && window.Razorpay) {
                await new Promise((resolve, reject) => {
                    const rzp = new window.Razorpay({
                        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: 'INR', name: 'SUVIDHA Civic Kiosk', description: `Gas Bill - ${period}`, prefill: { name: order.citizen.name, contact: order.citizen.mobile },
                        method: { [method]: true }, theme: { color: '#1a5fa8' },
                        handler: async (response) => {
                            try {
                                const { data: verify } = await api.post('/core/gas/payments/verify-payment', {
                                    razorpayOrderId: response.razorpay_order_id,
                                    razorpayPaymentId: response.razorpay_payment_id,
                                    razorpaySignature: response.razorpay_signature
                                })

                                if (verify.verified) {
                                    setSuccess({ txnId: response.razorpay_payment_id, amount, billNo, period, accountNo }); resolve()
                                }

                                else reject(new Error('Signature verification failed'))



                            } catch (err) {
                                reject(err)
                            }
                        },
                        modal: { ondismiss: () => reject(new Error('PAYMENT_CANCELLED')) }
                    })
                    rzp.open()
                })
            }
            else {
                await new Promise(r => setTimeout(r, 2000))
                setSuccess({ txnId: `DEV_${Date.now()}`, amount, billNo, period, accountNo })
            }
        } catch (err) {
            if (err.message === 'PAYMENT_CANCELLED') {
                if (orderId) { try { await api.post('/core/gas/payments/cancel-order', { orderId }) } catch { /* ok */ } }
                setErrMsg('Payment cancelled. You can try again.')
                setPayBtnDisabled(false)
            } else {
                setErrMsg(err.response?.data?.error || 'Payment failed. Please try again.')
                setPayBtnDisabled(false)
            }
        } finally { setLoading(false) }
    }

    if (success) {
        return (
            <KioskLayout showBack={false} showHome={true}>
                <div className='flex flex-col items-center justify-center h-full px-8 gap-6 '>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-600 text-5xl">✓</span>
                    </motion.div>
                    <div className='text-center'>
                        <h1 className='text-kiosk-xl font-bold text-green-700 mb-1'>Payment Successful</h1>
                        <p className='text-base text-gray-500'>Your gas bill has been paid.</p>
                    </div>
                    <div className='w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-200 p-5 flex flex-col gap-3'>
                        {[
                            { label: 'Transaction ID', value: success.txnId, mono: true },
                            { label: 'Amount Paid', value: `₹${Number(success.amount).toLocaleString('en-IN')}` },
                            { label: 'Bill Number', value: success.billNo },
                            { label: 'Billing Period', value: success.period },
                            { label: 'Account', value: success.accountNo },
                            { label: 'Date & Time', value: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) }
                        ].map(({ label, value, mono }) => (
                            { label: 'Date & Time', value: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) }

                        ))}
                    </div>
                    <div className="flex gap-3 w-full max-w-sm">
                        <button onClick={() => window.print()} className="flex-1 btn-kiosk-secondary">Print Receipt</button>
                        <button onClick={() => navigate('/home', { replace: true })} className="flex-1 btn-kiosk-primary">{t('done')}</button>
                    </div>
                </div>
            </KioskLayout>
        )
    }

    return (
        <KioskLayout>
            <div className="flex flex-col h-full px-8 pt-6 gap-6">
                <div>
                    <h1 className="text-kiosk-lg font-bold text-gray-900 mb-3">Choose Payment Method</h1>
                    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500">Bill Number</p>
                                <p className="text-base font-semibold text-gray-900">{billNo}</p>
                                <p className="text-sm text-gray-500 mt-1">{period} · {accountNo}</p>
                            </div>
                            <div className="text-right">
                                {lateFee > 0 && <><p className="text-xs text-gray-400 line-through">₹{Number(originalAmt).toLocaleString('en-IN')}</p><p className="text-xs text-red-500">+₹{Number(lateFee).toLocaleString('en-IN')} late fee</p></>}
                                <p className="text-kiosk-xl font-bold text-gray-900">₹{Number(amount).toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {METHODS.map(m => (
                        <button key={m.key} onClick={() => setMethod(m.key)}
                            className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-colors text-left ${method === m.key ? 'border-brand-blue bg-blue-50' : 'border-gray-200 bg-white'}`}
                        >
                            <span style={{ fontSize: 28 }}>{m.icon}</span>
                            <p className={`flex-1 text-base font-semibold ${method === m.key ? 'text-brand-blue' : 'text-gray-800'}`}>{m.label}</p>
                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${method === m.key ? 'border-brand-blue bg-brand-blue' : 'border-gray-300'}`} />
                        </button>
                    ))}
                </div>

                {errMsg && <p className="text-red-500 text-base text-center">{errMsg}</p>}

                <div className="mt-auto">
                    <button onClick={handlePay} disabled={loading || payBtnDisabled} className={`btn-kiosk-primary w-full ${(loading || payBtnDisabled) ? 'opacity-40 cursor-not-allowed' : ''}`}>
                        {loading ? 'Processing payment...' : `Pay ₹${Number(amount).toLocaleString('en-IN')}`}
                    </button>
                    <p className="text-xs text-gray-400 text-center mt-2">Secured by Razorpay</p>
                </div>
            </div>
        </KioskLayout>
    )
}

export default PayBillScreen