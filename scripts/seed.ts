// Importa /challenges para o banco. Idempotente: pode rodar quantas vezes quiser.
//   npm run seed            -> cria/atualiza
//   npm run seed -- --prune -> também apaga desafios que sumiram de /challenges
import "dotenv/config";
import { loadAll } from "@/lib/challenge-loader";
import { prisma } from "@/lib/db";

async function main() {
  const prune = process.argv.includes("--prune");
  const { categories, challenges, tracks, errors } = await loadAll(process.cwd());
  if (errors.length) {
    console.error("❌ Erros em /challenges:\n" + errors.map((e) => "  - " + e).join("\n"));
    process.exit(1);
  }

  for (const c of categories) {
    await prisma.category.upsert({ where: { id: c.id }, create: c, update: c });
  }

  for (const c of challenges) {
    const { tests, category, ...rest } = c;
    const data = { ...rest, categoryId: category };
    await prisma.$transaction(async (tx) => {
      const saved = await tx.challenge.upsert({ where: { slug: c.slug }, create: data, update: data });
      await tx.testCase.deleteMany({ where: { challengeId: saved.id } });
      await tx.testCase.createMany({ data: tests.map((t) => ({ ...t, challengeId: saved.id })) });
    });
    console.log(`✔ ${c.slug} (${tests.filter((t) => !t.hidden).length} públicos, ${tests.filter((t) => t.hidden).length} ocultos)`);
  }

  // Trilhas espelham tracks.yml: as que saíram do arquivo somem do banco.
  for (const t of tracks) await prisma.track.upsert({ where: { id: t.id }, create: t, update: t });
  await prisma.track.deleteMany({ where: { id: { notIn: tracks.map((t) => t.id) } } });

  // Só desafios vindos do disco (sourceDir != null) são candidatos a remoção.
  const orphans = await prisma.challenge.findMany({
    where: { sourceDir: { not: null }, slug: { notIn: challenges.map((c) => c.slug) } },
    select: { slug: true },
  });
  if (orphans.length) {
    if (prune) {
      await prisma.challenge.deleteMany({ where: { slug: { in: orphans.map((o) => o.slug) } } });
      console.log(`🗑  removidos: ${orphans.map((o) => o.slug).join(", ")}`);
    } else {
      console.warn(`⚠ no banco mas não em /challenges: ${orphans.map((o) => o.slug).join(", ")} (use --prune para remover)`);
    }
  }
  console.log(`\n${challenges.length} desafio(s), ${categories.length} categoria(s), ${tracks.length} trilha(s) importados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
