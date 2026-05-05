import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../lib/api'





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

    return (
        <div>PayBillScreen</div>
    )
}

export default PayBillScreen