import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null
    return Math.min(times * 200, 1000)
  }
})

redis.on('connect', () => console.log('✓ core-service Redis connected'))
redis.on('error',   (err) => console.error('[core-service redis]', err.message))

export default redis