// Valida /challenges e roda cada solução de referência contra todos os testes
// usando o runner configurado (RUNNER=piston ou local).
//   npm run verify                -> todos
//   npm run verify -- fizzbuzz    -> só os slugs indicados
import "dotenv/config";
import { loadAll } from "@/lib/challenge-loader";
import { judge } from "@/lib/judge/judge";
import { getRunner } from "@/lib/runner";

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const { challenges, errors } = await loadAll(process.cwd());
  if (errors.length) {
    console.error("❌ Erros de estrutura:\n" + errors.map((e) => "  - " + e).join("\n"));
    process.exit(1);
  }
  console.log(`✔ estrutura ok (${challenges.length} desafios)`);

  const runner = getRunner();
  let failed = 0;
  for (const c of challenges) {
    if (only.length && !only.includes(c.slug)) continue;
    if (c.kind !== "stdio") {
      console.log(`· ${c.slug}: ${c.kind}, sem testes de servidor`);
      continue;
    }
    for (const lang of c.languages) {
      const src = c.solutions[lang];
      if (!src) {
        console.log(`· ${c.slug} [${lang}]: sem solução de referência`);
        continue;
      }
      const r = await judge(runner, c, lang, src, c.tests);
      if (!r.compile.ok) {
        failed++;
        console.log(`❌ ${c.slug} [${lang}]: não compilou\n${r.compile.output}`);
        continue;
      }
      const bad = r.tests.filter((t) => t.verdict !== "AC");
      if (bad.length) failed++;
      console.log(
        `${bad.length ? "❌" : "✅"} ${c.slug} [${lang}] ${r.tests.length - bad.length}/${r.tests.length}` +
          bad.map((t) => `\n     ${t.name}: ${t.verdict}${t.message ? " - " + t.message : ""}${t.stderr ? "\n     " + t.stderr.trim() : ""}`).join(""),
      );
    }
  }
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
