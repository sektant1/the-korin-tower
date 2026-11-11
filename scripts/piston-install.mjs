// Instala no Piston os compiladores usados pelo site (roda uma vez, idempotente).
// Uso: PISTON_URL=http://localhost:2000 node scripts/piston-install.mjs
// No docker-compose roda automaticamente pelo serviço `piston-init`, como rede de
// segurança: a imagem `piston/Dockerfile` já traz os runtimes embutidos.
const BASE = process.env.PISTON_URL ?? "http://localhost:2000";
// gcc cobre C, C++, D e Fortran.
const WANTED = (process.env.PISTON_PACKAGES ?? "gcc,rust").split(",");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForPiston() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/api/v2/runtimes`);
      if (r.ok) return;
    } catch {
      /* ainda subindo */
    }
    await sleep(2000);
  }
  throw new Error(`Piston não respondeu em ${BASE}`);
}

const cmpVersion = (a, b) => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
};

await waitForPiston();
const packages = await (await fetch(`${BASE}/api/v2/packages`)).json();

for (const lang of WANTED) {
  const versions = packages.filter((p) => p.language === lang);
  if (!versions.length) {
    console.warn(`⚠ pacote '${lang}' não existe no repositório do Piston`);
    continue;
  }
  if (versions.some((p) => p.installed)) {
    console.log(`✔ ${lang} já instalado`);
    continue;
  }
  const latest = versions.map((p) => p.language_version).sort(cmpVersion).at(-1);
  console.log(`⬇ instalando ${lang} ${latest}...`);
  const r = await fetch(`${BASE}/api/v2/packages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ language: lang, version: latest }),
  });
  if (!r.ok) throw new Error(`falha ao instalar ${lang}: ${r.status} ${await r.text()}`);
  console.log(`✔ ${lang} ${latest}`);
}

const runtimes = await (await fetch(`${BASE}/api/v2/runtimes`)).json();
console.log("Runtimes disponíveis:", runtimes.map((r) => `${r.language}@${r.version}`).join(", "));
