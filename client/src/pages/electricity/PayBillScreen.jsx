import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import api from '../../lib/axios.js'
import KioskLayout from '../../components/KioskLayout.jsx'

const METHODS = [
    { key: 'upi', icon: '📱' },
    { key: 'card', icon: '💳' },
    { key: 'netbanking', icon: '🏦' }
]

export default function PayBillScreen() {
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation()

    const {
        billId, amount, billNo,
        period, accountNo, lateFee, originalAmt
    } = location.state || {}

    if (!billId) {
        navigate('/electricity/accounts', { replace: true })
        return null
    }

    const [method, setMethod] = useState('upi')
    const [loading, setLoading] = useState(false)
    const [errMsg, setErrMsg] = useState('')
    const [success, setSuccess] = useState(null)
    const [payBtnDisabled, setPayBtnDisabled] = useState(false)

    const getPaymentError = (err) => {
        const code = err?.response?.data?.code
        if (code === 'ALREADY_PAID') return t('already_paid')
        if (code === 'PAYMENT_IN_PROGRESS' || code === 'CONCURRENT_PAYMENT') return t('payment_in_progress_msg')
        if (code === 'INVALID_SIGNATURE') return t('payment_failed')
        return t('payment_failed')
    }

    const handlePay = async () => {
        if (payBtnDisabled) return
        setPayBtnDisabled(true)  // prevent double tap immediately
        setLoading(true)
        setErrMsg('')

        let orderId = null

        try {
            // STEP 1 — Create Razorpay order (backend validates + locks bill atomically)
            const { data: order } = await api.post('/core/electricity/payments/create-order', { billId })
            orderId = order.orderId

            // STEP 2 — Open Razorpay or simulate in dev
            if (import.meta.env.PROD && window.Razorpay) {
                await openRazorpayModal(order, method)
            } else {
                await simulatePayment(order)
            }

        } catch (err) {
            if (err.message === 'PAYMENT_CANCELLED') {
                // Citizen dismissed the modal — revert bill status
                if (orderId) {
                    try { await api.post('/core/electricity/payments/cancel-order', { orderId }) } catch { /* not critical */ }
                }
                setErrMsg(t('payment_cancelled'))
                setPayBtnDisabled(false)
            } else {
                setErrMsg(getPaymentError(err))
                setPayBtnDisabled(false)
            }
        } finally {
            setLoading(false)
        }
    }

    const openRazorpayModal = (order, selectedMethod) => {
        return new Promise((resolve, reject) => {
            if (!window.Razorpay) { reject(new Error('Razorpay SDK not loaded')); return }

            const rzp = new window.Razorpay({
                key: order.keyId,
                order_id: order.orderId,
                amount: order.amount,
                currency: 'INR',
                name: 'SUVIDHA Civic Kiosk',
                description: `Electricity Bill — ${period}`,
                prefill: {
                    name: order.citizen.name,
                    contact: order.citizen.mobile
                },
                method: { [selectedMethod]: true },
                theme: { color: '#1a5fa8' },

                handler: async (response) => {
                    // STEP 3 — Verify signature before showing success
                    // Never trust frontend payment response directly
                    try {
                        const { data: verify } = await api.post('/core/electricity/payments/verify-payment', {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        })

                        if (verify.verified) {
                            // DB update happens via webhook — we just show success UI
                            setSuccess({
                                txnId: response.razorpay_payment_id,
                                amount,
                                billNo,
                                period,
                                accountNo
                            })
                            resolve()
                        } else {
                            reject(new Error('Signature verification failed'))
                        }
                    } catch (verifyErr) {
                        reject(verifyErr)
                    }
                },

                modal: {
                    ondismiss: () => reject(new Error('PAYMENT_CANCELLED'))
                }
            })

            rzp.open()
        })
    }

    const simulatePayment = async (order) => {
        // DEV only — simulates 2s processing then shows success
        await new Promise(r => setTimeout(r, 2000))
        setSuccess({
            txnId: `DEV_${Date.now()}`,
            amount,
            billNo,
            period,
            accountNo
        })
    }

    // ── Success screen ────────────────────────────────────────
    if (success) {
        return (
            <KioskLayout showBack={false} showHome={true}>
                <div className="flex flex-col items-center justify-center h-full px-8 gap-6">

                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
                    >
                        <span className="text-green-600 text-5xl">✓</span>
                    </motion.div>

                    <div className="text-center">
                        <h1 className="text-kiosk-xl font-bold text-green-700 mb-1">
                            {t('payment_success')}
                        </h1>
                        <p className="text-base text-gray-500">{t('bill_paid_msg')}</p>
                    </div>

                    <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-200 p-5 flex flex-col gap-3">
                        <ReceiptRow label={t('transaction_id')} value={success.txnId} mono />
                        <ReceiptRow label={t('amount_due')}
                            value={`₹${Number(success.amount).toLocaleString('en-IN')}`} />
                        <ReceiptRow label={t('bill_no')} value={success.billNo} />
                        <ReceiptRow label={t('billing_period')} value={success.period} />
                        <ReceiptRow label={t('account_number')} value={success.accountNo} />
                        <ReceiptRow label={t('date_time')}
                            value={new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} />
                    </div>

                    <div className="flex gap-3 w-full max-w-sm">
                        <button onClick={() => window.print()} className="flex-1 btn-kiosk-secondary">
                            {t('print_receipt')}
                        </button>
                        <button onClick={() => navigate('/home', { replace: true })} className="flex-1 btn-kiosk-primary">
                            {t('done')}
                        </button>
                    </div>

                </div>
            </KioskLayout>
        )
    }

    // ── Payment screen ────────────────────────────────────────
    return (
        <KioskLayout>
            <div className="flex flex-col h-full px-8 pt-6 gap-6">

                <div>
                    <h1 className="text-kiosk-lg font-bold text-gray-900 mb-3">
                        {t('payment_method')}
                    </h1>

                    {/* Bill summary */}
                    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500">{t('bill_no')}</p>
                                <p className="text-base font-semibold text-gray-900">{billNo}</p>
                                <p className="text-sm text-gray-500 mt-1">{period} · {accountNo}</p>
                            </div>
                            <div className="text-right">
                                {lateFee > 0 && (
                                    <>
                                        <p className="text-xs text-gray-400 line-through">
                                            ₹{Number(originalAmt).toLocaleString('en-IN')}
                                        </p>
                                        <p className="text-xs text-red-500">
                                            {t('late_fee_label', { amount: Number(lateFee).toLocaleString('en-IN') })}
                                        </p>
                                    </>
                                )}
                                <p className="text-kiosk-xl font-bold text-gray-900">
                                    ₹{Number(amount).toLocaleString('en-IN')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment method selection */}
                <div className="flex flex-col gap-3">
                    {METHODS.map(m => (
                        <button
                            key={m.key}
                            onClick={() => setMethod(m.key)}
                            className={`flex items-center gap-4 p-5 rounded-2xl border-2
                transition-colors text-left
                ${method === m.key ? 'border-brand-blue bg-blue-50' : 'border-gray-200 bg-white'}`}
                        >
                            <span style={{ fontSize: 28 }}>{m.icon}</span>
                            <p className={`flex-1 text-base font-semibold
                ${method === m.key ? 'text-brand-blue' : 'text-gray-800'}`}>
                                {t(m.key)}
                            </p>
                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0
                ${method === m.key ? 'border-brand-blue bg-brand-blue' : 'border-gray-300'}`} />
                        </button>
                    ))}
                </div>

                {errMsg && <p className="text-red-500 text-base text-center">{errMsg}</p>}

                <div className="mt-auto">
                    <button
                        onClick={handlePay}
                        disabled={loading || payBtnDisabled}
                        className={`btn-kiosk-primary w-full
              ${(loading || payBtnDisabled) ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                        {loading
                            ? t('payment_processing')
                            : t('pay_amount', { amount: Number(amount).toLocaleString('en-IN') })}
                    </button>
                    <p className="text-xs text-gray-400 text-center mt-2">{t('secured_by_razorpay')}</p>
                </div>

            </div>
        </KioskLayout>
    )
}

function ReceiptRow({ label, value, mono }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>
                {value}
            </span>
        </div>
    )
}
