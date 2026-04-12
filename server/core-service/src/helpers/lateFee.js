import prisma from "../lib/prisma.js"



async function getProviderConfig(providerName) {
    const config = await prisma.providerConfig.findUnique({
        where: {providerName}
    })
    return {
        lateFeeRatePerMonth: config ? Number(config.lateFeeRatePerMonth) : BILLING.DEFAULT_LATE_FEE_RATE_PER_MONTH,
    lateFeGraceDays: config?.lateFeGraceDays ?? BILLING.DEFAULT_LATE_FEE_GRACE_DAYS,
    lateFeeCap:      config ? Number(config.lateFeeCap) : null
    }
}


export const calculateLateFee = async  (bill,providerName) => {
    if(bill.status === 'PAID') return 0
    const dueDate = new Date(bill.dueDate)
    const today = new Date()
    if(today <= dueDate) return 0;
    const config = await getProviderConfig(providerName)
    const dueOverDue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
    if (daysOverdue <= config.lateFeGraceDays) return 0

    const billAmount = Number(bill.amount)
    const monthsOverdue = daysOverdue/30

    let lateFee = billAmount * config.lateFeeRatePerMonth * monthsOverdue

    if (config.lateFeeCap !== null) {
    const maxFee = billAmount * config.lateFeeCap
    lateFee = Math.min(lateFee, maxFee)
  }

  // Round to 2 decimal places
  return Math.round(lateFee * 100) / 100

}

export const enrichBill = async (bill,providerName) => {
    const today = new Date()
    const dueDate = new Date(bill.dueDate)
    const isOverdue = today > dueDate && bill.status !== 'PAID'
    const daysOverdue = isOverdue
    ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
    : 0
  const daysUntilDue = !isOverdue
    ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
    : 0

    const lateFee = await calculateLateFee(bill,providerName)
    const originalAmt = Number(bill.amount)
    const totalPayable = Math.round((originalAmt + lateFee) * 100) / 100


    const paidAmount = bill.transactions
    ? bill.transactions
        .filter(t => t.status === 'SUCCESS')
        .reduce((sum, t) => sum + Number(t.amount), 0)
    : 0

    const remainingBalance = Math.round((totalPayable - paidAmount) * 100) / 100

    return {
    id:             bill.id,
    billNo:         bill.billNo,
    period:         bill.period,
    dueDate:        bill.dueDate,
    status:         bill.status,
    unitsConsumed:  bill.unitsConsumed ? Number(bill.unitsConsumed) : null,
    generatedAt:    bill.generatedAt,

    // Money fields
    originalAmount: originalAmt,
    lateFee:        lateFee,
    totalPayable:   totalPayable,
    paidAmount:     paidAmount,
    remainingBalance: remainingBalance,

    // Date calculations
    isOverdue:    isOverdue,
    daysOverdue:  daysOverdue,
    daysUntilDue: daysUntilDue,

    // Last successful payment
    lastPayment: bill.transactions
      ? bill.transactions.find(t => t.status === 'SUCCESS') || null
      : null
  }
}