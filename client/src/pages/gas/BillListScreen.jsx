import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../lib/api'
import KioskLayout from '../../components/KioskLayout';
import { BiLeftArrowAlt } from 'react-icons/bi'





const STATUS_BADGE = {
    PENDING: { cls: 'bg-blue-100 text-blue-700', label: 'Pending' },
    PAYMENT_IN_PROGRESS: { cls: 'bg-amber-100 text-amber-700', label: 'Processing' },
    PAID: { cls: 'bg-green-100 text-green-700', label: 'Paid' },
    OVERDUE: { cls: 'bg-red-100 text-red-700', label: 'Overdue' },
    PARTIALLY_PAID: { cls: 'bg-orange-100 text-orange-700', label: 'Partially Paid' }
}

const BillListScreen = () => {


    const navigate = useNavigate();
    const { t } = useTranslation();
    const { accountId } = useParams();
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errMsg, setErrMsg] = useState('')


    useEffect(() => {
        fetchBills();
    }, [accountId])

    const fetchBills = async () => {
        setLoading(true)
        setErrMsg('')
        try {
            const { data: res } = await api.get(`/core/gas/bills/${accountId}`)

            setData(res)
        } catch (err) { setErrMsg(err.response?.data?.error || t('error_generic')) }
        finally { setLoading(false) }
    }

    if (loading) return <KioskLayout><div className="flex items-center justify-center h-full"><p className="text-gray-400">{t('loading')}</p></div></KioskLayout>
    if (errMsg) return <KioskLayout><div className="flex flex-col items-center justify-center h-full gap-4 px-8"><p className="text-red-500 text-base text-center">{errMsg}</p><button onClick={fetchBills} className="btn-kiosk-secondary w-full max-w-sm">Try Again</button></div></KioskLayout>

    const { account, billSummary, bills } = data

    return (
        <KioskLayout>
            <div className='flex flex-col h-full px-8 pt-6 gap-5'>
                <div className='bg-gray-50 rounded-2xl border border-gray-200 p-4'>
                    <div className='flex justify-between'>
                        <div>
                            <p className='text-base font-bold text-gray-900'>{account.accountNo}</p>
                            <p className='text-sm text-gray-500'>
                                {account.providerName}
                            </p>
                        </div>
                        <button onClick={() => navigate('/gas/accounts')} className='text-brand-blue text-sm font-semibold'><BiLeftArrowAlt /> Accounts</button>
                    </div>
                    <p>{account.address}</p>
                    <p>Gas bills are bi-monthly(every 2 months). Unit: SCM</p>
                </div>
                {!billSummary.hasBills && (
                    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 text-center">
                        <p className="text-base font-semibold text-gray-600 mb-1">No bills generated yet</p>
                        <p className="text-sm text-gray-400">Gas bills appear after meter reading is verified. Bills issued every 2 months.</p>
                    </div>
                )}

                {billSummary.hasBills && !billSummary.hasPendingBills && (
                    <div className="bg-green-50 rounded-2xl border border-green-200 p-4 flex items-center gap-3">
                        <span className="text-green-600 text-2xl">✓</span>
                        <div>
                            <p className="text-base font-semibold text-green-700">All bills paid</p>
                            {billSummary.totalPaidThisYear > 0 && <p className="text-sm text-green-600">Total paid this year: ₹{billSummary.totalPaidThisYear.toLocaleString('en-IN')}</p>}
                        </div>
                    </div>
                )}

                {bills.length > 0 && (
                    <div className='flex flex-col gap-3 flex-1 overflow-y-auto'>
                        {bills.map((bill, idx) => {
                            const badge = STATUS_BADGE[bill.status] || STATUS_BADGE.PENDING
                            const payable = ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'].includes(bill.status)
                            const hasLateFee = bill.lateFee > 0
                            return (
                                <motion.div key={bill.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                    className={`rounded-2xl border-2 p-4 flex flex-col gap-3 ${bill.isOverdue ? 'border-red-300 bg-red-50' : bill.status === 'PAID' ? 'border-gray-200 bg-white' : 'border-orange-200 bg-orange-50'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-base font-semibold text-gray-900">{bill.period}</p>
                                            <p className="text-sm text-gray-500">Bill: {bill.billNo}</p>
                                            {bill.unitsConsumed !== null && (
                                                <p className="text-xs text-gray-400">
                                                    {bill.unitsConsumed} SCM consumed
                                                    {bill.belowMinimum && <span className="text-orange-600 ml-1">(minimum charge of 4 SCM applied)</span>}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${badge.cls}`}>{badge.label}</span>
                                            <div className="text-right">
                                                {hasLateFee && <p className="text-xs text-red-500 line-through">₹{bill.originalAmount.toLocaleString('en-IN')}</p>}
                                                <p className={`text-xl font-bold ${bill.isOverdue ? 'text-red-700' : 'text-gray-900'}`}>₹{bill.totalPayable.toLocaleString('en-IN')}</p>
                                                {hasLateFee && <p className="text-xs text-red-500">+₹{bill.lateFee.toLocaleString('en-IN')} late fee</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-sm">
                                        <p className="text-gray-500">Due: {new Date(bill.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        {bill.isOverdue && <p className="text-red-600 font-semibold">{bill.daysOverdue} day{bill.daysOverdue > 1 ? 's' : ''} overdue</p>}
                                        {!bill.isOverdue && bill.status !== 'PAID' && <p className="text-orange-600">{bill.daysUntilDue} day{bill.daysUntilDue !== 1 ? 's' : ''} left</p>}
                                        {bill.status === 'PAID' && bill.lastPayment && <p className="text-green-600 text-xs">Paid {new Date(bill.lastPayment.createdAt).toLocaleDateString('en-IN')}</p>}
                                    </div>

                                    {payable && (
                                        <button onClick={() => navigate('/gas/pay', { state: { billId: bill.id, amount: bill.totalPayable, billNo: bill.billNo, period: bill.period, accountId, accountNo: account.accountNo, lateFee: bill.lateFee, originalAmt: bill.originalAmount } })} className="btn-kiosk-primary">
                                            Pay ₹{bill.totalPayable.toLocaleString('en-IN')}
                                        </button>
                                    )}

                                    {bill.status === 'PAYMENT_IN_PROGRESS' && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                            <p className="text-sm text-amber-700 text-center">Payment in progress. Will auto-reset in a few minutes if not completed.</p>
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

export default BillListScreen