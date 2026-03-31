import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379',{
    maxRetriesPerRequest: 3,
    retryStrategy(times){
        if(times > 3){
            console.error('[redis] Could not connect after 3 retries');
            return null
        }
        return Math.min(times*200,1000)
    }
})

redis.on('connect',()=>console.log('Redis connected'))
redis.on('error',(err)=>console.error('[redis]Error',err.message))

export default redis
