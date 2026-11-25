// Valida /challenges e roda cada solução de referência contra todos os testes,
// pelo mesmo CodeRunner do site (montagem do driver, limites, checker), mas com
// o motor local (gcc, g++, rustc e python3 da máquina; veja scripts/local-engine.ts).
// Roda no CI antes de todo deploy: desafio quebrado não chega ao site.
//   npm run verify                -> todos
//   npm run verify -- fizzbuzz    -> só os slugs indicados
import "dotenv/config";
import { loadAll } from "@/lib/challenge-loader";
import { createCodeRunner, perTestLimit, withHarness } from "@/lib/runner/code-runner";
import { LocalEngine } from "./local-engine";

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const { challenges, errors } = await loadAll(process.cwd());
  if (errors.length) {
    console.error("❌ Erros de estrutura:\n" + errors.map((e) => "  - " + e).join("\n"));
    process.exit(1);
  }
  console.log(`✔ estrutura ok (${challenges.length} desafios)`);

  const local = new LocalEngine();
  // Compilação local, sem o cache do Compiler Explorer: o prazo de 5 s do site não se aplica aqui.
  const runner = createCodeRunner({ c: local, cpp: local, rust: local, python: local }, { deadlineMs: 600_000 });
  let failed = 0;
  for (const c of challenges) {
    if (only.length && !only.includes(c.slug)) continue;
    for (const lang of c.languages) {
      const src = c.solutions[lang];
      if (!src) {
        console.log(`· ${c.slug} [${lang}]: sem solução de referência`);
        continue;
      }
      const code = c.drivers[lang] ? withHarness(lang, src, c.drivers[lang]) : src;
      const r = await runner.runAndTest(code, lang, c.tests, { checker: c.checker, timeLimitMs: c.timeLimitMs });
      if (!r.compile.ok) {
        failed++;
        console.log(`❌ ${c.slug} [${lang}]: não compilou\n${r.compile.output}`);
        continue;
      }
      const bad = r.tests.filter((t) => t.verdict !== "AC");
      if (bad.length) failed++;
      const worst = Math.max(0, ...r.tests.map((t) => t.timeMs ?? 0));
      const limit = perTestLimit(lang, c.timeLimitMs);
      // Folga: a máquina do CI não é a do Compiler Explorer nem a do jogador.
      const tight = worst > limit / 2 ? ` ⚠ pior teste ${worst} ms (limite ${limit} ms)` : "";
      console.log(
        `${bad.length ? "❌" : "✅"} ${c.slug} [${lang}] ${r.tests.length - bad.length}/${r.tests.length}${tight}` +
          bad.map((t) => `\n     ${t.name}: ${t.verdict}${t.message ? " - " + t.message : ""}${t.stderr ? "\n     " + t.stderr.trim().slice(0, 400) : ""}`).join(""),
      );
    }
  }
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
