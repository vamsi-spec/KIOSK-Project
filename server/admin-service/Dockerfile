FROM node:20-alpine

WORKDIR /app

COPY admin-service/package.json ./
RUN npm install --production

COPY prisma ./prisma
RUN npx prisma generate || true

COPY admin-service/src/ ./src/
EXPOSE 3003
CMD ["node", "src/index.js"]