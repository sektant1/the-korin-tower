"use client";
import type { ReactNode } from "react";
import { explainRuntime, parseDiagnostics, type Diagnostic } from "@/lib/diagnostics";
import type { LanguageId } from "@/lib/languages";
import { looksLikePpm } from "@/lib/ppm";
import type { TestOutcome } from "@/lib/runner/types";
import type { RunResponse } from "@/lib/run-api";
import { Gif } from "@/components/Gif";
import { GIFS } from "@/lib/gifs";
import { PpmView } from "./PpmView";

export type OutputState =
  | { status: "idle" }
  | { status: "running"; label: string }
  | { status: "error"; error: string }
  | { status: "done"; response: RunResponse };

interface Props {
  state: OutputState;
  checker: "exact" | "ppm";
  /** para entender os erros do compilador/interpretador certo */
  language: LanguageId;
  onJump(line: number, col: number): void;
  /** Texto do estado inicial; padrão é a dica de :run/:test/:submit dos desafios. */
  idle?: string;
  /** Linha n (1-based) do código no editor, para mostrar onde o erro aconteceu. */
  codeLine?: (n: number) => string | undefined;
}

// gcc/g++: "main.c:12:5: error"   rustc: "--> main.rs:12:5"   Python: 'File "main.py", line 12'
const LOC_RE = /\bmain\.(?:c|cpp|rs):(\d+):(\d+)|File "main\.py", line (\d+)/g;

export function ClickableLog({ text, onJump }: { text: string; onJump(line: number, col: number): void }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LOC_RE)) {
    parts.push(text.slice(last, m.index));
    const line = Number(m[1] ?? m[3]);
    const col = Number(m[2] ?? 1);
    parts.push(
      <button key={m.index} type="button" className="loc-link" onClick={() => onJump(line, col)} title={`Ir para a linha ${line}`}>
        {m[0]}
      </button>,
    );
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return <pre className="out-pre">{parts}</pre>;
}

const VERDICT: Record<TestOutcome["verdict"], string> = {
  AC: "ok",
  WA: "resposta errada",
  TLE: "tempo esgotado",
  RE: "erro de execução",
  OLE: "saída grande demais",
};

/** "24 ms · 1,2 MB · exit 1": só o que existe e só o que importa. */
function metrics(t: Pick<TestOutcome, "timeMs" | "memoryKb" | "exitCode">, showExit = false): string {
  const out: string[] = [];
  if (t.timeMs != null) out.push(`${t.timeMs} ms`);
  if (t.memoryKb != null) out.push(`${(t.memoryKb / 1024).toFixed(1)} MB`);
  if (t.exitCode != null && (showExit || t.exitCode !== 0)) out.push(`exit ${t.exitCode}`);
  return out.join(" · ");
}

const MAX_DIFF_ROWS = 30;

function Diff({ expected, actual }: { expected: string; actual: string }) {
  const e = expected.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  const a = actual.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  const n = Math.max(e.length, a.length);
  const differs = (i: number) => (e[i] ?? "").trimEnd() !== (a[i] ?? "").trimEnd();
  const firstBad = Array.from({ length: n }, (_, i) => differs(i)).indexOf(true);
  const from = Math.max(0, firstBad - 2);
  const rows = Array.from({ length: Math.min(n - from, MAX_DIFF_ROWS) }, (_, k) => from + k);
  const cut = n - from > MAX_DIFF_ROWS;
  return (
    <div className="diff-wrap">
      <table className="diff">
        <thead>
          <tr>
            <th scope="col">linha</th>
            <th scope="col">esperado</th>
            <th scope="col">seu programa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i} className={differs(i) ? "bad" : undefined}>
              <td>{i + 1}</td>
              <td>{e[i] ?? <i>nada</i>}</td>
              <td>{a[i] ?? <i>nada</i>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {cut && (
        <p className="out-dim">
          mostrando {MAX_DIFF_ROWS} de {n} linhas
        </p>
      )}
    </div>
  );
}

const SEV_LABEL = { error: "erro", warning: "aviso", note: "nota" } as const;
const MAX_SNIPPET = 10;

/** Um diagnóstico do compilador: onde, o quê e o trecho de código com o ^. */
function DiagnosticCard({ d, onJump }: { d: Diagnostic; onJump: Props["onJump"] }) {
  const snippet = d.snippet.length > MAX_SNIPPET ? [...d.snippet.slice(0, MAX_SNIPPET), "  …"] : d.snippet;
  const userFile = d.file && /^main\./.test(d.file);
  return (
    <li className={`diag diag-${d.severity}`}>
      <div className="diag-head">
        <span className="diag-sev">{SEV_LABEL[d.severity]}</span>
        {d.line != null &&
          (userFile ? (
            <button type="button" className="loc-link" onClick={() => onJump(d.line!, d.col ?? 1)} title={`Ir para a linha ${d.line}`}>
              linha {d.line}
              {d.col ? `:${d.col}` : ""}
            </button>
          ) : (
            <span className="out-dim">
              {d.file}:{d.line}
            </span>
          ))}
        <span className="diag-msg">{d.message}</span>
        {d.code && <span className="out-dim diag-code">{d.code}</span>}
      </div>
      {snippet.length > 0 && <pre className="out-pre diag-snippet">{snippet.join("\n")}</pre>}
    </li>
  );
}

/** Saída do compilador: cartões quando dá para entender, texto cru sempre à mão. */
function CompilerLog({ text, language, onJump, failed }: { text: string; language: LanguageId; onJump: Props["onJump"]; failed: boolean }) {
  const all = parseDiagnostics(language, text);
  const shown = failed ? all.filter((d) => d.severity !== "note" || all.length < 4) : all.filter((d) => d.severity === "warning");
  if (!shown.length) return <ClickableLog text={text} onJump={onJump} />;
  return (
    <>
      <ul className="diags">
        {shown.map((d, i) => (
          <DiagnosticCard key={i} d={d} onJump={onJump} />
        ))}
      </ul>
      <details className="out-raw">
        <summary>saída completa do {language === "python" ? "Python" : "compilador"}</summary>
        <ClickableLog text={text} onJump={onJump} />
      </details>
    </>
  );
}

/** "ZeroDivisionError: division by zero" -> ["ZeroDivisionError", "division by zero"] */
function splitTitle(title: string): [string, string] {
  const m = /^([A-Za-z_][\w.]*(?:Error|Exception|Exit|Interrupt|Warning)|panic|assert falhou): ?(.*)$/s.exec(title);
  return m ? [m[1], m[2]] : [title, ""];
}

/** Linha do código do jogador onde o erro aconteceu, com o número. */
function CodeAt({ line, codeLine, onJump, col }: { line: number; col?: number; codeLine?: Props["codeLine"]; onJump: Props["onJump"] }) {
  const code = codeLine?.(line);
  return (
    <button type="button" className="err-code" onClick={() => onJump(line, col ?? 1)} title={`Ir para a linha ${line}`}>
      <span className="err-ln">{line}</span>
      <code>{code?.trim() ? code.replace(/\s+$/, "") : `linha ${line}`}</code>
    </button>
  );
}

/** Erro de execução: o quê (tipo + mensagem), onde (a linha do seu código) e o porquê provável. */
function RuntimeError({ t, language, onJump, codeLine }: { t: Pick<TestOutcome, "exitCode" | "stderr">; language: LanguageId; onJump: Props["onJump"]; codeLine?: Props["codeLine"] }) {
  const e = explainRuntime(language, t.exitCode, t.stderr);
  if (!e) return null;
  const [kind, msg] = splitTitle(e.title);
  return (
    <div className="err-card">
      <div className="err-title">
        <span className="err-kind">{kind}</span>
        {msg && <span className="err-msg">{msg}</span>}
      </div>
      {e.line != null && <CodeAt line={e.line} col={e.col} codeLine={codeLine} onJump={onJump} />}
      {e.hint && <p className="err-hint">provável causa: {e.hint}</p>}
    </div>
  );
}

/** stderr inteiro (traceback, avisos), recolhido: o cartão acima já diz o essencial. */
function RawStderr({ text, onJump, open }: { text: string; onJump: Props["onJump"]; open?: boolean }) {
  if (!text.trim()) return null;
  return (
    <details className="out-raw" open={open}>
      <summary>{/Traceback/.test(text) ? "traceback completo" : "stderr"}</summary>
      <ClickableLog text={clipText(text, 8000)} onJump={onJump} />
    </details>
  );
}

function clipText(s: string, n = 2000) {
  return s.length > n ? s.slice(0, n) + "\n…" : s;
}

function TestRow({ t, checker, language, open, onJump, codeLine }: { t: TestOutcome; checker: Props["checker"]; language: LanguageId; open: boolean; onJump: Props["onJump"]; codeLine?: Props["codeLine"] }) {
  const ok = t.verdict === "AC";
  const name = t.hidden ? `${t.name} (oculto)` : t.name;
  const head = (
    <>
      <span className={ok ? "mark pass" : "mark fail"} aria-hidden="true">
        {ok ? "✓" : "✗"}
      </span>
      <span className="test-name">{name}</span>
      <span className={ok ? "verdict pass" : "verdict fail"}>{VERDICT[t.verdict]}</span>
      <span className="out-dim test-metrics">{metrics(t)}</span>
    </>
  );
  if (ok) {
    return (
      <li className="test">
        <div className="test-sum">{head}</div>
        {t.message && <p className="out-note test-msg">{t.message}</p>}
      </li>
    );
  }
  return (
    <li className="test">
      <details open={open}>
        <summary className="test-sum">{head}</summary>
        <div className="test-body">
          {t.verdict === "RE" ? <RuntimeError t={t} language={language} onJump={onJump} codeLine={codeLine} /> : t.message && <p className="out-note test-msg">{t.message}</p>}
          {looksLikePpm(t.stdout) ? (
            checker === "ppm" ? (
              <div className="ppm-pair">
                <PpmView text={t.expected} label="esperado" />
                <PpmView text={t.stdout} label="seu programa" />
              </div>
            ) : (
              <PpmView text={t.stdout} label="seu programa" />
            )
          ) : (
            t.verdict === "WA" && <Diff expected={t.expected} actual={t.stdout} />
          )}
          {t.verdict !== "WA" && t.stdout.trim() && !looksLikePpm(t.stdout) && (
            <>
              <div className="io-label">stdout</div>
              <pre className="out-pre">{clipText(t.stdout)}</pre>
            </>
          )}
          <RawStderr text={t.stderr} onJump={onJump} open={t.verdict !== "RE"} />
          <details className="test-input">
            <summary>entrada deste teste</summary>
            <pre className="out-pre">{clipText(t.input) || "(vazia)"}</pre>
          </details>
        </div>
      </details>
    </li>
  );
}

export function OutputPanel({ state, checker, language, onJump, idle, codeLine }: Props) {
  return (
    <div className="crt" aria-live="polite" aria-busy={state.status === "running"}>
      <div className="crt-inner">
        {state.status === "idle" && (
          <p className="out-dim">
            {idle ?? (
              <>
                <kbd>:run</kbd> executa com a entrada acima · <kbd>:test</kbd> roda os testes públicos · <kbd>:submit</kbd> envia
              </>
            )}
            <span className="caret"> _</span>
          </p>
        )}
        {state.status === "running" && (
          <p className="out-dim">
            <Gif gif={GIFS.loading} /> {state.label}
          </p>
        )}
        {state.status === "error" && (
          <div className="err-card">
            <div className="err-title">
              <span className="err-kind">não deu para rodar</span>
            </div>
            <p className="err-plain">{state.error}</p>
          </div>
        )}
        {state.status === "done" && <Done r={state.response} checker={checker} language={language} onJump={onJump} codeLine={codeLine} />}
      </div>
    </div>
  );
}

function Done({ r, checker, language, onJump, codeLine }: { r: RunResponse; checker: Props["checker"]; language: LanguageId; onJump: Props["onJump"]; codeLine?: Props["codeLine"] }) {
  const notes = r.warnings.length > 0 && (
    <ul className="out-notes">
      {r.warnings.map((w) => (
        <li key={w}>{w}</li>
      ))}
    </ul>
  );
  const wall = r.wallMs != null ? <span className="out-dim out-wall"> · {(r.wallMs / 1000).toFixed(1)} s</span> : null;

  if (!r.compile.ok) {
    const n = parseDiagnostics(language, r.compile.output).filter((d) => d.severity === "error").length;
    return (
      <>
        <div className="out-head bad">
          {language === "python" ? "erro de sintaxe" : "não compilou"}
          {n > 1 && <span className="out-head-meta">{n} erros</span>}
        </div>
        <CompilerLog text={r.compile.output} language={language} onJump={onJump} failed />
        {notes}
      </>
    );
  }

  const warnCount = parseDiagnostics(language, r.compile.output).filter((d) => d.severity === "warning").length;
  const warnings = r.compile.output.trim() ? (
    <details className="out-warnings">
      <summary>{warnCount ? `${warnCount} aviso(s) do compilador` : "avisos do compilador"}</summary>
      <CompilerLog text={r.compile.output} language={language} onJump={onJump} failed={false} />
    </details>
  ) : null;

  if (r.mode === "run") {
    const run = r.run;
    // Executar não compara com gabarito: "WA" aqui só significa que a saída não é vazia.
    const failed = run ? run.verdict === "TLE" || run.verdict === "RE" || run.verdict === "OLE" : false;
    return (
      <>
        {run && (
          <div className={`out-head ${failed ? "bad" : "ok"}`}>
            {failed ? VERDICT[run.verdict] : "programa terminou"}
            <span className="out-head-meta">{metrics(run, true)}</span>
          </div>
        )}
        {run?.verdict === "RE" && <RuntimeError t={run} language={language} onJump={onJump} codeLine={codeLine} />}
        {(run?.verdict === "TLE" || run?.verdict === "OLE") && run.message && (
          <div className="err-card">
            <div className="err-title">
              <span className="err-kind">{VERDICT[run.verdict]}</span>
              <span className="err-msg">{run.message}</span>
            </div>
            {run.verdict === "TLE" && <p className="err-hint">provável causa: laço que nunca termina, ou um algoritmo lento demais para a entrada</p>}
          </div>
        )}
        {warnings}
        {run && (
          <>
            {looksLikePpm(run.stdout) && <PpmView text={run.stdout} label="stdout" />}
            {(run.stdout || !failed) && (
              <>
                {failed && <div className="io-label">saída até o erro</div>}
                <pre className="out-pre">{run.stdout.length > 20000 ? run.stdout.slice(0, 20000) + "\n… (cortado)" : run.stdout || "(sem saída)"}</pre>
              </>
            )}
            <RawStderr text={run.stderr} onJump={onJump} open={!failed} />
          </>
        )}
        {notes}
      </>
    );
  }

  const passed = r.tests.filter((t) => t.verdict === "AC").length;
  const total = r.tests.length;
  const firstFail = r.tests.findIndex((t) => t.verdict !== "AC");
  const submitted = r.mode === "submit";
  return (
    <>
      {r.allPassed ? (
        <div className="out-head ok">
          {submitted && <Gif gif={GIFS.sphere} height={20} />}
          {submitted ? "resolvido" : "testes públicos ok"}
          <span className="out-head-meta">
            {passed}/{total} testes{!submitted && " · :submit roda os ocultos"}
            {wall}
          </span>
        </div>
      ) : (
        <div className="out-head bad">
          {submitted ? "reprovado" : "ainda não"}
          <span className="out-head-meta">
            {passed}/{total} testes
            {wall}
          </span>
        </div>
      )}
      {warnings}
      <ul className="tests">
        {r.tests.map((t, i) => (
          <TestRow key={(t.hidden ? "h" : "p") + t.name} t={t} checker={checker} language={language} open={i === firstFail} onJump={onJump} codeLine={codeLine} />
        ))}
      </ul>
      {notes}
    </>
  );
}
