import { Router } from 'express'
import { accountRouter }   from './accounts.route.js'
import { billsRouter }      from './bills.route.js'
import { paymentRouter }    from './payment.route.js'
import { meterRouter }      from './meter.route.js'
import { complaintRouter }  from './complaint.route.js'
import { connectionRouter } from './connection.route.js'

export const gasRouter = Router()

gasRouter.use('/accounts',    accountRouter)
gasRouter.use('/bills',       billsRouter)
gasRouter.use('/payments',    paymentRouter)
gasRouter.use('/meter',       meterRouter)
gasRouter.use('/complaints',  complaintRouter)
gasRouter.use('/connections', connectionRouter)