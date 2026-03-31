import { Router } from "express";
import prisma from "../lib/prisma.js";


export const logoutRouter = Router();


logoutRouter.post('/',async (req,res,next) => {
    try {
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith('Bearer ')){
            return res.status(200).json({message:'Logged out'});
        }

        const token = authHeader.split(' ')[1];
        await prisma.session.deleteMany({ where: { token } })

    res.status(200).json({ message: 'Logged out successfully.' })
    } catch (error) {
        next(error);
    }
})