import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaClass?: typeof PrismaClient };

// `prisma generate` com o `next dev` rodando troca a classe gerada; o client antigo no
// globalThis não conheceria os models novos ("reading 'findUnique' of undefined").
if (globalForPrisma.prismaClass !== PrismaClient) {
  void globalForPrisma.prisma?.$disconnect();
  globalForPrisma.prisma = undefined;
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definido (veja .env.example)");
  // Serverless (Vercel): poucas conexões por instância; quem segura o volume é o pooler do Supabase.
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: Number(process.env.DB_POOL_MAX ?? 5) }) });
}

// Reaproveita o client entre hot reloads do `next dev`.
export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClass = PrismaClient;
}
