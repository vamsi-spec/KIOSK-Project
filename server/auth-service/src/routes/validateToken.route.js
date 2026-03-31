import { Router } from "express";
import prisma from "../lib/prisma.js";
import { verifyToken } from "../lib/jwt.js";


export const validateTokenRouter = Router();

validateTokenRouter.get('/',async(req,res,next) => {
    try {
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith('Bearer ')){
            return res.status(404).json({valid:false,error:'No token provided',code:'MISSING_TOKEN'})
        }

        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (jwtErr) {
            const code = jwtErr.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
      return res.status(401).json({
        valid: false,
        error: jwtErr.message,
        code
      })
        }

        const session = await prisma.session.findUnique({
            where: {token},
            select:{id:true,expiresAt:true,kioskId:true}
        })

        if(!session){
            return res.status(401).json({
                valid:false,
                error:'Session has been revoked or not exist',
                code:'SESSION_REVOKED'
            })
        }
        if(new Date() > session.expiresAt){
            return res.status(401).json({
                valid:false,
                error:'Token expires',
                code:'SESSION_EXPIRED'
            })
        }

        res.status(200).json({
      valid:     true,
      citizenId: decoded.sub,
      name:      decoded.name,
      mobile:    decoded.mobile,
      preferredLang: decoded.preferredLang,
      kioskId:   decoded.kioskId,
      sessionId: session.id,
      expiresAt: session.expiresAt
    })

    } catch (error) {
        next(error)
    }
})
