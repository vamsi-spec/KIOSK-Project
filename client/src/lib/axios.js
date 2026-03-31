import axios from 'axios'
import useStore from '../store/useStore.js'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost/api',
    timeout: 10000,
    headers: {'Content-Type':'application/json'}
})

//Attach jwt automatically to every request

api.interceptors.request.use((config) => {
  const token   = useStore.getState().token
  const kioskId = import.meta.env.VITE_KIOSK_ID || 'KIOSK_001'

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Every request carries the kiosk ID so backend can log it
  config.headers['X-Kiosk-ID'] = kioskId

  return config
})

// Handle 401 globally — expired session → reset to idle
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || ''
    const isAuthFlowRequest = (
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/send-otp') ||
      requestUrl.includes('/auth/verify-otp')
    )

    if (error.response?.status === 401 && !isAuthFlowRequest) {
      useStore.getState().reset()
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export default api
