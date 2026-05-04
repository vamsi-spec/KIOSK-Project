import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import KioskLayout from '../../components/KioskLayout'
import api from '../../lib/axios'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'



const AccountsScreen = () => {

    const navigate = useNavigate();
    const { t } = useTranslation();
    const [accounts, setAccounts] = useState([])
    const [loading, setLoading] = useState(true)
    const [errMsg, setErrMsg] = useState('')

    useEffect(() => { fetchAccounts() }, [])

    const fetchAccounts = async () => {
        setLoading(true)
        setErrMsg('')
        try {
            const { data } = await api.get('/core/gas/accounts/mine')
            setAccounts(data.accounts)
        } catch (error) {
            setErrMsg(error.response?.data?.error || t('error_generic'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <KioskLayout>
            <div className='flex flex-col h-full px-8 pt-6 gap-5'>

                <div className='flex items-center justify-between'>
                    <h1 className="text-kiosk-lg font-bold text-gray-900">Your Gas Accounts</h1>
                    <button onClick={fetchAccounts} className="text-brand-blue text-sm font-semibold">Refresh</button>
                </div>

                {loading && (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-gray-400">{t('loading')}</p>
                    </div>
                )}

                {errMsg && !loading && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-red-600 text-base">{errMsg}</p>
                    </div>
                )}

                {!loading && accounts.length > 0 && (
                    <div className='flex flex-col gap-4 flex-1 overflow-y-auto'>
                        {accounts.map((acc, idx) => {
                            const { billSummary } = acc;
                            const pending = billSummary.pendingBill
                            const isOverdue = pending?.isOverdue
                            const hasLateFee = pending?.lateFee > 0

                            return (
                                <motion.div
                                    key={acc.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.08 }}
                                    className={`rounded-2xl border-2 p-5 flex flex-col gap-3
                    ${isOverdue ? 'border-red-300 bg-red-50'
                                            : pending ? 'border-orange-200 bg-orange-50'
                                                : 'border-gray-200 bg-white'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-base font-bold text-gray-900">{acc.accountNo}</p>
                                            <p className="text-sm text-gray-500">{acc.providerName}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{acc.address}</p>
                                        </div>
                                        <button onClick={() => navigate(`/gas/bills/${acc.id}`)} className="text-brand-blue text-sm font-semibold underline">History</button>
                                    </div>

                                    {!billSummary.hasBills && (
                                        <div className="bg-gray-100 rounded-xl p-3">
                                            <p className="text-sm text-gray-500 text-center">No bills yet.</p>
                                            <p className="text-xs text-gray-400 text-center mt-1">Gas bills are generated every 2 months.</p>
                                        </div>
                                    )}

                                    {billSummary.hasBills && !billSummary.hasPendingBills && (
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                                            <span className="text-green-600 text-lg">✓</span>
                                            <p className="text-sm text-green-700 font-semibold">All bills paid</p>
                                        </div>
                                    )}

                                    {pending && (
                                        <>
                                            <div className='flex justify-between items-end'>
                                                <div>
                                                    <p className="text-sm text-gray-500">
                                                        {pending.period}{pending.unitsConsumed !== null ? ` · ${pending.unitsConsumed} SCM` : ''}
                                                    </p>
                                                    {isOverdue
                                                        ? <p className="text-sm text-red-600 font-semibold">{pending.daysOverdue} day{pending.daysOverdue > 1 ? 's' : ''} overdue</p>
                                                        : <p className="text-sm text-orange-600">Due in {pending.daysUntilDue} day{pending.daysUntilDue !== 1 ? 's' : ''}</p>
                                                    }
                                                </div>

                                                <div className="text-right">
                                                    {hasLateFee && (
                                                        <>
                                                            <p className="text-xs text-red-500 line-through">₹{pending.originalAmount.toLocaleString('en-IN')}</p>
                                                            <p className="text-xs text-red-500">+₹{pending.lateFee.toLocaleString('en-IN')} late fee</p>
                                                        </>
                                                    )}
                                                    <p className={`text-kiosk-xl font-bold ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                                                        ₹{pending.totalPayable.toLocaleString('en-IN')}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => navigate('/gas/pay', {
                                                    state: { billId: pending.id, amount: pending.totalPayable, billNo: pending.billNo, period: pending.period, accountId: acc.id, accountNo: acc.accountNo, lateFee: pending.lateFee, originalAmt: pending.originalAmount }
                                                })}
                                                className="btn-kiosk-primary"
                                            >
                                                Pay ₹{pending.totalPayable.toLocaleString('en-IN')} Now
                                            </button>

                                        </>
                                    )}

                                </motion.div>
                            )
                        })}
                    </div>
                )}

                {!loading && accounts.length === 0 && !errMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        className="flex-1 flex flex-col items-center justify-center gap-6 text-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center">
                            <span style={{ fontSize: 36 }}>🔥</span>
                        </div>
                        <div>
                            <p className="text-kiosk-base font-semibold text-gray-900 mb-1">No gas accounts linked yet</p>
                            <p className="text-base text-gray-500">Link your existing PNG account or apply for a new connection.</p>
                        </div>
                        <div className="flex flex-col gap-3 w-full max-w-sm">
                            <button onClick={() => navigate('/gas/link-account')} className="btn-kiosk-primary">Link Existing Account</button>
                            <button onClick={() => navigate('/gas/connection')} className="btn-kiosk-secondary">Apply for New Connection</button>
                        </div>
                    </motion.div>
                )}

                {!loading && accounts.length > 0 && (
                    <div className="flex gap-3 pt-2 border-t border-gray-100">
                        <button onClick={() => navigate('/gas/link-account')} className="flex-1 min-h-[52px] rounded-xl border-2 border-gray-200 text-gray-600 text-base font-semibold active:scale-95 transition-transform">+ Link Account</button>
                        <button onClick={() => navigate('/gas/connection')} className="flex-1 min-h-[52px] rounded-xl border-2 border-brand-blue text-brand-blue text-base font-semibold active:scale-95 transition-transform">New Connection</button>
                    </div>
                )}



            </div>
        </KioskLayout>
    )
}

export default AccountsScreen