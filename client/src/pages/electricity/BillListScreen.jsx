import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import api from '../../lib/axios.js'
import KioskLayout from '../../components/KioskLayout.jsx'

const STATUS_BADGE = {
    PENDING: { cls: 'bg-blue-100 text-blue-700' },
    PAYMENT_IN_PROGRESS: { cls: 'bg-amber-100 text-amber-700' },
    PAID: { cls: 'bg-green-100 text-green-700' },
    OVERDUE: { cls: 'bg-red-100 text-red-700' },
    PARTIALLY_PAID: { cls: 'bg-orange-100 text-orange-700' }
}

const STATUS_LABEL_KEY = {
    PENDING: 'status_pending',
    PAYMENT_IN_PROGRESS: 'status_processing',
    PAID: 'status_paid',
    OVERDUE: 'status_overdue',
    PARTIALLY_PAID: 'status_partially_paid'
}

export default function BillListScreen() {
    const navigate = useNavigate()
    const { accountId } = useParams()
    const { t } = useTranslation()

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errMsg, setErrMsg] = useState('')

    useEffect(() => { fetchBills() }, [accountId])

    const fetchBills = async () => {
        setLoading(true)
        setErrMsg('')
        try {
            const { data: res } = await api.get(`/core/electricity/bills/${accountId}`)
            setData(res)
        } catch (err) {
            setErrMsg(t('error_generic'))
        } finally {
            setLoading(false)
        }
    }

    const handlePay = (bill) => {
        navigate('/electricity/pay', {
            state: {
                billId: bill.id,
                amount: bill.totalPayable,
                billNo: bill.billNo,
                period: bill.period,
                accountId,
                accountNo: data.account.accountNo,
                lateFee: bill.lateFee,
                originalAmt: bill.originalAmount
            }
        })
    }

    if (loading) {
        return (
            <KioskLayout>
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400">{t('loading')}</p>
                </div>
            </KioskLayout>
        )
    }

    if (errMsg) {
        return (
            <KioskLayout>
                <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
                    <p className="text-red-500 text-base text-center">{errMsg}</p>
                    <button onClick={fetchBills} className="btn-kiosk-secondary w-full max-w-sm">{t('try_again')}</button>
                </div>
            </KioskLayout>
        )
    }

    const { account, billSummary, bills } = data

    return (
        <KioskLayout>
            <div className="flex flex-col h-full px-8 pt-6 gap-5">

                {/* Account header */}
                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-base font-bold text-gray-900">{account.accountNo}</p>
                            <p className="text-sm text-gray-500">{account.providerName}</p>
                        </div>
                        <button
                            onClick={() => navigate('/electricity/accounts')}
                            className="text-brand-blue text-sm font-semibold"
                        >
                            ← {t('back_to_accounts')}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{account.address}</p>
                </div>

                {/* Summary banner */}
                {!billSummary.hasBills && (
                    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 text-center">
                        <p className="text-base font-semibold text-gray-600 mb-1">{t('no_bills_yet')}</p>
                        <p className="text-sm text-gray-400">
                            {t('no_bills_generated_desc')}
                        </p>
                    </div>
                )}

                {billSummary.hasBills && !billSummary.hasPendingBills && (
                    <div className="bg-green-50 rounded-2xl border border-green-200 p-4 flex items-center gap-3">
                        <span className="text-green-600 text-2xl">✓</span>
                        <div>
                            <p className="text-base font-semibold text-green-700">{t('all_bills_paid_msg')}</p>
                            {billSummary.totalPaidThisYear > 0 && (
                                <p className="text-sm text-green-600">
                                    {t('total_paid_year', { amount: billSummary.totalPaidThisYear.toLocaleString('en-IN') })}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Bills list */}
                {bills.length > 0 && (
                    <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                        {bills.map((bill, idx) => {
                            const badge = STATUS_BADGE[bill.status] || STATUS_BADGE.PENDING
                            const payable = ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'].includes(bill.status)
                            const hasLateFee = bill.lateFee > 0

                            return (
                                <motion.div
                                    key={bill.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`rounded-2xl border-2 p-4 flex flex-col gap-3
                    ${bill.isOverdue ? 'border-red-300 bg-red-50'
                                            : bill.status === 'PAID' ? 'border-gray-200 bg-white'
                                                : 'border-blue-200 bg-blue-50'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-base font-semibold text-gray-900">{bill.period}</p>
                                            <p className="text-sm text-gray-500">{t('bill_label', { billNo: bill.billNo })}</p>
                                            {bill.unitsConsumed && (
                                                <p className="text-xs text-gray-400">{t('kwh_consumed', { units: bill.unitsConsumed })}</p>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${badge.cls}`}>
                                                {t(STATUS_LABEL_KEY[bill.status] || 'status_pending')}
                                            </span>
                                            <div className="text-right">
                                                {hasLateFee && (
                                                    <p className="text-xs text-red-500 line-through">
                                                        ₹{bill.originalAmount.toLocaleString('en-IN')}
                                                    </p>
                                                )}
                                                <p className={`text-xl font-bold
                          ${bill.isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                                                    ₹{bill.totalPayable.toLocaleString('en-IN')}
                                                </p>
                                                {hasLateFee && (
                                                    <p className="text-xs text-red-500">
                                                        {t('late_fee_label', { amount: bill.lateFee.toLocaleString('en-IN') })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-sm">
                                        <p className="text-gray-500">
                                            {t('due_label', { date: new Date(bill.dueDate).toLocaleDateString('en-IN', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            }) })}
                                        </p>
                                        {bill.isOverdue && (
                                            <p className="text-red-600 font-semibold">
                                                {t('days_overdue', { days: bill.daysOverdue })}
                                            </p>
                                        )}
                                        {!bill.isOverdue && bill.status !== 'PAID' && (
                                            <p className="text-blue-600">
                                                {t('days_left_label', { days: bill.daysUntilDue })}
                                            </p>
                                        )}
                                        {bill.status === 'PAID' && bill.lastPayment && (
                                            <p className="text-green-600 text-xs">
                                                {t('paid_on', { date: new Date(bill.lastPayment.createdAt).toLocaleDateString('en-IN') })}
                                            </p>
                                        )}
                                    </div>

                                    {payable && (
                                        <button onClick={() => handlePay(bill)} className="btn-kiosk-primary">
                                            {t('pay_amount', { amount: bill.totalPayable.toLocaleString('en-IN') })}
                                        </button>
                                    )}

                                    {bill.status === 'PAYMENT_IN_PROGRESS' && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                            <p className="text-sm text-amber-700 text-center">
                                                {t('payment_in_progress_msg')}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>
                )}

            </div>
        </KioskLayout>
    )
}
