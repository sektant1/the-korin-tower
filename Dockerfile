FROM node:24-bookworm-slim AS build
WORKDIR /app
# prisma.config.ts exige a variável mesmo só para gerar o client (o valor real vem do compose).
ENV DATABASE_URL=postgresql://korin:korin@db:5432/korin
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npx next build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# Copia tudo (inclui prisma CLI e tsx, usados por migrate e seed na subida).
COPY --from=build /app ./
EXPOSE 3000
# A cada subida: aplica migrações e reimporta /challenges (idempotente).
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx scripts/seed.ts && npx next start -H 0.0.0.0 -p 3000"]
