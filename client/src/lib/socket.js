import {io} from 'socket.io-client'


const io = io(
    import.meta.env.VITE_API_BASE_URL || 'http://localhost',
    {
        autoConnect: false,
        reconnectionDelay: 1000,
        transports:['websocket','polling']
    }
)

socket.on('connect',    ()    => console.log('✓ Socket connected:', socket.id))
socket.on('disconnect', ()    => console.log('Socket disconnected'))
socket.on('error',      (err) => console.error('Socket error:', err))

export default socket