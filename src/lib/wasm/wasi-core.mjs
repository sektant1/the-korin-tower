// Executor mínimo de WASI preview1 para os programas dos desafios stdio.
//
// O clang do Emception compila o código do jogador no navegador para um .wasm
// WASI "puro" (só importa `wasi_snapshot_preview1`). Este arquivo roda esse
// binário com stdin em memória, captura stdout/stderr e devolve exit code e
// tempo. É JavaScript puro, sem DOM nem Node, porque o MESMO código roda em
// dois lugares:
//
//   - num Web Worker, para :run e :test (testes públicos) no navegador;
//   - num worker_thread do Node, para :submit: o navegador manda o .wasm e o
//     servidor roda os testes ocultos, que nunca saem dele.
//
// Limites: o tempo é imposto por quem chama (mata o worker); a memória vem do
// máximo declarado no próprio .wasm (`wasm-ld --max-memory`, conferido no
// servidor por `inspectWasm`); a saída é cortada em `maxOutputBytes`.

const ERRNO = { SUCCESS: 0, EBADF: 8, EINVAL: 28, ENOENT: 44, ENOSYS: 52, ESPIPE: 70 };
const FILETYPE_CHARACTER_DEVICE = 2;
const FILETYPE_REGULAR_FILE = 4;
const RIGHTS_FD_READ = 0x2n;
const RIGHTS_FD_WRITE = 0x40n;

/**
 * Funções que a libc do Emscripten espera do JS (fuso horário, localtime,
 * relógio). O binário é linkado com --allow-undefined e elas viram imports de
 * `env`; implementamos só esta lista (em UTC) e qualquer outro import é
 * recusado (no navegador vira "undefined symbol" na hora de linkar).
 */
export const ENV_IMPORTS = [
  "_tzset_js",
  "_localtime_js",
  "_gmtime_js",
  "_mktime_js",
  "_timegm_js",
  "emscripten_date_now",
  "_emscripten_get_now",
  "emscripten_get_now",
  "emscripten_get_now_res",
  "_emscripten_get_now_is_monotonic",
  "emscripten_notify_memory_growth",
  "_abort_js",
  "emscripten_err",
  "emscripten_out",
];

class WasiExit {
  /** @param {number} code */
  constructor(code) {
    this.code = code;
  }
}
class OutputLimit extends Error {}

const encoder = new TextEncoder();

/** @param {Uint8Array[]} chunks */
function joinChunks(chunks) {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return new TextDecoder().decode(out);
}

/** Traduz um trap do WebAssembly para algo parecido com o sinal que o Linux daria. */
function describeTrap(e) {
  const msg = e instanceof Error ? e.message : String(e);
  if (e instanceof RangeError && /call stack/i.test(msg)) return "stack overflow (recursão profunda demais)";
  if (/out of bounds/i.test(msg)) return "SIGSEGV (acesso fora da memória)";
  if (/unreachable/i.test(msg)) return "SIGABRT (abort ou unreachable)";
  if (/divide by zero|remainder by zero/i.test(msg)) return "SIGFPE (divisão por zero)";
  if (/integer overflow|invalid conversion/i.test(msg)) return "SIGFPE (overflow)";
  if (/indirect call|signature mismatch|null function/i.test(msg)) return "SIGILL (chamada indireta inválida)";
  return `trap (${msg})`;
}

/**
 * Roda um binário WASI com stdin em memória.
 * @param {import("./wasi-core.mjs").WasiRunRequest} req
 * @returns {Promise<import("./wasi-core.mjs").WasiRunResult>}
 */
export async function runWasi(req) {
  const stdin = typeof req.stdin === "string" ? encoder.encode(req.stdin) : (req.stdin ?? new Uint8Array(0));
  const maxOutput = req.maxOutputBytes ?? 2 * 1024 * 1024;
  const argv = (req.args ?? ["main"]).map((a) => encoder.encode(a + "\0"));
  const argvBytes = argv.reduce((n, a) => n + a.length, 0);

  /** @type {WebAssembly.Memory | undefined} */
  let memory;
  /** @type {Uint8Array[]} */
  const outChunks = [];
  /** @type {Uint8Array[]} */
  const errChunks = [];
  let outBytes = 0;
  let inPos = 0;
  const view = () => new DataView(memory.buffer);
  const bytes = () => new Uint8Array(memory.buffer);

  const wasi = {
    args_sizes_get(countPtr, sizePtr) {
      view().setUint32(countPtr, argv.length, true);
      view().setUint32(sizePtr, argvBytes, true);
      return ERRNO.SUCCESS;
    },
    args_get(argvPtr, bufPtr) {
      const v = view();
      const b = bytes();
      let at = bufPtr;
      argv.forEach((a, i) => {
        v.setUint32(argvPtr + i * 4, at, true);
        b.set(a, at);
        at += a.length;
      });
      return ERRNO.SUCCESS;
    },
    environ_sizes_get(countPtr, sizePtr) {
      view().setUint32(countPtr, 0, true);
      view().setUint32(sizePtr, 0, true);
      return ERRNO.SUCCESS;
    },
    environ_get() {
      return ERRNO.SUCCESS;
    },
    clock_res_get(_id, resPtr) {
      view().setBigUint64(resPtr, 1000n, true);
      return ERRNO.SUCCESS;
    },
    clock_time_get(id, _precision, timePtr) {
      // 0 = realtime, demais = monotônico. Nanossegundos.
      const ns = id === 0 ? BigInt(Date.now()) * 1000000n : BigInt(Math.round(performance.now() * 1e6));
      view().setBigUint64(timePtr, ns, true);
      return ERRNO.SUCCESS;
    },
    fd_write(fd, iovsPtr, iovsLen, nwrittenPtr) {
      if (fd !== 1 && fd !== 2) return ERRNO.EBADF;
      const v = view();
      const b = bytes();
      let total = 0;
      for (let i = 0; i < iovsLen; i++) {
        const ptr = v.getUint32(iovsPtr + i * 8, true);
        const len = v.getUint32(iovsPtr + i * 8 + 4, true);
        if (len === 0) continue;
        // Cópia: a view morre quando a memória cresce.
        const chunk = b.slice(ptr, ptr + len);
        total += len;
        if (fd === 1) {
          outBytes += len;
          if (outBytes > maxOutput) {
            outChunks.push(chunk.subarray(0, Math.max(0, len - (outBytes - maxOutput))));
            throw new OutputLimit();
          }
          outChunks.push(chunk);
        } else if (errChunks.reduce((n, c) => n + c.length, 0) < 64 * 1024) {
          errChunks.push(chunk);
        }
      }
      v.setUint32(nwrittenPtr, total, true);
      return ERRNO.SUCCESS;
    },
    fd_read(fd, iovsPtr, iovsLen, nreadPtr) {
      if (fd !== 0) return ERRNO.EBADF;
      const v = view();
      const b = bytes();
      let total = 0;
      for (let i = 0; i < iovsLen && inPos < stdin.length; i++) {
        const ptr = v.getUint32(iovsPtr + i * 8, true);
        const len = v.getUint32(iovsPtr + i * 8 + 4, true);
        const n = Math.min(len, stdin.length - inPos);
        b.set(stdin.subarray(inPos, inPos + n), ptr);
        inPos += n;
        total += n;
      }
      v.setUint32(nreadPtr, total, true);
      return ERRNO.SUCCESS;
    },
    fd_close() {
      return ERRNO.SUCCESS;
    },
    fd_seek(fd) {
      return fd <= 2 ? ERRNO.ESPIPE : ERRNO.EBADF;
    },
    fd_tell() {
      return ERRNO.ESPIPE;
    },
    fd_fdstat_get(fd, statPtr) {
      if (fd > 2) return ERRNO.EBADF;
      const v = view();
      v.setUint8(statPtr, fd === 0 ? FILETYPE_CHARACTER_DEVICE : FILETYPE_REGULAR_FILE);
      v.setUint16(statPtr + 2, 0, true);
      v.setBigUint64(statPtr + 8, fd === 0 ? RIGHTS_FD_READ : RIGHTS_FD_WRITE, true);
      v.setBigUint64(statPtr + 16, 0n, true);
      return ERRNO.SUCCESS;
    },
    fd_fdstat_set_flags() {
      return ERRNO.SUCCESS;
    },
    fd_filestat_get(fd, statPtr) {
      if (fd > 2) return ERRNO.EBADF;
      new Uint8Array(memory.buffer, statPtr, 64).fill(0);
      view().setUint8(statPtr + 16, fd === 0 ? FILETYPE_CHARACTER_DEVICE : FILETYPE_REGULAR_FILE);
      return ERRNO.SUCCESS;
    },
    fd_prestat_get() {
      return ERRNO.EBADF; // sem diretórios pré-abertos: o programa não vê arquivos
    },
    fd_prestat_dir_name() {
      return ERRNO.EBADF;
    },
    fd_sync() {
      return ERRNO.SUCCESS;
    },
    fd_datasync() {
      return ERRNO.SUCCESS;
    },
    poll_oneoff(_inPtr, _outPtr, _n, neventsPtr) {
      // sleep()/nanosleep: não dormimos de verdade num juiz. Sem eventos, EINTR seria mais fiel,
      // mas a libc do Emscripten trata ENOSYS como "não deu, segue".
      view().setUint32(neventsPtr, 0, true);
      return ERRNO.ENOSYS;
    },
    proc_exit(code) {
      throw new WasiExit(code);
    },
    proc_raise() {
      return ERRNO.ENOSYS;
    },
    random_get(ptr, len) {
      crypto.getRandomValues(new Uint8Array(memory.buffer, ptr, len));
      return ERRNO.SUCCESS;
    },
    sched_yield() {
      return ERRNO.SUCCESS;
    },
  };

  /** struct tm (wasm32): 9 ints, tm_gmtoff (long) e tm_zone (ponteiro). */
  const writeTm = (ptr, ms) => {
    const d = new Date(ms);
    const v = view();
    const start = Date.UTC(d.getUTCFullYear(), 0, 1);
    const fields = [d.getUTCSeconds(), d.getUTCMinutes(), d.getUTCHours(), d.getUTCDate(), d.getUTCMonth(), d.getUTCFullYear() - 1900, d.getUTCDay(), Math.floor((ms - start) / 86400000), 0, 0];
    fields.forEach((f, i) => v.setInt32(ptr + i * 4, f, true));
    v.setInt32(ptr + 40, 0, true);
  };
  const readTmUtc = (ptr) => {
    const v = view();
    const i = (n) => v.getInt32(ptr + n * 4, true);
    const ms = Date.UTC(i(5) + 1900, i(4), i(3), i(2), i(1), i(0));
    writeTm(ptr, ms); // normaliza como o mktime faz
    return BigInt(Math.floor(ms / 1000));
  };
  const writeStr = (ptr, s) => {
    const b = encoder.encode(s + "\0");
    bytes().set(b, ptr);
  };
  const env = {
    _tzset_js(timezonePtr, daylightPtr, stdNamePtr, dstNamePtr) {
      view().setInt32(timezonePtr, 0, true);
      view().setInt32(daylightPtr, 0, true);
      writeStr(stdNamePtr, "UTC");
      writeStr(dstNamePtr, "UTC");
    },
    _localtime_js(t, tmPtr) {
      writeTm(tmPtr, Number(t) * 1000);
    },
    _gmtime_js(t, tmPtr) {
      writeTm(tmPtr, Number(t) * 1000);
    },
    _mktime_js: readTmUtc,
    _timegm_js: readTmUtc,
    emscripten_date_now: () => Date.now(),
    _emscripten_get_now: () => performance.now(),
    emscripten_get_now: () => performance.now(),
    emscripten_get_now_res: () => 1000,
    _emscripten_get_now_is_monotonic: () => 1,
    emscripten_notify_memory_growth() {},
    _abort_js() {
      throw new WebAssembly.RuntimeError("unreachable (abort)");
    },
    emscripten_err() {},
    emscripten_out() {},
  };

  let exitCode = null;
  let signal = null;
  let outputTruncated = false;
  const t0 = performance.now();
  let timeMs = 0;
  try {
    // Módulo já compilado (quem roda vários testes compila uma vez e reaproveita) ou bytes crus.
    const mod = req.wasm instanceof WebAssembly.Module ? req.wasm : await WebAssembly.compile(req.wasm);
    /** @type {Record<string, Record<string, unknown>>} */
    const importObject = {};
    for (const imp of WebAssembly.Module.imports(mod)) {
      importObject[imp.module] ??= {};
      if (imp.module === "wasi_snapshot_preview1" && imp.kind === "function") {
        const fn = wasi[imp.name];
        importObject[imp.module][imp.name] = fn ?? (() => ERRNO.ENOSYS);
      } else if (imp.module === "env" && imp.kind === "function" && Object.hasOwn(env, imp.name)) {
        importObject.env[imp.name] = env[imp.name];
      } else if (imp.kind === "memory") {
        // Normalmente o binário exporta a própria memória; se importar, damos uma com teto.
        memory = new WebAssembly.Memory({ initial: 256, maximum: req.memoryLimitPages ?? 4096 });
        importObject[imp.module][imp.name] = memory;
      } else {
        throw new Error(`import não suportado: ${imp.module}.${imp.name}`);
      }
    }
    const instance = await WebAssembly.instantiate(mod, importObject);
    const exported = instance.exports;
    if (!memory) {
      if (!(exported.memory instanceof WebAssembly.Memory)) throw new Error("o binário não exporta memória");
      memory = exported.memory;
    }
    const start = performance.now();
    try {
      if (typeof exported._start === "function") {
        exported._start();
        exitCode = 0;
      } else if (typeof exported.main === "function") {
        if (typeof exported.__wasm_call_ctors === "function") exported.__wasm_call_ctors();
        exitCode = Number(exported.main(0, 0)) | 0;
      } else {
        throw new Error("o binário não tem _start nem main");
      }
    } catch (e) {
      if (e instanceof WasiExit) exitCode = e.code;
      else if (e instanceof OutputLimit) outputTruncated = true;
      else if (e instanceof WebAssembly.RuntimeError || e instanceof RangeError) signal = describeTrap(e);
      else throw e;
    }
    // Saída normal (return do main ou exit): esvazia os buffers do stdio, como o exit() nativo.
    // Num crash o buffer se perde, igual ao Linux.
    if (exitCode !== null && typeof exported.fflush === "function") {
      try {
        exported.fflush(0);
      } catch (e) {
        if (e instanceof OutputLimit) outputTruncated = true;
        else if (!(e instanceof WasiExit)) {
          signal = describeTrap(e);
          exitCode = null;
        }
      }
    }
    timeMs = Math.round(performance.now() - start);
  } catch (e) {
    // Falha do executor (binário inválido, import desconhecido): vira "erro de execução" com a causa.
    return {
      exitCode: null,
      signal: `executor: ${e instanceof Error ? e.message : String(e)}`,
      stdout: joinChunks(outChunks),
      stderr: joinChunks(errChunks),
      timeMs: Math.round(performance.now() - t0),
      memoryBytes: memory ? memory.buffer.byteLength : 0,
      outputTruncated,
    };
  }
  return {
    exitCode,
    signal,
    stdout: joinChunks(outChunks),
    stderr: joinChunks(errChunks),
    timeMs,
    memoryBytes: memory ? memory.buffer.byteLength : 0,
    outputTruncated,
  };
}

// ---- inspeção do binário (o servidor não confia no que o navegador mandou) ----

class ByteReader {
  /** @param {Uint8Array} b */
  constructor(b) {
    this.b = b;
    this.at = 0;
  }
  u8() {
    if (this.at >= this.b.length) throw new Error("binário truncado");
    return this.b[this.at++];
  }
  leb() {
    let result = 0;
    let shift = 0;
    for (;;) {
      const byte = this.u8();
      result += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) return result;
      shift += 7;
      if (shift > 63) throw new Error("LEB128 inválido");
    }
  }
  bytes(n) {
    if (this.at + n > this.b.length) throw new Error("binário truncado");
    const out = this.b.subarray(this.at, this.at + n);
    this.at += n;
    return out;
  }
  limits() {
    const flags = this.u8();
    const min = this.leb();
    const max = flags & 1 ? this.leb() : null;
    return { min, max, shared: (flags & 2) !== 0, is64: (flags & 4) !== 0 };
  }
}

/**
 * Lê as seções de import e de memória do .wasm (sem instanciar nada).
 * @param {Uint8Array} wasm
 * @returns {import("./wasi-core.mjs").WasmInfo}
 */
export function inspectWasm(wasm) {
  const r = new ByteReader(wasm);
  const magic = r.bytes(4);
  if (magic[0] !== 0 || magic[1] !== 0x61 || magic[2] !== 0x73 || magic[3] !== 0x6d) throw new Error("não é um módulo WebAssembly");
  r.bytes(4); // versão
  /** @type {import("./wasi-core.mjs").WasmInfo} */
  const info = { imports: [], memories: [] };
  const decoder = new TextDecoder();
  while (r.at < wasm.length) {
    const id = r.u8();
    const size = r.leb();
    const end = r.at + size;
    if (end > wasm.length) throw new Error("seção passa do fim do binário");
    if (id === 2) {
      const count = r.leb();
      for (let i = 0; i < count; i++) {
        const module = decoder.decode(r.bytes(r.leb()));
        const name = decoder.decode(r.bytes(r.leb()));
        const kind = r.u8();
        if (kind === 0) {
          r.leb();
          info.imports.push({ module, name, kind: "function" });
        } else if (kind === 1) {
          r.u8();
          r.limits();
          info.imports.push({ module, name, kind: "table" });
        } else if (kind === 2) {
          const lim = r.limits();
          info.imports.push({ module, name, kind: "memory" });
          info.memories.push({ ...lim, imported: true });
        } else if (kind === 3) {
          r.u8();
          r.u8();
          info.imports.push({ module, name, kind: "global" });
        } else if (kind === 4) {
          r.u8();
          r.leb();
          info.imports.push({ module, name, kind: "tag" });
        } else throw new Error(`import de tipo desconhecido (${kind})`);
      }
    } else if (id === 5) {
      const count = r.leb();
      for (let i = 0; i < count; i++) info.memories.push({ ...r.limits(), imported: false });
    }
    r.at = end;
  }
  return info;
}

export const WASM_PAGE = 65536;

/**
 * O binário serve para o juiz? Só imports WASI, uma memória própria com teto
 * dentro do limite do desafio.
 * @param {Uint8Array} wasm
 * @param {number} memoryLimitMb
 * @returns {string | null} motivo da recusa, ou null se está ok
 */
export function wasmProblem(wasm, memoryLimitMb) {
  let info;
  try {
    info = inspectWasm(wasm);
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  const foreign = info.imports.find(
    (i) => i.kind !== "function" || !(i.module === "wasi_snapshot_preview1" || (i.module === "env" && ENV_IMPORTS.includes(i.name))),
  );
  if (foreign) return `import fora do WASI: ${foreign.module}.${foreign.name}`;
  if (info.memories.length !== 1) return info.memories.length ? "mais de uma memória" : "sem memória";
  const m = info.memories[0];
  if (m.imported || m.shared || m.is64) return "memória importada, compartilhada ou de 64 bits";
  if (m.max === null) return "memória sem limite máximo (linke com --max-memory)";
  if (m.max * WASM_PAGE > Math.max(memoryLimitMb, 16) * 1024 * 1024) return `limite de memória do binário (${Math.round((m.max * WASM_PAGE) / 1048576)} MB) acima do desafio (${memoryLimitMb} MB)`;
  return null;
}
