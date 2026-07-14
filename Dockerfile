FROM node:22-alpine

# better-sqlite3 needs native compilation tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/assetmanagement.db
EXPOSE 3000
VOLUME ["/data"]

# Run pending migrations then start the server
CMD ["sh", "-c", "node --import tsx server/infrastructure/db/migrate.ts && node .output/server/index.mjs"]
