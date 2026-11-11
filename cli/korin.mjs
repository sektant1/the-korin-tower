#!/usr/bin/env node
// korin — CLI da Korin Tower (Fase 6). Um arquivo, sem dependências, Node 22+.
//
// Fluxo, no espírito das CLIs do LeetCode: `korin pick <slug>` baixa o enunciado,
// o template e os testes públicos para uma pasta; você edita no seu editor;
// `korin test` roda os testes públicos (no servidor, ou `--local` na sua máquina);
// `korin submit` roda todos, inclusive os ocultos, e marca o desafio como resolvido.
//
// Instalação: `curl -fsSL <site>/install.sh | bash` (Windows: `irm <site>/install.ps1 | iex`).
// Atualize com `korin update`.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { homedir, platform } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const VERSION = "0.7.0";
const WORKSPACE = ".korin.json";
const DEFAULT_URL = "https://the-korin-tower.vercel.app";

// ---- cores -----------------------------------------------------------------
const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const bold = paint("1");
const dim = paint("2");
const red = paint("31");
const green = paint("32");
const yellow = paint("33");
const cyan = paint("36");
const VERDICT = { AC: green("AC"), WA: red("WA"), TLE: yellow("TLE"), RE: red("RE"), OLE: yellow("OLE") };

class CliError extends Error {}
const fail = (msg) => {
  throw new CliError(msg);
};

// ---- configuração (~/.config/korin/config.json) ---------------------------------
function configDir() {
  if (process.env.KORIN_CONFIG_DIR) return process.env.KORIN_CONFIG_DIR;
  if (platform() === "win32") return path.join(process.env.APPDATA || path.join(homedir(), "AppData", "Roaming"), "korin");
  return path.join(process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config"), "korin");
}
const configFile = () => path.join(configDir(), "config.json");

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function loadConfig() {
  const c = readJson(configFile(), {});
  return {
    url: (process.env.KORIN_URL || c.url || DEFAULT_URL).replace(/\/+$/, ""),
    token: process.env.KORIN_TOKEN || c.token || "",
    language: c.language || "",
  };
}

function saveConfig(c) {
  mkdirSync(configDir(), { recursive: true });
  writeFileSync(configFile(), JSON.stringify(c, null, 2) + "\n", { mode: 0o600 });
  try {
    chmodSync(configFile(), 0o600);
  } catch {}
}

// ---- HTTP -----------------------------------------------------------------------
async function api(cfg, method, route, body) {
  const headers = { accept: "application/json", "user-agent": `korin-cli/${VERSION}` };
  if (cfg.token) headers.authorization = `Bearer ${cfg.token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  let res;
  try {
    res = await fetch(cfg.url + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (e) {
    fail(`não consegui falar com ${cfg.url}: ${e.message}`);
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text.slice(0, 200) || `${res.status} ${res.statusText}` };
  }
  if (!res.ok) {
    const msg = data?.error || `${res.status} ${res.statusText}`;
    if (res.status === 401) fail(`${msg}\n  → gere um token em ${cfg.url}/conta e rode: korin login`);
    if (res.status === 429) fail(`${msg} (retry-after: ${res.headers.get("retry-after") ?? "?"}s)`);
    fail(msg);
  }
  return data;
}

// ---- argumentos -------------------------------------------------------------------
// Flags: --nome valor | --nome=valor | -x valor | --booleana. O resto é posicional.
const BOOL_FLAGS = new Set(["todo", "json", "pick", "fresh", "local", "help", "version", "yes", "all", "open"]);
const SHORT = { c: "category", l: "language", d: "dir", i: "input", u: "url", t: "token", h: "help", v: "version", a: "floor" };

function parseArgs(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") {
      pos.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split(/=(.*)/s);
      if (v !== undefined) flags[k] = v;
      else if (BOOL_FLAGS.has(k)) flags[k] = true;
      else flags[k] = argv[++i];
    } else if (/^-[a-zA-Z]$/.test(a)) {
      const k = SHORT[a[1]] ?? a[1];
      if (BOOL_FLAGS.has(k)) flags[k] = true;
      else flags[k] = argv[++i];
    } else pos.push(a);
  }
  return { flags, pos };
}

// ---- pasta do desafio (.korin.json) ----------------------------------------------------
function findWorkspace(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    const f = path.join(dir, WORKSPACE);
    if (existsSync(f)) return { dir, ws: readJson(f, null) || fail(`${f} está corrompido`) };
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function requireWorkspace() {
  return findWorkspace() ?? fail(`esta pasta não é de um desafio (sem ${WORKSPACE}). Rode: korin pick <slug>`);
}

function readSource(w, fileArg) {
  const file = fileArg ? path.resolve(fileArg) : path.join(w.dir, w.ws.file);
  if (!existsSync(file)) fail(`arquivo não encontrado: ${file}`);
  return { file, source: readFileSync(file, "utf8") };
}

function listLocalTests(dir) {
  const tdir = path.join(dir, "tests");
  if (!existsSync(tdir)) return [];
  return readdirSync(tdir)
    .filter((f) => f.endsWith(".in"))
    .sort()
    .map((f) => {
      const base = f.slice(0, -3);
      const out = path.join(tdir, base + ".out");
      return { name: base, input: readFileSync(path.join(tdir, f), "utf8"), expected: existsSync(out) ? readFileSync(out, "utf8") : "" };
    });
}

async function readStdinIfPiped() {
  if (process.stdin.isTTY) return null;
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

// ---- saída bonita -----------------------------------------------------------------------
const stars = (n) => yellow("★".repeat(n)) + dim("☆".repeat(5 - n));
const stateTag = (s) => (s === "solved" ? green("CLEAR") : s === "gaveup" ? dim("desistiu") : "     ");

function printCompile(compile) {
  if (compile.ok) {
    if (compile.output?.trim()) console.log(dim(compile.output.trim()));
    return true;
  }
  console.log(red(bold("✘ erro de compilação")));
  console.log(compile.output);
  return false;
}

function firstDiff(expected, got) {
  const a = normalize(expected).split("\n");
  const b = normalize(got).split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return `linha ${i + 1}: esperado ${JSON.stringify(a[i] ?? "")}, obtido ${JSON.stringify(b[i] ?? "")}`;
  }
  return "";
}

function printTests(tests, { showDiff = true } = {}) {
  const width = Math.max(4, ...tests.map((t) => t.name.length));
  for (const t of tests) {
    const ok = t.verdict === "AC";
    const time = t.timeMs != null ? dim(`${t.timeMs} ms`) : "";
    const hidden = t.hidden ? dim(" (oculto)") : "";
    let extra = t.message && !ok ? dim(` ${t.message}`) : "";
    if (!ok && t.verdict === "WA" && !t.hidden && showDiff) extra = dim(" " + firstDiff(t.expected, t.stdout));
    console.log(`${ok ? green("✔") : red("✘")} ${t.name.padEnd(width)}  ${VERDICT[t.verdict] ?? t.verdict}  ${time}${hidden}${extra}`);
    if (!ok && !t.hidden && t.stderr?.trim()) console.log(dim("    stderr: " + t.stderr.trim().split("\n").slice(0, 5).join("\n            ")));
  }
}

function summarize(tests, allPassed) {
  const ok = tests.filter((t) => t.verdict === "AC").length;
  const line = `${ok}/${tests.length} testes`;
  console.log(allPassed ? green(bold(`\n${line} — tudo certo!`)) : red(bold(`\n${line}`)));
}

// ---- comandos ------------------------------------------------------------------------
const commands = {};

commands.help = async () => {
  console.log(`${bold("korin")} ${VERSION} — desafios da Korin Tower no seu terminal

${bold("Começando")}
  korin login [--url URL] [--token TOKEN]   guarda o token (gere em <site>/conta)
  korin status                              seu andar, pontos, esferas e o que falta para subir
  korin next [--pick]                       o próximo desafio da torre (--pick já baixa)
  korin list [-a ANDAR] [-c CATEGORIA] [--todo]   os desafios, andar por andar
  korin tracks                              os detonados e seu progresso em cada um
  korin daily [--pick]                      desafio do dia (--pick já baixa)

${bold("Resolvendo")}
  korin pick SLUG [-l LINGUAGEM] [-d PASTA] baixa enunciado, template e testes públicos
  korin show                                mostra o enunciado (Markdown) da pasta atual
  korin run [ARQUIVO] [-i ENTRADA]          compila e executa; stdin por pipe, -i, ou o 1º teste
  korin test [ARQUIVO] [--local]            testes públicos (no servidor; --local usa seu gcc)
  korin submit [ARQUIVO]                    todos os testes, inclusive ocultos; pontua
  korin push [ARQUIVO]                      salva o código como rascunho na sua conta
  korin hint                                revela a próxima dica (desconta pontos)
  korin solution                            solução de referência (depois de resolver/desistir)
  korin giveup                              desiste: libera a solução, zera os pontos deste
  korin open                                abre o desafio no navegador

${bold("Outros")}
  korin doctor                              confere Node, token, servidor e compiladores locais
  korin config [lang=LINGUAGEM] [url=URL]   preferências
  korin update                              baixa a versão mais nova do site
  korin logout

Variáveis: KORIN_URL, KORIN_TOKEN, KORIN_CONFIG_DIR, NO_COLOR.
Config: ${configFile()}`);
};

commands.version = async () => console.log(VERSION);

commands.login = async ({ flags }) => {
  const cfg = loadConfig();
  if (flags.url) cfg.url = String(flags.url).replace(/\/+$/, "");
  let token = flags.token;
  if (!token) {
    console.log(`Gere um token em ${cyan(cfg.url + "/conta")} (janela "Tokens da CLI") e cole aqui.`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    token = (await rl.question("token: ")).trim();
    rl.close();
  }
  if (!/^korin_/.test(token)) fail("isso não parece um token (começa com korin_)");
  const me = await api({ ...cfg, token }, "GET", "/api/cli/me");
  saveConfig({ ...cfg, token });
  console.log(green(`✔ logado como ${bold(me.username)} em ${cfg.url} (${me.points} pontos, ${me.solved} resolvidos)`));
};

commands.logout = async () => {
  const cfg = loadConfig();
  saveConfig({ ...cfg, token: "" });
  console.log("token removido deste computador (revogue também em /conta se quiser).");
};

commands.config = async ({ pos }) => {
  const cfg = loadConfig();
  if (!pos.length) {
    console.log(`url      ${cfg.url}\nlanguage ${cfg.language || dim("(a primeira do desafio)")}\ntoken    ${cfg.token ? cfg.token.slice(0, 12) + "…" : dim("(sem login)")}`);
    return;
  }
  for (const p of pos) {
    const [k, v] = p.split(/=(.*)/s);
    if (k === "lang" || k === "language") cfg.language = v ?? "";
    else if (k === "url") cfg.url = (v ?? DEFAULT_URL).replace(/\/+$/, "");
    else fail(`chave desconhecida: ${k} (use lang= ou url=)`);
  }
  saveConfig(cfg);
  console.log(green("✔ salvo"));
};

commands.status = async () => {
  const cfg = loadConfig();
  if (!cfg.token) fail("sem login. Rode: korin login");
  const me = await api(cfg, "GET", "/api/cli/me");
  console.log(`${bold(me.username)}${me.isAdmin ? dim(" (admin)") : ""} @ ${cfg.url}`);
  console.log(`andar ${bold(me.floor)}/${me.floorsTotal}   pontos: ${me.points}   resolvidos: ${me.solved}   esferas: ${me.balls}/${me.ballsTotal}`);
  for (const f of [...me.floors].reverse()) {
    const tag = f.scored === 0 ? dim("em obras") : f.open ? green("aberto") : dim("trancado");
    const bar = f.scored ? `${f.solved}/${f.scored}` : "";
    const need = f.open && f.missingForNext > 0 && f.n < me.floorsTotal ? dim(` · faltam ${f.missingForNext} para o andar ${f.n + 1}`) : "";
    console.log(`  ${f.n === me.floor ? yellow("▶") : " "} andar ${f.n}  ${f.name.padEnd(22)} ${tag} ${bar}${need}`);
  }
};
commands.whoami = (...a) => commands.status(...a);

commands.next = async ({ flags }) => {
  const cfg = loadConfig();
  const { next } = await api(cfg, "GET", "/api/cli/next" + (flags.track ? `?track=${encodeURIComponent(flags.track)}` : ""));
  if (!next) return console.log(dim("nada aberto por enquanto: você fez tudo que a torre tem."));
  const why = next.track ? `continua o detonado ${bold(next.track.title)}` : next.reason === "floor" ? `andar ${next.floor}` : `andar ${next.floor} (abaixo do seu)`;
  console.log(`${yellow("▶")} ${bold(next.title)} ${stars(next.difficulty)}  ${dim(next.slug)}  ${dim(why)}`);
  if (!cfg.token) console.log(dim("(sem login o próximo é sempre o primeiro da torre: korin login)"));
  if (flags.pick) await commands.pick({ flags, pos: [next.slug] });
  else console.log(`korin pick ${next.slug}`);
};

commands.tracks = async () => {
  const { tracks } = await api(loadConfig(), "GET", "/api/cli/tracks");
  for (const t of tracks) {
    const done = t.done === t.total && t.total > 0;
    console.log(`\n${bold(cyan(t.title))}  ${done ? green("ZERADO ★") : dim(`${t.done}/${t.total}`)}  ${dim(t.id)}`);
    console.log(dim(`  ${t.description}`));
    for (const s of t.steps) {
      const mark = s.state === "solved" ? green("✔") : s.slug === t.next ? yellow("▶") : dim("·");
      console.log(`  ${mark} ${s.slug.padEnd(28)} ${stars(s.difficulty)}  ${s.title}${s.scored ? "" : dim(" [livre]")}`);
    }
  }
  console.log(dim("\nkorin next --track <id> --pick baixa o próximo passo de um detonado."));
};

commands.doctor = async () => {
  const cfg = loadConfig();
  const [maj, min] = process.versions.node.split(".").map(Number);
  const nodeOk = maj > 22 || (maj === 22 && min >= 7);
  console.log(`${nodeOk ? green("✔") : red("✘")} node ${process.versions.node}${nodeOk ? "" : " (precisa de 22.7+)"}`);
  console.log(`${green("✔")} korin ${VERSION} em ${fileURLToPath(import.meta.url)}`);
  console.log(`${dim("·")} config em ${configFile()}`);
  try {
    const r = await fetch(`${cfg.url}/api/cli/challenges`, { headers: { accept: "application/json" } });
    console.log(`${r.ok ? green("✔") : red("✘")} servidor ${cfg.url} (${r.status})`);
  } catch (e) {
    console.log(`${red("✘")} servidor ${cfg.url}: ${e.message}`);
  }
  if (!cfg.token) console.log(`${yellow("!")} sem token: korin login`);
  else {
    try {
      const me = await api(cfg, "GET", "/api/cli/me");
      console.log(`${green("✔")} token de ${bold(me.username)}`);
    } catch (e) {
      console.log(`${red("✘")} token inválido: ${e.message.split("\n")[0]}`);
    }
  }
  const tools = [["gcc", "c"], ["g++", "cpp"], ["rustc", "rust"]];
  const found = tools.filter(([bin]) => !spawnSync(bin, ["--version"], { stdio: "ignore" }).error);
  console.log(`${dim("·")} compiladores para korin test --local: ${found.length ? found.map(([b, l]) => `${b} (${l})`).join(", ") : dim("nenhum no PATH; use o servidor")}`);
};

commands.list = async ({ flags }) => {
  const cfg = loadConfig();
  const q = flags.category ? `?category=${encodeURIComponent(flags.category)}` : "";
  const data = await api(cfg, "GET", "/api/cli/challenges" + q);
  let list = data.challenges;
  if (flags.todo) list = list.filter((c) => c.state !== "solved");
  if (flags.floor) list = list.filter((c) => c.floor === Number(flags.floor));
  if (flags.json) return console.log(JSON.stringify(list, null, 2));
  if (!list.length) return console.log(dim("nada por aqui."));
  const cats = new Map(data.categories.map((c) => [c.id, c.name]));
  const width = Math.max(...list.map((c) => c.slug.length));
  for (const f of data.floors ?? []) {
    const here = list.filter((c) => c.floor === f.n);
    if (!here.length) continue;
    const state = f.scored === 0 ? dim("em obras") : f.open ? green(`${f.solved}/${f.scored}`) : dim("trancado");
    console.log(`\n${bold(cyan(`andar ${f.n} · ${f.name}`))}  ${state}`);
    for (const c of here) {
      const daily = c.slug === data.daily ? yellow(" ☀ hoje") : "";
      const kind = c.kind !== "stdio" ? dim(` [${c.kind}]`) : "";
      const locked = c.locked ? dim(" (trancado)") : "";
      console.log(`  ${stateTag(c.state)}  ${c.slug.padEnd(width)}  ${stars(c.difficulty)}  ${c.title}  ${dim(cats.get(c.category) ?? c.category)}${kind}${daily}${locked}`);
    }
  }
  console.log(dim(`\n${list.length} desafio(s). korin next --pick baixa o próximo; korin pick <slug> escolhe um.`));
};

commands.daily = async ({ flags }) => {
  const cfg = loadConfig();
  const d = await api(cfg, "GET", "/api/cli/daily");
  console.log(`${yellow("☀")} desafio do dia (${d.day}): ${bold(d.title)}  ${stars(d.difficulty)}  ${dim(d.slug)}`);
  console.log(dim("resolver hoje vale +50% dos pontos."));
  if (flags.pick) await commands.pick({ flags, pos: [d.slug] });
  else console.log(`korin pick ${d.slug}`);
};

commands.pick = async ({ flags, pos }) => {
  const slug = pos[0] ?? fail("uso: korin pick <slug> [-l linguagem] [-d pasta]");
  const cfg = loadConfig();
  const c = await api(cfg, "GET", `/api/cli/challenges/${encodeURIComponent(slug)}`);
  const want = flags.language || cfg.language;
  let language = c.languages[0];
  if (want) {
    if (!c.languages.includes(want)) {
      if (flags.language) fail(`${slug} não aceita ${want}; linguagens: ${c.languages.join(", ")}`);
      console.log(dim(`(${want} não vale aqui; usando ${language})`));
    } else language = want;
  }
  const file = c.files[language];
  const dir = path.resolve(flags.dir || slug);
  mkdirSync(path.join(dir, "tests"), { recursive: true });

  const header = [
    `# ${c.title}`,
    "",
    `> ${"★".repeat(c.difficulty)}${"☆".repeat(5 - c.difficulty)} · categoria: ${c.category} · tags: ${c.tags.join(", ") || "—"}`,
    `> linguagens: ${c.languages.join(", ")} · tempo: ${c.timeLimitMs} ms · memória: ${c.memoryLimitMb} MB`,
    `> ${c.publicTests.length} teste(s) público(s), ${c.hiddenTests} oculto(s) · ${c.hintsTotal} dica(s) · ${cfg.url}/desafio/${c.slug}`,
    "",
    c.statement,
    "",
  ].join("\n");
  writeFileSync(path.join(dir, "README.md"), header);

  const main = path.join(dir, file);
  const draft = c.drafts?.[language];
  if (existsSync(main) && !flags.fresh) {
    console.log(dim(`${file} já existe; mantido (use --fresh para recomeçar do template)`));
  } else {
    writeFileSync(main, draft && !flags.fresh ? draft : c.templates[language] ?? "");
    if (draft && !flags.fresh) console.log(dim(`${file}: rascunho da sua conta`));
  }
  for (const f of existsSync(path.join(dir, "tests")) ? readdirSync(path.join(dir, "tests")) : []) rmSync(path.join(dir, "tests", f));
  for (const t of c.publicTests) {
    writeFileSync(path.join(dir, "tests", `${t.name}.in`), t.input);
    writeFileSync(path.join(dir, "tests", `${t.name}.out`), t.expected);
  }
  writeFileSync(
    path.join(dir, WORKSPACE),
    JSON.stringify({ slug: c.slug, title: c.title, language, file, kind: c.kind, timeLimitMs: c.timeLimitMs, url: cfg.url, hintsRevealed: c.hintsRevealed }, null, 2) + "\n",
  );
  if (!existsSync(path.join(dir, ".gitignore"))) writeFileSync(path.join(dir, ".gitignore"), ".korin-build/\n");

  const rel = path.relative(process.cwd(), dir) || ".";
  console.log(`${green("✔")} ${bold(c.title)} ${stars(c.difficulty)}${c.isDaily ? yellow(" ☀ desafio do dia") : ""}${c.state === "solved" ? green(" CLEAR") : ""}`);
  console.log(`  pasta: ${rel}/   código: ${file} (${language})   testes públicos: ${c.publicTests.length}`);
  if (c.kind !== "stdio") console.log(yellow(`  este desafio é "${c.kind}": roda no navegador. Edite aqui e cole no site (korin open).`));
  else console.log(dim(`  cd ${rel} && $EDITOR ${file} && korin test`));
};

commands.show = async ({ pos }) => {
  const w = findWorkspace();
  const slug = pos[0] ?? w?.ws.slug ?? fail("uso: korin show <slug> (ou dentro de uma pasta de desafio)");
  if (!pos[0] && w && existsSync(path.join(w.dir, "README.md"))) return process.stdout.write(readFileSync(path.join(w.dir, "README.md"), "utf8"));
  const c = await api(loadConfig(), "GET", `/api/cli/challenges/${encodeURIComponent(slug)}`);
  console.log(`# ${c.title}\n\n${c.statement}\n`);
};

function stdioOnly(w) {
  if (w.ws.kind && w.ws.kind !== "stdio") fail(`desafio "${w.ws.kind}" roda no navegador: korin open`);
}

async function runOnServer(w, mode, source, stdin) {
  const cfg = loadConfig();
  return api(cfg, "POST", "/api/run", { slug: w.ws.slug, language: w.ws.language, source, mode, stdin });
}

commands.run = async ({ flags, pos }) => {
  const w = requireWorkspace();
  stdioOnly(w);
  const { source } = readSource(w, pos[0]);
  let stdin = flags.input ? readFileSync(flags.input, "utf8") : await readStdinIfPiped();
  if (stdin === null) {
    const first = listLocalTests(w.dir)[0];
    stdin = first?.input ?? "";
    if (first) console.log(dim(`stdin: tests/${first.name}.in (use -i arquivo ou um pipe para trocar)`));
  }
  const r = await runOnServer(w, "run", source, stdin);
  for (const wn of r.warnings ?? []) console.log(yellow("! " + wn));
  if (!printCompile(r.compile)) process.exitCode = 1;
  if (!r.run) return;
  process.stdout.write(r.run.stdout);
  if (r.run.stdout && !r.run.stdout.endsWith("\n")) process.stdout.write("\n");
  if (r.run.stderr?.trim()) console.error(dim(r.run.stderr.trim()));
  // No modo run não há saída esperada, então "WA" não significa nada; só TLE/RE/OLE importam.
  const broke = ["TLE", "RE", "OLE"].includes(r.run.verdict);
  const status = broke ? red(r.run.message || r.run.verdict) : green("ok");
  console.log(dim(`— ${status} · ${r.run.timeMs ?? "?"} ms · exit ${r.run.exitCode ?? "?"}`));
};

commands.test = async ({ flags, pos }) => {
  const w = requireWorkspace();
  stdioOnly(w);
  const { file, source } = readSource(w, pos[0]);
  if (flags.local) return testLocal(w, file);
  const r = await runOnServer(w, "test", source);
  for (const wn of r.warnings ?? []) console.log(yellow("! " + wn));
  if (!printCompile(r.compile)) return void (process.exitCode = 1);
  printTests(r.tests);
  summarize(r.tests, r.allPassed);
  if (!r.allPassed) process.exitCode = 1;
  else console.log(dim("agora: korin submit"));
};

commands.submit = async ({ pos }) => {
  const w = requireWorkspace();
  stdioOnly(w);
  const cfg = loadConfig();
  if (!cfg.token) console.log(yellow("! sem login: o resultado não é salvo nem pontua (korin login)"));
  const { source } = readSource(w, pos[0]);
  const r = await runOnServer(w, "submit", source);
  for (const wn of r.warnings ?? []) console.log(yellow("! " + wn));
  if (!printCompile(r.compile)) return void (process.exitCode = 1);
  printTests(r.tests);
  summarize(r.tests, r.allPassed);
  if (!r.allPassed) return void (process.exitCode = 1);
  if (r.awarded === undefined) return;
  console.log(r.awarded > 0 ? green(bold(`CLEAR! +${r.awarded} pontos`)) : dim("já estava resolvido (ou você desistiu antes): sem pontos novos"));
};

commands.push = async ({ pos }) => {
  const w = requireWorkspace();
  const { source } = readSource(w, pos[0]);
  const cfg = loadConfig();
  if (!cfg.token) fail("rascunhos ficam na conta: korin login");
  await api(cfg, "PUT", `/api/challenges/${encodeURIComponent(w.ws.slug)}/draft`, { language: w.ws.language, code: source });
  console.log(green("✔ rascunho salvo na sua conta"));
};

commands.hint = async () => {
  const w = requireWorkspace();
  const cfg = loadConfig();
  const c = await api(cfg, "GET", `/api/cli/challenges/${encodeURIComponent(w.ws.slug)}`);
  const n = cfg.token ? c.hintsRevealed : w.ws.hintsRevealed ?? 0;
  if (n >= c.hintsTotal) return console.log(dim(c.hintsTotal ? "você já viu todas as dicas." : "este desafio não tem dicas."));
  const h = await api(cfg, "POST", `/api/challenges/${encodeURIComponent(w.ws.slug)}/hints/${n}?format=md`);
  console.log(`${yellow(`dica ${h.index + 1}/${h.total}`)}: ${h.markdown}`);
  w.ws.hintsRevealed = n + 1;
  writeFileSync(path.join(w.dir, WORKSPACE), JSON.stringify(w.ws, null, 2) + "\n");
  if (cfg.token && c.state !== "solved") console.log(dim("(cada dica antes de resolver desconta 20% dos pontos)"));
};

commands.solution = async ({ flags }) => {
  const w = requireWorkspace();
  const cfg = loadConfig();
  const r = await api(cfg, "GET", `/api/challenges/${encodeURIComponent(w.ws.slug)}/solution`);
  const langs = Object.keys(r.solutions);
  if (!langs.length) return console.log(dim("este desafio não tem solução de referência."));
  const pick = flags.language && r.solutions[flags.language] ? [flags.language] : r.solutions[w.ws.language] ? [w.ws.language] : langs;
  for (const l of pick) {
    if (pick.length > 1 || flags.all) console.log(cyan(`// ---- ${l}`));
    console.log(r.solutions[l]);
  }
  if (langs.length > pick.length) console.log(dim(`(também em: ${langs.filter((l) => !pick.includes(l)).join(", ")} — use -l)`));
};

commands.giveup = async ({ flags }) => {
  const w = requireWorkspace();
  if (!flags.yes) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const a = (await rl.question(`desistir de ${bold(w.ws.slug)}? A solução é liberada e o desafio deixa de valer pontos. [s/N] `)).trim().toLowerCase();
    rl.close();
    if (a !== "s" && a !== "sim") return console.log("ok, continue tentando.");
  }
  await api(loadConfig(), "POST", `/api/challenges/${encodeURIComponent(w.ws.slug)}/giveup`);
  console.log(yellow("desistiu. korin solution mostra a resposta."));
};

commands.open = async ({ pos }) => {
  const w = findWorkspace();
  const slug = pos[0] ?? w?.ws.slug ?? fail("uso: korin open <slug>");
  const url = `${loadConfig().url}/desafio/${slug}`;
  console.log(url);
  const cmd = platform() === "darwin" ? ["open", url] : platform() === "win32" ? ["cmd", "/c", "start", "", url] : ["xdg-open", url];
  try {
    spawn(cmd[0], cmd.slice(1), { detached: true, stdio: "ignore" }).on("error", () => {}).unref();
  } catch {}
};

commands.update = async () => {
  const cfg = loadConfig();
  const res = await fetch(`${cfg.url}/cli/korin.mjs`).catch((e) => fail(`download falhou: ${e.message}`));
  if (!res.ok) fail(`download falhou: ${res.status}`);
  const src = await res.text();
  if (!src.startsWith("#!/usr/bin/env node")) fail("o arquivo baixado não parece a CLI");
  const remote = /const VERSION = "([^"]+)"/.exec(src)?.[1] ?? "?";
  const self = fileURLToPath(import.meta.url);
  writeFileSync(self, src);
  console.log(green(`✔ ${self} atualizado: ${VERSION} → ${remote}`));
};

// ---- testes locais (--local): compila com o que há na sua máquina ----------------------
const EXE = platform() === "win32" ? "main.exe" : "main";
const LOCAL_BUILD = {
  c: (f) => [["gcc", "-std=c17", "-O2", "-Wall", "-o", EXE, f, "-lm"]],
  cpp: (f) => [["g++", "-std=c++20", "-O2", "-Wall", "-o", EXE, f]],
  rust: (f) => [["rustc", "--edition", "2021", "-O", "-o", EXE, f]],
};

function normalize(s) {
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

function testLocal(w, file) {
  const build = LOCAL_BUILD[w.ws.language] ?? fail(`--local não sabe compilar ${w.ws.language}; use o servidor`);
  const out = path.join(w.dir, ".korin-build");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const cmd of build(path.relative(out, file))) {
    const r = spawnSync(cmd[0], cmd.slice(1), { cwd: out, encoding: "utf8" });
    if (r.error) fail(`não achei '${cmd[0]}' no PATH: ${r.error.message}`);
    if (r.status !== 0) {
      console.log(red(bold("✘ erro de compilação")));
      console.log((r.stdout + r.stderr).trim());
      return void (process.exitCode = 1);
    }
    if (r.stderr.trim()) console.log(dim(r.stderr.trim()));
  }
  const tests = listLocalTests(w.dir);
  if (!tests.length) fail("sem testes em tests/ (rode korin pick de novo)");
  const limit = w.ws.timeLimitMs ?? 2000;
  const results = tests.map((t) => {
    const t0 = performance.now();
    const r = spawnSync(path.join(out, EXE), [], { input: t.input, encoding: "utf8", timeout: limit * 3, maxBuffer: 1 << 20 });
    const timeMs = Math.round(performance.now() - t0);
    let verdict = "AC";
    let message;
    if (r.error?.code === "ETIMEDOUT" || r.signal === "SIGTERM") (verdict = "TLE"), (message = `passou de ${limit} ms`);
    else if (r.error?.code === "ENOBUFS") (verdict = "OLE"), (message = "saída grande demais");
    else if (r.status !== 0) (verdict = "RE"), (message = r.signal ? `morto por ${r.signal}` : `exit code ${r.status}`);
    else if (normalize(r.stdout ?? "") !== normalize(t.expected)) verdict = "WA";
    else if (timeMs > limit) (verdict = "TLE"), (message = `${timeMs} ms > ${limit} ms (sua máquina; o servidor pode diferir)`);
    return { ...t, hidden: false, verdict, message, timeMs, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
  });
  printTests(results);
  const all = results.every((r) => r.verdict === "AC");
  summarize(results, all);
  console.log(dim(all ? "só os públicos, aqui na sua máquina. korin submit roda os ocultos no servidor." : ""));
  if (!all) process.exitCode = 1;
}

// ---- main ------------------------------------------------------------------------------
async function main() {
  const { flags, pos } = parseArgs(process.argv.slice(2));
  let cmd = pos.shift() ?? "help";
  if (flags.help) cmd = "help";
  if (flags.version) cmd = "version";
  const run = commands[cmd] ?? fail(`comando desconhecido: ${cmd} (korin help)`);
  await run({ flags, pos });
}

main().catch((e) => {
  if (e instanceof CliError) console.error(red("✘ ") + e.message);
  else console.error(red("✘ erro inesperado: ") + (e?.stack || e));
  process.exit(process.exitCode || 1);
});
