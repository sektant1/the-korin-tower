import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrações usam a conexão direta (porta 5432). No Supabase, DATABASE_URL é o pooler
  // (porta 6543, modo transação), que não serve para `migrate`.
  datasource: { url: process.env.DIRECT_URL ? env("DIRECT_URL") : env("DATABASE_URL") },
});
