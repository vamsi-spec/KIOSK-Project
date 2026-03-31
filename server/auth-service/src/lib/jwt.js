import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m'

if(!SECRET){
    console.error('JWT_SECRET is not set in env');
    process.exit(1)
}

export function signToken(payload){
    return jwt.sign(payload,SECRET,{expiresIn:EXPIRES_IN})
}

export function verifyToken(token) {
    return jwt.verify(token,SECRET)
}

export function decodeToken(token){
    return jwt.decode(token)
}
