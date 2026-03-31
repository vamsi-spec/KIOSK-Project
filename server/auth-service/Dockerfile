FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install dependencies first (better Docker layer caching)
COPY auth-service/package.json ./
RUN npm install --production

# Copy shared prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY auth-service/src/ ./src/

EXPOSE 3001

CMD ["node", "src/index.js"]