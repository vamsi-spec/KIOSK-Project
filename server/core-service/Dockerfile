FROM node:20-alpine

WORKDIR /app

COPY core-service/package.json ./
RUN npm install --production

COPY prisma ./prisma
RUN npx prisma generate || true

COPY core-service/src/ ./src/
EXPOSE 3002
CMD ["node", "src/index.js"]