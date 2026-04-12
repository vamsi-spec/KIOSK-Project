import prisma from "../lib/prisma.js"



export const resetTimedOutPayments = async () => {
    const timeoutMs = BILLING.PAYMENT_TIMEOUT_MINUTES * 60 * 1000
    const cutoffTime = new Date(Date.now() - timeoutMs)

    try {
        const stuckTransactions = await prisma.transaction.findMany({
            where: {
                status: 'INITIATED',
                createdAt: {
                    lt: cutoffTime
                }
            },
            include: {
        bill: {
          select: { id: true, status: true }
        }
      }
        })
        if(!stuckTransactions.length === 0) return
         console.log(`[paymentTimeout job] Found ${stuckTransactions.length} timed-out payment(s)`)
         for (const txn of stuckTransactions) {
      if (!txn.bill || txn.bill.status !== 'PAYMENT_IN_PROGRESS') continue

      await prisma.$transaction([
        // Mark the transaction as timed out
        prisma.transaction.update({
          where: { id: txn.id },
          data:  { status: 'FAILED' }
        }),

        // Reset bill back to appropriate status
        prisma.bill.update({
          where: { id: txn.billId },
          data: {
            status: isBillOverdue(txn.bill)
              ? 'OVERDUE'
              : 'PENDING'
          }
        })
      ])

      console.log(`[paymentTimeout job] Reset bill ${txn.billId} — transaction ${txn.id}`)
    }
    } catch (error) {
            console.error('[paymentTimeout job] Error:', err.message)

    }
}

function isBillOverdue(bill) {
  return bill.dueDate && new Date(bill.dueDate) < new Date()
}