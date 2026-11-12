"use client";
import type { ReactNode } from "react";
import type { TestOutcome } from "@/lib/judge/judge";
import { looksLikePpm } from "@/lib/ppm";
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
  onJump(line: number, col: number): void;
  /** Texto do estado inicial; padrão é a dica de :run/:test/:submit dos desafios. */
  idle?: string;
}

// gcc/g++: "main.c:12:5: error"   rustc: "--> main.rs:12:5"
const LOC_RE = /\b(?:main|shader)\.(?:c|cpp|rs|frag):(\d+):(\d+)/g;

export function ClickableLog({ text, onJump }: { text: string; onJump(line: number, col: number): void }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LOC_RE)) {
    parts.push(text.slice(last, m.index));
    const line = Number(m[1]);
    const col = Number(m[2]);
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

function TestRow({ t, checker, open }: { t: TestOutcome; checker: Props["checker"]; open: boolean }) {
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
  // Ocultos e aprovados: só a linha. O detalhe fica para os públicos que falharam.
  if (t.hidden || ok) {
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
          {t.message && <p className="out-note test-msg">{t.message}</p>}
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
              <pre className="out-pre">{t.stdout.length > 2000 ? t.stdout.slice(0, 2000) + "\n…" : t.stdout}</pre>
            </>
          )}
          {t.stderr && (
            <>
              <div className="io-label">stderr</div>
              <pre className="out-pre out-err">{t.stderr.length > 2000 ? t.stderr.slice(0, 2000) + "\n…" : t.stderr}</pre>
            </>
          )}
          <details className="test-input">
            <summary>entrada deste teste</summary>
            <pre className="out-pre">{t.input.length > 2000 ? t.input.slice(0, 2000) + "\n…" : t.input || "(vazia)"}</pre>
          </details>
        </div>
      </details>
    </li>
  );
}

export function OutputPanel({ state, checker, onJump, idle }: Props) {
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
        {state.status === "error" && <div className="out-head bad">erro: {state.error}</div>}
        {state.status === "done" && <Done r={state.response} checker={checker} onJump={onJump} />}
      </div>
    </div>
  );
}

function Done({ r, checker, onJump }: { r: RunResponse; checker: Props["checker"]; onJump: Props["onJump"] }) {
  const notes = r.warnings.length > 0 && (
    <ul className="out-notes">
      {r.warnings.map((w) => (
        <li key={w}>{w}</li>
      ))}
    </ul>
  );

  if (!r.compile.ok) {
    return (
      <>
        <div className="out-head bad">erro de compilação</div>
        <ClickableLog text={r.compile.output} onJump={onJump} />
        <p className="out-dim">clique em arquivo:linha para ir até o erro</p>
        {notes}
      </>
    );
  }

  const warnings = r.compile.output.trim() ? (
    <details className="out-warnings">
      <summary>avisos do compilador</summary>
      <ClickableLog text={r.compile.output} onJump={onJump} />
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
        {warnings}
        {run && (
          <>
            {looksLikePpm(run.stdout) && <PpmView text={run.stdout} label="stdout" />}
            <pre className="out-pre">{run.stdout.length > 20000 ? run.stdout.slice(0, 20000) + "\n… (cortado)" : run.stdout || "(sem saída)"}</pre>
            {run.stderr && (
              <>
                <div className="io-label">stderr</div>
                <pre className="out-pre out-err">{run.stderr}</pre>
              </>
            )}
          </>
        )}
        {notes}
      </>
    );
  }

  const passed = r.tests.filter((t) => t.verdict === "AC").length;
  const total = r.tests.length;
  const firstFail = r.tests.findIndex((t) => t.verdict !== "AC" && !t.hidden);
  const submitted = r.mode === "submit";
  return (
    <>
      {r.allPassed ? (
        <div className="out-head ok">
          {submitted && <Gif gif={GIFS.sphere} height={20} />}
          {submitted ? "resolvido" : "testes públicos ok"}
          <span className="out-head-meta">
            {passed}/{total} testes{!submitted && " · :submit roda os ocultos"}
          </span>
        </div>
      ) : (
        <div className="out-head bad">
          {submitted ? "reprovado" : "ainda não"}
          <span className="out-head-meta">
            {passed}/{total} testes
          </span>
        </div>
      )}
      {warnings}
      <ul className="tests">
        {r.tests.map((t, i) => (
          <TestRow key={(t.hidden ? "h" : "p") + t.name} t={t} checker={checker} open={i === firstFail} />
        ))}
      </ul>
      {notes}
    </>
  );
}
