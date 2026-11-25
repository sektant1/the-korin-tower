// Worker dedicado do Python (module worker). Fica em public/ e não passa pelo
// bundler de propósito: o Pyodide 314 só roda em module worker, e o loader de
// workers do Turbopack sobe workers clássicos. Protocolo das mensagens em
// src/lib/runner/engines/pyodide-protocol.ts; quem manda é engines/pyodide.ts
// (se um teste passar do limite, a página mata este Worker com terminate()).
//
// Sobe o Pyodide uma vez e roda os testes em sequência, cada um com globals
// novos e stdin/stdout em memória.

const PRELUDE = String.raw`
import sys, io, time, traceback, linecache

class _KorinOutputLimit(Exception):
    pass

class _KorinLimitedBytes(io.BytesIO):
    def __init__(self, limit):
        super().__init__()
        self._limit = limit
    def write(self, b):
        if self.tell() + len(b) > self._limit:
            raise _KorinOutputLimit()
        return super().write(b)

_korin_code = None

def _korin_compile(src):
    global _korin_code
    _korin_code = None
    # O traceback mostra a linha do código que falhou (o exec não preenche o linecache).
    linecache.cache["main.py"] = (len(src), None, src.splitlines(True), "main.py")
    try:
        _korin_code = compile(src, "main.py", "exec")
        return ""
    except SyntaxError:
        return "".join(traceback.format_exception_only(*sys.exc_info()[:2]))

def _korin_run(data, limit):
    out = _KorinLimitedBytes(limit)
    err = io.StringIO()
    stdin = io.TextIOWrapper(io.BytesIO(data.encode("utf-8")), encoding="utf-8")
    stdout = io.TextIOWrapper(out, encoding="utf-8", write_through=True)
    sys.stdin, sys.stdout, sys.stderr = stdin, stdout, err
    code, truncated = 0, False
    t0 = time.perf_counter()
    try:
        exec(_korin_code, {"__name__": "__main__", "__builtins__": __builtins__})
    except SystemExit as e:
        if e.code is None:
            code = 0
        elif isinstance(e.code, int):
            code = e.code
        else:
            print(e.code, file=err)
            code = 1
    except _KorinOutputLimit:
        truncated = True
    except BaseException as e:
        # Sem o frame do _korin_run: o traceback começa no main.py do jogador.
        traceback.print_exception(type(e), e, e.__traceback__.tb_next, file=err)
        code = 1
    ms = (time.perf_counter() - t0) * 1000
    try:
        stdout.flush()
    except _KorinOutputLimit:
        truncated = True
    except BaseException:
        pass
    sys.stdin, sys.stdout, sys.stderr = sys.__stdin__, sys.__stdout__, sys.__stderr__
    # detach(): sem isso, o TextIOWrapper coletado fecha o BytesIO junto.
    for w in (stdin, stdout):
        try:
            w.detach()
        except BaseException:
            pass
    return [out.getvalue().decode("utf-8", "replace"), err.getvalue(), code, ms, truncated]
`;

let py = null;
const post = (m) => self.postMessage(m);
const stage = (text) => post({ type: "stage", text });

async function boot(indexURL) {
  const t0 = performance.now();
  stage("baixando o Python");
  const { loadPyodide } = await import(`${indexURL}pyodide.mjs`);
  stage("iniciando o interpretador");
  py = await loadPyodide({ indexURL, stdout: () => {}, stderr: () => {} });
  stage("preparando o ambiente");
  py.runPython(PRELUDE);
  post({ type: "booted", ms: Math.round(performance.now() - t0) });
}

function exec(req) {
  stage("compilando (checando a sintaxe)");
  const compileFn = py.globals.get("_korin_compile");
  const error = compileFn(req.source);
  compileFn.destroy();
  post({ type: "compiled", id: req.id, ok: !error, output: error });
  if (error) return post({ type: "done", id: req.id });
  const runFn = py.globals.get("_korin_run");
  try {
    req.stdins.forEach((stdin, index) => {
      if (req.stdins.length > 1) stage(`rodando o teste ${index + 1} de ${req.stdins.length}`);
      else stage("executando");
      post({ type: "start", id: req.id, index });
      const res = runFn(stdin, req.maxOutputBytes);
      const [stdout, stderr, exitCode, ms, truncated] = res.toJs();
      res.destroy();
      const timeMs = Math.round(ms);
      post({
        type: "run",
        id: req.id,
        index,
        run: { stdout, stderr, exitCode, timeMs, timedOut: timeMs > req.timeLimitMs, outputTruncated: truncated },
      });
    });
  } finally {
    runFn.destroy();
  }
  post({ type: "done", id: req.id });
}

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "boot") await boot(m.indexURL);
    else if (m.type === "exec") exec(m);
  } catch (err) {
    const error = String(err?.message ?? err);
    post(m.type === "boot" ? { type: "bootError", error } : { type: "fatal", id: m.id, error });
  }
};
