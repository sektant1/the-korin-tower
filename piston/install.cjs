// Instala os runtimes do site dentro da imagem do Piston, durante o build.
// Sobe a API só o tempo necessário: nada é executado (sem cgroups/isolate), só
// baixa e extrai os pacotes em /piston/packages. Assim a VPS já nasce com os
// compiladores, sem depender de download no primeiro boot.
//
//   PISTON_PACKAGES="gcc,rust,go,zig,nasm,pascal" node install.cjs
const { spawn } = require("child_process");
const http = require("http");

const PORT = 2000;
const WANTED = (process.env.PISTON_PACKAGES || "gcc,rust,go,zig,nasm,pascal")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = http.request(
      {
        host: "127.0.0.1",
        port: PORT,
        path,
        method,
        headers: data
          ? { "content-type": "application/json", "content-length": data.length }
          : {},
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            /* resposta sem JSON */
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`${method} ${path} -> ${res.statusCode} ${text}`));
          } else {
            resolve(json);
          }
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function waitForApi() {
  for (let i = 0; i < 60; i++) {
    try {
      await request("GET", "/api/v2/runtimes");
      return;
    } catch {
      /* ainda subindo */
    }
    await sleep(1000);
  }
  throw new Error("a API do Piston não respondeu em 127.0.0.1:" + PORT);
}

(async () => {
  const server = spawn(process.execPath, ["/piston_api/src"], {
    stdio: "inherit",
    env: process.env,
  });
  // Resolve também no `error` (falha ao iniciar), senão o build ficaria pendurado.
  const exited = new Promise((resolve) => {
    server.once("exit", resolve);
    server.once("error", resolve);
  });
  const stop = () => {
    try {
      server.kill("SIGTERM");
    } catch {
      /* já morreu */
    }
  };
  process.on("exit", stop);

  try {
    await waitForApi();
    const packages = await request("GET", "/api/v2/packages");

    for (const language of WANTED) {
      const versions = packages.filter((p) => p.language === language);
      if (!versions.length) {
        console.warn(`⚠ pacote '${language}' não existe no repositório do Piston`);
        continue;
      }
      if (versions.some((p) => p.installed)) {
        console.log(`✔ ${language} já instalado`);
        continue;
      }
      console.log(`⬇ instalando ${language}...`);
      const r = await request("POST", "/api/v2/packages", { language, version: "*" });
      console.log(`✔ ${language} ${r && r.version ? r.version : ""}`.trim());
    }
  } finally {
    stop();
    await exited;
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
