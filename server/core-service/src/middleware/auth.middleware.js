import axios from 'axios'

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001'

export const auth = async (req,res,next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required.',
        code:  'MISSING_TOKEN'
      })
    }

    const {data} = await axios.get(`${AUTH_URL}/auth/validate-token`,{
        headers: {
            Authorization: authHeader,
            'X-Kiosk-ID': req.headers['x-kiosk-id'] || 'UNKNOWN'
        },
        timeout: 5000
    })

    if(!data.valid){
        return res.status(401).json({
            error: 'Session invalid or expired.',
            code: 'INVALID_TOKEN'
        })
    }

    req.citizen = {
        id: data.citizenId,
        name: data.name,
        mobile: data.mobile,
        preferredLang: data.preferredLang,
        sessionId: data.sessionId
    }

    req.kioskId = req.headers['x-kiosk-id'] || data.kioskId || 'UNKNOWN'
    next()


    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED') {
      return res.status(503).json({
        error: 'Authentication service unavailable. Please try again.',
        code:  'AUTH_SERVICE_DOWN'
      })
    }

    return res.status(401).json({
      error: 'Authentication failed.',
      code:  'AUTH_FAILED'
    })
    }
}



