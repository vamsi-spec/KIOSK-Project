import {Router} from 'express'
import prisma from '../lib/prisma.js'



export const checkMobileRouter = Router()

checkMobileRouter.get('/',async (req,res,next) => {
    try {
        const {mobile} = req.query
        if(!mobile || !/^[6-9]\d{9}$/.test(mobile)){
            return res.status(422).json({
        error: 'Enter a valid 10-digit Indian mobile number',
        code:  'INVALID_MOBILE'
      })
        }

        const citizen = await prisma.citizen.findUnique({
            where: {mobile},
            select: {id:true,name:true,isVerified:true}
        })

        res.status(200).json({
      registered: !!citizen,
      isVerified: citizen?.isVerified || false,
      name: citizen?.name?.split(' ')[0] || null
    })
    } catch (error) {
        next(error)
    }
})
