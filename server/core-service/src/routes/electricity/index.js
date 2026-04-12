import { Router } from "express";
import { complaintRouter } from "./complaint.route.js";
import { accountsRouter } from "./accounts.route.js";
import { billsRouter } from "./bills.route.js";
import { meterRouter } from "./meter.route.js";
import { paymentRouter } from "./payment.route.js";



export const electricityRouter = Router()


electricityRouter.use('/accounts',accountsRouter)
electricityRouter.use('/bills',billsRouter)
electricityRouter.use('/meter',meterRouter)
electricityRouter.use('/payments',paymentRouter)
electricityRouter.use('/complaints',complaintRouter)

