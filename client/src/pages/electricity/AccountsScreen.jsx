import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import api from '../../lib/axios.js'
import KioskLayout from '../../components/KioskLayout.jsx'

export default function AccountsScreen() {
    const navigate = useNavigate()
    const { t } = useTranslation()

    const [accounts, setAccounts] = useState([])
    const [loading, setLoading] = useState(true)
    const [errMsg, setErrMsg] = useState('')

    useEffect(() => { fetchAccounts() }, [])

    const fetchAccounts = async () => {
        setLoading(true)
        setErrMsg('')
        try {
            const { data } = await api.get('/core/electricity/accounts/mine')
            setAccounts(data.accounts)
        } catch (err) {
            setErrMsg(t('error_generic'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <KioskLayout>
            <div className="flex flex-col h-full px-8 pt-6 gap-5">
                <div className="flex items-center justify-between">
                    <h1 className="text-kiosk-lg font-bold text-gray-900">{t('your_accounts')}</h1>
                    <button onClick={fetchAccounts} className="text-brand-blue text-sm font-semibold">{t('refresh')}</button>
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

                {/* Account cards */}
                {!loading && accounts.length > 0 && (
                    <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
                        {accounts.map((acc, idx) => (
                            <AccountCard key={acc.id} account={acc} idx={idx}
                                t={t}
                                onPayNow={(pending) => navigate('/electricity/pay', {
                                    state: {
                                        billId: pending.id,
                                        amount: pending.totalPayable,
                                        billNo: pending.billNo,
                                        period: pending.period,
                                        accountId: acc.id,
                                        accountNo: acc.accountNo,
                                        lateFee: pending.lateFee,
                                        originalAmt: pending.originalAmount
                                    }
                                })}
                                onViewBills={() => navigate(`/electricity/bills/${acc.id}`)}
                            />
                        ))}
                    </div>
                )}

                {/* No accounts — first time */}
                {!loading && accounts.length === 0 && !errMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1 flex flex-col items-center justify-center gap-6 text-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                            <span style={{ fontSize: 36 }}>⚡</span>
                        </div>
                        <div>
                            <p className="text-kiosk-base font-semibold text-gray-900 mb-1">{t('no_accounts_yet')}</p>
                            <p className="text-base text-gray-500">
                                {t('no_accounts_desc')}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 w-full max-w-sm">
                            <button onClick={() => navigate('/electricity/link-account')} className="btn-kiosk-primary">
                                {t('link_existing_account')}
                            </button>
                            <button onClick={() => navigate('/electricity/connection')} className="btn-kiosk-secondary">
                                {t('apply_new_connection')}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Bottom buttons when accounts exist */}
                {!loading && accounts.length > 0 && (
                    <div className="flex gap-3 pt-2 border-t border-gray-100">
                        <button
                            onClick={() => navigate('/electricity/link-account')}
                            className="flex-1 min-h-[52px] rounded-xl border-2 border-gray-200 text-gray-600 text-base font-semibold active:scale-95 transition-transform"
                        >
                            {t('link_another_account')}
                        </button>
                        <button
                            onClick={() => navigate('/electricity/connection')}
                            className="flex-1 min-h-[52px] rounded-xl border-2 border-brand-blue text-brand-blue text-base font-semibold active:scale-95 transition-transform"
                        >
                            {t('new_connection')}
                        </button>
                    </div>
                )}
            </div>
        </KioskLayout>
    )
}

function AccountCard({ account, idx, onPayNow, onViewBills, t }) {
    const { billSummary } = account
    const pending = billSummary.pendingBill
    const isOverdue = pending?.isOverdue
    const hasLateFee = pending?.lateFee > 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className={`rounded-2xl border-2 p-5 flex flex-col gap-3
        ${isOverdue ? 'border-red-300 bg-red-50' : pending ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-base font-bold text-gray-900">{account.accountNo}</p>
                    <p className="text-sm text-gray-500">{account.providerName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{account.address}</p>
                </div>
                <button onClick={onViewBills} className="text-brand-blue text-sm font-semibold underline">{t('history')}</button>
            </div>

            {!billSummary.hasBills && (
                <div className="bg-gray-100 rounded-xl p-3">
                    <p className="text-sm text-gray-500 text-center">{t('no_bills_yet')}</p>
                </div>
            )}

            {billSummary.hasBills && !billSummary.hasPendingBills && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <p className="text-sm text-green-700 font-semibold">{t('all_bills_paid')}</p>
                </div>
            )}

            {pending && (
                <>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-sm text-gray-500">{pending.period} · {t('kwh_consumed', { units: pending.unitsConsumed })}</p>
                            {isOverdue
                                ? <p className="text-sm text-red-600 font-semibold">{t('days_overdue', { days: pending.daysOverdue })}</p>
                                : <p className="text-sm text-blue-600">{t('due_in_days', { days: pending.daysUntilDue })}</p>
                            }
                        </div>
                        <div className="text-right">
                            {hasLateFee && (
                                <>
                                    <p className="text-xs text-red-500 line-through">₹{pending.originalAmount.toLocaleString('en-IN')}</p>
                                    <p className="text-xs text-red-500">{t('late_fee_label', { amount: pending.lateFee.toLocaleString('en-IN') })}</p>
                                </>
                            )}
                            <p className={`text-kiosk-xl font-bold ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                                ₹{pending.totalPayable.toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => onPayNow(pending)} className="btn-kiosk-primary">
                        {t('pay_now', { amount: pending.totalPayable.toLocaleString('en-IN') })}
                    </button>
                </>
            )}
        </motion.div>
    )
}
