// Gera um convite pela linha de comando (é assim que nasce o primeiro admin).
//   npm run invite             -> convite comum
//   npm run invite -- --admin  -> quem usar vira admin
//   npm run invite -- --days 7 -> vence em 7 dias
import "dotenv/config";
import { createInvite } from "@/lib/auth/invites";
import { prisma } from "@/lib/db";

async function main() {
  const isAdmin = process.argv.includes("--admin");
  const i = process.argv.indexOf("--days");
  const days = i > 0 ? Number(process.argv[i + 1]) : undefined;
  if (days !== undefined && !(days > 0)) throw new Error("--days precisa de um número positivo");
  const invite = await createInvite({ isAdmin, days });
  console.log(`${invite.code}${isAdmin ? "  (admin)" : ""}${invite.expiresAt ? `  vence em ${invite.expiresAt.toISOString()}` : ""}`);
  console.log("Use em /entrar → Criar conta.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
