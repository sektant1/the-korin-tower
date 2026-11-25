// Lote num request só: o Compiler Explorer compila uma vez e executa uma vez.
//
// Anexamos ao código do jogador um "driver" que lê todos os testes do stdin,
// roda cada um num processo filho (com limite de tempo e de saída) e imprime,
// por teste, uma linha @@KORIN com exit code, tempo, tamanho, SHA-256 da saída
// NORMALIZADA (igual a normalizeOutput do checker) e o começo de stdout/stderr
// em hex. Isso resolve três limites do CE de uma vez: um request por teste
// (fila), o corte de stdout em 32 KB e a falta de limite de tempo por teste.
//
// C/C++: o driver é um __attribute__((constructor)) que roda antes do main. O
// filho volta do construtor e segue a vida normal até o main do jogador; o pai
// nunca volta. Tudo por syscall direta (x86-64 Linux), sem libc: o código do
// jogador pode ter funções chamadas read(), write() ou malloc() à vontade.
//
// Rust: o `fn main` do jogador vira `__korin_user_main` e o driver reexecuta o
// próprio binário (std::process::Command) com KORIN_CHILD=1 para cada teste.
import type { Language, RawRun } from "../types";

export const BATCH_MAGIC = "KORIN1";
/** Orçamento de bytes do stdout do lote (o CE corta em 32 KB). */
const STDOUT_BUDGET = 30_000;

/** Quantos bytes de stdout/stderr de cada teste voltam para o painel. */
export function prefixBytes(n: number): number {
  return Math.max(64, Math.min(4096, Math.floor((STDOUT_BUDGET / Math.max(1, n) - 160) / 4)));
}

/** stdin do lote: cabeçalho e, por teste, "<bytes>\n<conteúdo>". */
export function encodeBatch(stdins: string[], limitMs: number, maxOutputBytes: number): string {
  const enc = new TextEncoder();
  const parts = [`${BATCH_MAGIC}\n${stdins.length} ${limitMs} ${prefixBytes(stdins.length)} ${maxOutputBytes}\n`];
  for (const s of stdins) parts.push(`${enc.encode(s).length}\n`, s);
  return parts.join("");
}

const C_DRIVER = String.raw`
/* ---- korin: driver de testes em lote (não faz parte do seu código) ---- */
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wpedantic"
#pragma GCC diagnostic ignored "-Wconversion"
#pragma GCC diagnostic ignored "-Wsign-conversion"
#pragma GCC diagnostic ignored "-Wunused-function"
#pragma GCC diagnostic ignored "-Wcast-qual"
#ifdef __cplusplus
#pragma GCC diagnostic ignored "-Wold-style-cast"
#pragma GCC diagnostic ignored "-Wuseless-cast"
#endif
#pragma GCC diagnostic ignored "-Wshadow"
static long __korin_sc(long n, long a, long b, long c, long d, long e, long f) {
  long r;
  __asm__ volatile("mov %5, %%r10\n\tmov %6, %%r8\n\tmov %7, %%r9\n\tsyscall"
                   : "=a"(r) : "a"(n), "D"(a), "S"(b), "d"(c), "r"(d), "r"(e), "r"(f)
                   : "rcx", "r11", "r10", "r8", "r9", "memory");
  return r;
}
#define __KORIN_SC(n, a, b, c, d) __korin_sc((n), (long)(a), (long)(b), (long)(c), (long)(d), 0, 0)
static unsigned char *__korin_mmap(unsigned long len) {
  long p = __korin_sc(9, 0, (long)len, 3, 0x02 | 0x20 | 0x4000, -1, 0);
  return p < 0 && p > -4096 ? (unsigned char *)0 : (unsigned char *)p;
}
static void __korin_write(const char *s, unsigned long n) {
  while (n) { long w = __KORIN_SC(1, 1, s, n, 0); if (w <= 0) return; s += w; n -= (unsigned long)w; }
}
static long __korin_now_ms(void) {
  long ts[2]; __KORIN_SC(228, 1, ts, 0, 0); return ts[0] * 1000 + ts[1] / 1000000;
}
static const unsigned int __korin_k[64] = {
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2};
#define __KORIN_ROR(x, n) (((x) >> (n)) | ((x) << (32 - (n))))
static void __korin_block(unsigned int *h, const unsigned char *p) {
  unsigned int w[64], a, b, c, d, e, f, g, hh, i;
  for (i = 0; i < 16; i++) w[i] = (unsigned int)p[4*i] << 24 | (unsigned int)p[4*i+1] << 16 | (unsigned int)p[4*i+2] << 8 | p[4*i+3];
  for (i = 16; i < 64; i++) {
    unsigned int s0 = __KORIN_ROR(w[i-15], 7) ^ __KORIN_ROR(w[i-15], 18) ^ (w[i-15] >> 3);
    unsigned int s1 = __KORIN_ROR(w[i-2], 17) ^ __KORIN_ROR(w[i-2], 19) ^ (w[i-2] >> 10);
    w[i] = w[i-16] + s0 + w[i-7] + s1;
  }
  a = h[0]; b = h[1]; c = h[2]; d = h[3]; e = h[4]; f = h[5]; g = h[6]; hh = h[7];
  for (i = 0; i < 64; i++) {
    unsigned int t1 = hh + (__KORIN_ROR(e, 6) ^ __KORIN_ROR(e, 11) ^ __KORIN_ROR(e, 25)) + ((e & f) ^ (~e & g)) + __korin_k[i] + w[i];
    unsigned int t2 = (__KORIN_ROR(a, 2) ^ __KORIN_ROR(a, 13) ^ __KORIN_ROR(a, 22)) + ((a & b) ^ (a & c) ^ (b & c));
    hh = g; g = f; f = e; e = d + t1; d = c; c = b; b = a; a = t1 + t2;
  }
  h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
}
static void __korin_sha256(const unsigned char *m, unsigned long n, char *hex) {
  unsigned int h[8] = {0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19};
  unsigned char tail[128]; unsigned long i, full = n / 64 * 64, rest = n - full, tl;
  for (i = 0; i < full; i += 64) __korin_block(h, m + i);
  for (i = 0; i < 128; i++) tail[i] = 0;
  for (i = 0; i < rest; i++) tail[i] = m[full + i];
  tail[rest] = 0x80; tl = rest < 56 ? 64 : 128;
  for (i = 0; i < 8; i++) tail[tl - 1 - i] = (unsigned char)((unsigned long long)n * 8 >> (8 * i));
  __korin_block(h, tail); if (tl == 128) __korin_block(h, tail + 64);
  for (i = 0; i < 32; i++) { unsigned int v = h[i / 4] >> (24 - 8 * (i % 4)) & 0xff; hex[2*i] = "0123456789abcdef"[v >> 4]; hex[2*i+1] = "0123456789abcdef"[v & 15]; }
  hex[64] = 0;
}
/* Igual a normalizeOutput (src/lib/judge/checker.ts): CRLF/CR -> LF, sem espaço no fim das linhas nem linhas vazias no final. */
static unsigned long __korin_normalize(const unsigned char *s, unsigned long n, unsigned char *o) {
  unsigned long i, len = 0, ls = 0;
  for (i = 0; i < n; i++) {
    unsigned char c = s[i];
    if (c == '\r') { if (i + 1 < n && s[i+1] == '\n') i++; c = '\n'; }
    if (c == '\n') {
      while (len > ls && (o[len-1] == ' ' || o[len-1] == '\t' || o[len-1] == '\v' || o[len-1] == '\f')) len--;
      o[len++] = '\n'; ls = len;
    } else o[len++] = c;
  }
  while (len > ls && (o[len-1] == ' ' || o[len-1] == '\t' || o[len-1] == '\v' || o[len-1] == '\f')) len--;
  while (len && o[len-1] == '\n') len--;
  return len;
}
static unsigned long __korin_num(const unsigned char *s, unsigned long *i, unsigned long n) {
  unsigned long v = 0;
  while (*i < n && (s[*i] < '0' || s[*i] > '9')) (*i)++;
  while (*i < n && s[*i] >= '0' && s[*i] <= '9') v = v * 10 + (unsigned long)(s[(*i)++] - '0');
  return v;
}
static char *__korin_put(char *p, const char *s) { while (*s) *p++ = *s++; return p; }
static char *__korin_putn(char *p, long v) {
  char t[24]; int k = 0; unsigned long u;
  if (v < 0) { *p++ = '-'; u = (unsigned long)(-v); } else u = (unsigned long)v;
  do { t[k++] = (char)('0' + u % 10); u /= 10; } while (u);
  while (k) *p++ = t[--k];
  return p;
}
static char *__korin_hex(char *p, const unsigned char *s, unsigned long n) {
  unsigned long i;
  if (!n) { *p++ = '-'; return p; }
  for (i = 0; i < n; i++) { *p++ = "0123456789abcdef"[s[i] >> 4]; *p++ = "0123456789abcdef"[s[i] & 15]; }
  return p;
}
__attribute__((constructor(101))) static void __korin_driver(void) {
  const unsigned long CAP = 64ul << 20;
  unsigned char *in = __korin_mmap(CAP), *buf, *norm, *ebuf; char *line;
  unsigned long n = 0, i = 0, tests, limit, pre, maxout, t;
  if (!in) return;
  for (;;) { long r = __KORIN_SC(0, 0, in + n, CAP - n, 0); if (r <= 0) break; n += (unsigned long)r; }
  if (n < 7 || in[0] != 'K' || in[1] != 'O' || in[2] != 'R' || in[3] != 'I' || in[4] != 'N' || in[5] != '1') return;
  i = 6;
  tests = __korin_num(in, &i, n); limit = __korin_num(in, &i, n); pre = __korin_num(in, &i, n); maxout = __korin_num(in, &i, n);
  i++; /* fim do cabeçalho */
  buf = __korin_mmap(maxout + 16); norm = __korin_mmap(maxout + 16); ebuf = __korin_mmap(pre + 16); line = (char *)__korin_mmap(16 * pre + 4096);
  if (!buf || !norm || !ebuf || !line) { __korin_write("@@KORIN-ERR mmap\n", 17); __KORIN_SC(231, 0, 0, 0, 0); }
  for (t = 0; t < tests; t++) {
    unsigned long len = __korin_num(in, &i, n), osz = 0, esz = 0, keep = 0, ekeep = 0, nl;
    long infd, po[2], pe[2], pid, t0, ms, st = 0, code = 0, sig = 0; int to = 0, ole = 0, alive = 1, ofd, efd;
    char sha[65], *p;
    i++; if (i + len > n) len = n > i ? n - i : 0;
    /* stdin num memfd (o filho lê quando quiser, sem deadlock); stdout/stderr por pipe, drenados aqui com teto. */
    infd = __KORIN_SC(319, "in", 0, 0, 0);
    { int pp[2]; if (__KORIN_SC(22, pp, 0, 0, 0) < 0) infd = -1; po[0] = pp[0]; po[1] = pp[1]; }
    { int pp[2]; if (__KORIN_SC(22, pp, 0, 0, 0) < 0) infd = -1; pe[0] = pp[0]; pe[1] = pp[1]; }
    if (infd < 0) { __korin_write("@@KORIN-ERR fd\n", 15); __KORIN_SC(231, 0, 0, 0, 0); }
    { unsigned long w = 0; while (w < len) { long r = __KORIN_SC(1, infd, in + i + w, len - w, 0); if (r <= 0) break; w += (unsigned long)r; } }
    __KORIN_SC(8, infd, 0, 0, 0);
    i += len;
    t0 = __korin_now_ms();
    pid = __KORIN_SC(57, 0, 0, 0, 0);
    if (pid == 0) {
      unsigned long rl[2] = {0, 0};
      __KORIN_SC(33, infd, 0, 0, 0); __KORIN_SC(33, po[1], 1, 0, 0); __KORIN_SC(33, pe[1], 2, 0, 0);
      __KORIN_SC(3, infd, 0, 0, 0); __KORIN_SC(3, po[0], 0, 0, 0); __KORIN_SC(3, po[1], 0, 0, 0); __KORIN_SC(3, pe[0], 0, 0, 0); __KORIN_SC(3, pe[1], 0, 0, 0);
      __KORIN_SC(302, 0, 4, rl, 0); /* RLIMIT_CORE = 0 */
      __KORIN_SC(157, 4, 0, 0, 0);  /* PR_SET_DUMPABLE = 0: nem core_pattern em pipe (apport) gera dump; o crash morre na hora */
      return; /* segue para o main do jogador */
    }
    __KORIN_SC(3, infd, 0, 0, 0); __KORIN_SC(3, po[1], 0, 0, 0); __KORIN_SC(3, pe[1], 0, 0, 0);
    ofd = (int)po[0]; efd = (int)pe[0];
    __KORIN_SC(72, ofd, 4, 0x800, 0); __KORIN_SC(72, efd, 4, 0x800, 0); /* O_NONBLOCK só no lado do pai */
    for (;;) {
      struct { int fd; short ev, rev; } pf[2];
      int k, open = 0;
      pf[0].fd = ofd; pf[1].fd = efd; pf[0].ev = pf[1].ev = 1; pf[0].rev = pf[1].rev = 0;
      if (ofd >= 0 || efd >= 0) __KORIN_SC(7, pf, 2, alive ? 1 : 0, 0);
      for (k = 0; k < 2; k++) {
        int *fd = k ? &efd : &ofd;
        for (;;) {
          long r;
          if (*fd < 0) break;
          if (k == 0) {
            if (keep < maxout + 1) { r = __KORIN_SC(0, *fd, buf + keep, maxout + 1 - keep, 0); if (r > 0) keep += (unsigned long)r; }
            else r = __KORIN_SC(0, *fd, norm, 65536 < maxout ? 65536 : maxout, 0);
            if (r > 0) osz += (unsigned long)r;
          } else {
            if (ekeep < pre) { r = __KORIN_SC(0, *fd, ebuf + ekeep, pre - ekeep, 0); if (r > 0) ekeep += (unsigned long)r; }
            else r = __KORIN_SC(0, *fd, norm, 65536 < maxout ? 65536 : maxout, 0);
            if (r > 0) esz += (unsigned long)r;
          }
          if (r == 0) { __KORIN_SC(3, *fd, 0, 0, 0); *fd = -1; break; } /* EOF */
          if (r < 0) break; /* EAGAIN: nada por agora */
        }
        if (*fd >= 0) open = 1;
      }
      if (alive && osz > maxout) { __KORIN_SC(62, pid, 9, 0, 0); ole = 1; }
      if (alive) {
        if (__KORIN_SC(61, pid, &st, 1, 0) == pid) alive = 0;
        else if (__korin_now_ms() - t0 > (long)limit) { __KORIN_SC(62, pid, 9, 0, 0); __KORIN_SC(61, pid, &st, 0, 0); alive = 0; to = !ole; }
      }
      if (!alive && !open) break;
      if (!alive && open && __korin_now_ms() - t0 > (long)limit + 200) break; /* neto segurando o pipe */
    }
    if (ofd >= 0) __KORIN_SC(3, ofd, 0, 0, 0);
    if (efd >= 0) __KORIN_SC(3, efd, 0, 0, 0);
    ms = __korin_now_ms() - t0;
    if ((st & 0x7f) == 0) code = (st >> 8) & 0xff; else { sig = st & 0x7f; code = 128 + sig; }
    if (keep > maxout) keep = maxout;
    nl = __korin_normalize(buf, keep, norm);
    __korin_sha256(norm, nl, sha);
    p = line;
    p = __korin_put(p, "@@KORIN "); p = __korin_putn(p, (long)t); *p++ = ' ';
    p = __korin_putn(p, to); *p++ = ' '; p = __korin_putn(p, ole); *p++ = ' ';
    p = __korin_putn(p, code); *p++ = ' '; p = __korin_putn(p, ms); *p++ = ' ';
    p = __korin_putn(p, (long)osz); *p++ = ' '; p = __korin_put(p, sha); *p++ = ' ';
    p = __korin_hex(p, buf, keep < pre ? keep : pre); *p++ = ' ';
    p = __korin_hex(p, ebuf, ekeep);
    *p++ = '\n';
    __korin_write(line, (unsigned long)(p - line));
    (void)esz;
  }
  __KORIN_SC(231, 0, 0, 0, 0); /* exit_group: o pai nunca chega ao main */
}
#pragma GCC diagnostic pop
`;

const RUST_DRIVER = String.raw`
// ---- korin: driver de testes em lote (não faz parte do seu código) ----
fn main() -> std::process::ExitCode {
    __korin_driver::run()
}
#[allow(warnings)]
mod __korin_driver {
    use std::io::{Read, Write};
    use std::process::{Command, ExitCode, Stdio};
    use std::time::{Duration, Instant};
    pub fn run() -> ExitCode {
        if std::env::var_os("KORIN_CHILD").is_some() {
            return std::process::Termination::report(super::__korin_user_main());
        }
        let mut input = Vec::new();
        let _ = std::io::stdin().read_to_end(&mut input);
        if !input.starts_with(b"KORIN1") {
            return ExitCode::from(2);
        }
        let mut i = 6usize;
        let tests = num(&input, &mut i);
        let limit = num(&input, &mut i) as u64;
        let pre = num(&input, &mut i);
        let maxout = num(&input, &mut i);
        i += 1;
        let exe = std::env::current_exe().expect("current_exe");
        let stdout = std::io::stdout();
        let mut out = stdout.lock();
        for t in 0..tests {
            let len = num(&input, &mut i);
            i += 1;
            let end = (i + len).min(input.len());
            let data = input[i.min(end)..end].to_vec();
            i = end;
            let t0 = Instant::now();
            let mut cmd = Command::new(&exe);
            cmd.env("KORIN_CHILD", "1").stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
            // PR_SET_DUMPABLE = 0: crash (estouro de pilha) morre na hora, sem core dump.
            unsafe {
                std::os::unix::process::CommandExt::pre_exec(&mut cmd, || {
                    prctl(4, 0);
                    Ok(())
                });
            }
            let mut child = match cmd.spawn() {
                Ok(c) => c,
                Err(e) => {
                    let _ = writeln!(out, "@@KORIN-ERR spawn {}", e);
                    return ExitCode::from(3);
                }
            };
            let mut sin = child.stdin.take().unwrap();
            let w = std::thread::spawn(move || {
                let _ = sin.write_all(&data);
            });
            let so = child.stdout.take().unwrap();
            let se = child.stderr.take().unwrap();
            let over = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
            let flag = over.clone();
            let ro = std::thread::spawn(move || cap(so, maxout + 1, Some(flag)));
            let re = std::thread::spawn(move || cap(se, pre, None));
            let mut to = 0;
            let status = loop {
                match child.try_wait() {
                    Ok(Some(s)) => break Some(s),
                    Ok(None) => {}
                    Err(_) => break None,
                }
                if over.load(std::sync::atomic::Ordering::Relaxed) {
                    let _ = child.kill();
                    break child.wait().ok();
                }
                if t0.elapsed() > Duration::from_millis(limit) {
                    let _ = child.kill();
                    to = 1;
                    break child.wait().ok();
                }
                std::thread::sleep(Duration::from_micros(500));
            };
            let ms = t0.elapsed().as_millis();
            let (o, osz) = ro.join().unwrap_or_default();
            let (e, _) = re.join().unwrap_or_default();
            let _ = w.join();
            let code: i64 = match status {
                Some(s) => match s.code() {
                    Some(c) => c as i64,
                    None => 128 + std::os::unix::process::ExitStatusExt::signal(&s).unwrap_or(0) as i64,
                },
                None => -1,
            };
            let ole = if osz > maxout { 1 } else { 0 };
            if ole == 1 {
                to = 0;
            }
            let keep = &o[..o.len().min(maxout)];
            let sha = sha256(&normalize(keep));
            let _ = writeln!(out, "@@KORIN {} {} {} {} {} {} {} {} {}", t, to, ole, code, ms, osz, sha, hex(&keep[..keep.len().min(pre)]), hex(&e[..e.len().min(pre)]));
        }
        let _ = out.flush();
        ExitCode::SUCCESS
    }
    extern "C" {
        fn prctl(option: i32, ...) -> i32;
    }
    fn num(s: &[u8], i: &mut usize) -> usize {
        while *i < s.len() && !s[*i].is_ascii_digit() {
            *i += 1;
        }
        let mut v = 0usize;
        while *i < s.len() && s[*i].is_ascii_digit() {
            v = v * 10 + (s[*i] - b'0') as usize;
            *i += 1;
        }
        v
    }
    /** Lê tudo (para o filho nunca travar escrevendo), guardando até \`max\` bytes. */
    fn cap<R: Read>(mut r: R, max: usize, over: Option<std::sync::Arc<std::sync::atomic::AtomicBool>>) -> (Vec<u8>, usize) {
        let mut v = Vec::new();
        let mut total = 0usize;
        let mut buf = [0u8; 65536];
        loop {
            match r.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(k) => {
                    total += k;
                    if total > max {
                        if let Some(f) = &over {
                            f.store(true, std::sync::atomic::Ordering::Relaxed);
                        }
                    }
                    if v.len() < max {
                        let take = k.min(max - v.len());
                        v.extend_from_slice(&buf[..take]);
                    }
                }
            }
        }
        (v, total)
    }
    fn hex(b: &[u8]) -> String {
        if b.is_empty() {
            return "-".into();
        }
        b.iter().map(|x| format!("{:02x}", x)).collect()
    }
    fn trim_ws(o: &mut Vec<u8>, ls: usize) {
        while o.len() > ls && matches!(o[o.len() - 1], b' ' | b'\t' | 0x0b | 0x0c) {
            o.pop();
        }
    }
    fn normalize(s: &[u8]) -> Vec<u8> {
        let mut o = Vec::with_capacity(s.len());
        let mut ls = 0;
        let mut i = 0;
        while i < s.len() {
            let mut c = s[i];
            if c == b'\r' {
                if i + 1 < s.len() && s[i + 1] == b'\n' {
                    i += 1;
                }
                c = b'\n';
            }
            if c == b'\n' {
                trim_ws(&mut o, ls);
                o.push(b'\n');
                ls = o.len();
            } else {
                o.push(c);
            }
            i += 1;
        }
        trim_ws(&mut o, ls);
        while o.last() == Some(&b'\n') {
            o.pop();
        }
        o
    }
    const K: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    fn sha256(m: &[u8]) -> String {
        let mut h: [u32; 8] = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
        let mut data = m.to_vec();
        let bits = (m.len() as u64) * 8;
        data.push(0x80);
        while data.len() % 64 != 56 {
            data.push(0);
        }
        data.extend_from_slice(&bits.to_be_bytes());
        for chunk in data.chunks(64) {
            let mut w = [0u32; 64];
            for i in 0..16 {
                w[i] = u32::from_be_bytes([chunk[4 * i], chunk[4 * i + 1], chunk[4 * i + 2], chunk[4 * i + 3]]);
            }
            for i in 16..64 {
                let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
                let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
                w[i] = w[i - 16].wrapping_add(s0).wrapping_add(w[i - 7]).wrapping_add(s1);
            }
            let (mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut hh) = (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]);
            for i in 0..64 {
                let t1 = hh.wrapping_add(e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25)).wrapping_add((e & f) ^ (!e & g)).wrapping_add(K[i]).wrapping_add(w[i]);
                let t2 = (a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22)).wrapping_add((a & b) ^ (a & c) ^ (b & c));
                hh = g;
                g = f;
                f = e;
                e = d.wrapping_add(t1);
                d = c;
                c = b;
                b = a;
                a = t1.wrapping_add(t2);
            }
            for (x, y) in h.iter_mut().zip([a, b, c, d, e, f, g, hh]) {
                *x = x.wrapping_add(y);
            }
        }
        h.iter().map(|x| format!("{:08x}", x)).collect()
    }
}
`;

const RUST_MAIN = /\bfn\s+main\s*\(/;

/**
 * Código do jogador + driver. `null` quando não dá para montar o lote (Rust
 * sem `fn main`): o motor cai para um request por teste.
 */
export function wrapForBatch(language: Language, source: string): string | null {
  const body = source.endsWith("\n") ? source : source + "\n";
  if (language === "c" || language === "cpp") return body + C_DRIVER;
  if (language === "rust") {
    if (!RUST_MAIN.test(body)) return null;
    return body.replace(RUST_MAIN, "fn __korin_user_main(") + RUST_DRIVER;
  }
  return null;
}

const dec = new TextDecoder();
function unhex(h: string): string {
  if (h === "-" || !h) return "";
  const b = new Uint8Array(h.length / 2);
  for (let i = 0; i < b.length; i++) b[i] = parseInt(h.slice(2 * i, 2 * i + 2), 16);
  return dec.decode(b);
}

/**
 * Lê as linhas @@KORIN. `null` se o driver não rodou (erro de infraestrutura
 * dele, ex.: sem memfd): quem chamou cai para um request por teste.
 */
export function parseBatch(stdout: string, n: number, pre: number): (RawRun | null)[] | null {
  if (stdout.includes("@@KORIN-ERR")) return null;
  const runs: (RawRun | null)[] = new Array(n).fill(null);
  let seen = 0;
  for (const line of stdout.split("\n")) {
    if (!line.startsWith("@@KORIN ")) continue;
    const [, idx, to, ole, code, ms, osz, sha, outHex, errHex] = line.trim().split(" ");
    const i = Number(idx);
    if (!(i >= 0 && i < n)) continue;
    const size = Number(osz);
    const stdout = unhex(outHex);
    runs[i] = {
      stdout,
      stderr: unhex(errHex),
      exitCode: Number(code),
      timeMs: Number(ms),
      timedOut: to === "1",
      outputTruncated: ole === "1",
      stdoutSha256: sha,
      // só o começo da saída voltou: o painel mostra o prefixo, o veredito vem do hash
      partial: size > pre,
    };
    seen++;
  }
  return seen ? runs : null;
}
