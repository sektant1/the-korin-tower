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
}

// gcc/g++: "main.c:12:5: error"   rustc: "--> main.rs:12:5"
const LOC_RE = /\b(?:main|shader)\.(?:c|cpp|rs|go|zig|asm|frag):(\d+):(\d+)/g;

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
  AC: "PASSOU",
  WA: "RESPOSTA ERRADA",
  TLE: "TEMPO ESGOTADO",
  RE: "ERRO DE EXECUÇÃO",
  OLE: "SAÍDA GRANDE DEMAIS",
};

function Metrics({ t }: { t: Pick<TestOutcome, "timeMs" | "memoryKb" | "exitCode"> }) {
  return (
    <span className="metrics">
      tempo {t.timeMs ?? "?"} ms · mem {t.memoryKb != null ? `${(t.memoryKb / 1024).toFixed(1)} MB` : "n/d"} · exit {t.exitCode ?? "?"}
    </span>
  );
}

function Diff({ expected, actual }: { expected: string; actual: string }) {
  const e = expected.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  const a = actual.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  const n = Math.max(e.length, a.length);
  const firstBad = Array.from({ length: n }, (_, i) => (e[i] ?? "").trimEnd() !== (a[i] ?? "").trimEnd()).indexOf(true);
  const from = Math.max(0, firstBad - 3);
  const rows = Array.from({ length: Math.min(n - from, 40) }, (_, k) => from + k);
  return (
    <table className="diff">
      <caption>
        {firstBad >= 0 ? `primeira diferença na linha ${firstBad + 1}` : "saídas iguais"}
        {n - from > 40 ? ` (mostrando 40 de ${n} linhas)` : ""}
      </caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">esperado</th>
          <th scope="col">obtido</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((i) => {
          const same = (e[i] ?? "").trimEnd() === (a[i] ?? "").trimEnd();
          return (
            <tr key={i} className={same ? "" : "bad"}>
              <td>{i + 1}</td>
              <td>{e[i] ?? "∅"}</td>
              <td>{a[i] ?? "∅"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TestRow({ t, checker }: { t: TestOutcome; checker: Props["checker"] }) {
  const ok = t.verdict === "AC";
  const head = (
    <>
      <span className={ok ? "pass" : "fail"}>
        {ok ? "[OK] PASSOU" : "[X] FALHOU"}
      </span>{" "}
      <b>{t.hidden ? `${t.name} (oculto)` : t.name}</b> {!ok && <span className="fail">[{VERDICT[t.verdict]}]</span>} <Metrics t={t} />
      {t.message && <div className="out-note">{t.message}</div>}
    </>
  );
  if (t.hidden) return <li className="test-row">{head}</li>;
  return (
    <li className="test-row">
      <details open={!ok}>
        <summary>{head}</summary>
        <div className="test-detail">
          <div className="io-label">entrada</div>
          <pre className="out-pre small">{t.input.length > 2000 ? t.input.slice(0, 2000) + "\n…" : t.input || "(vazia)"}</pre>
          {checker === "ppm" && looksLikePpm(t.stdout) ? (
            <div className="ppm-pair">
              <PpmView text={t.expected} label="esperado" />
              <PpmView text={t.stdout} label="obtido" />
            </div>
          ) : (
            !ok && t.verdict === "WA" && <Diff expected={t.expected} actual={t.stdout} />
          )}
          {t.stderr && (
            <>
              <div className="io-label">stderr</div>
              <pre className="out-pre small out-err">{t.stderr}</pre>
            </>
          )}
        </div>
      </details>
    </li>
  );
}

export function OutputPanel({ state, checker, onJump }: Props) {
  return (
    <div className="crt" aria-live="polite" aria-busy={state.status === "running"}>
      <div className="crt-inner">
        {state.status === "idle" && (
          <p className="dim">
            C:\KORIN&gt; aguardando... digite <kbd>:run</kbd>, <kbd>:test</kbd> ou <kbd>:submit</kbd>
            <span className="caret">_</span>
          </p>
        )}
        {state.status === "running" && (
          <div>
            <p>
              <Gif gif={GIFS.loading} /> {state.label}
            </p>
            <div className="loading-bar" aria-hidden="true">
              <span />
            </div>
            <p className="dim blink-slow">CARREGANDO KI... NÃO DESLIGUE O VIDEOGAME</p>
          </div>
        )}
        {state.status === "error" && <p className="out-err">*** ERRO: {state.error}</p>}
        {state.status === "done" && <Done r={state.response} checker={checker} onJump={onJump} />}
      </div>
    </div>
  );
}

function Done({ r, checker, onJump }: { r: RunResponse; checker: Props["checker"]; onJump: Props["onJump"] }) {
  return (
    <>
      {r.warnings.map((w) => (
        <p key={w} className="out-warn">(!) {w}</p>
      ))}
      {!r.compile.ok ? (
        <>
          <div className="result-gif">
            <Gif gif={GIFS.hell} height={70} />
          </div>
          <p className="fail">[X] ERRO DE COMPILAÇÃO (clique na linha para pular no editor)</p>
          <ClickableLog text={r.compile.output} onJump={onJump} />
        </>
      ) : (
        <>
          {r.compile.output.trim() && (
            <details>
              <summary className="out-warn">avisos do compilador</summary>
              <ClickableLog text={r.compile.output} onJump={onJump} />
            </details>
          )}
          {r.mode === "run" && r.run && (
            <>
              <p>
                <Metrics t={r.run} />
                {r.run.verdict === "TLE" && <span className="fail"> TEMPO ESGOTADO</span>}
              </p>
              {looksLikePpm(r.run.stdout) && <PpmView text={r.run.stdout} label="stdout" />}
              <div className="io-label">stdout</div>
              <pre className="out-pre">{r.run.stdout.length > 20000 ? r.run.stdout.slice(0, 20000) + "\n… (cortado)" : r.run.stdout || "(vazio)"}</pre>
              {r.run.stderr && (
                <>
                  <div className="io-label">stderr</div>
                  <pre className="out-pre out-err">{r.run.stderr}</pre>
                </>
              )}
            </>
          )}
          {r.mode !== "run" && (
            <>
              {r.allPassed ? (
                <>
                  {r.mode === "submit" && (
                    <div className="result-gif">
                      <Gif gif={GIFS.gokuKame} height={70} />
                    </div>
                  )}
                  <p className={`banner-win ${r.mode === "submit" ? "big" : ""}`}>
                    <Gif gif={GIFS.sphere} height={24} />{" "}
                    {r.mode === "submit" ? "STAGE CLEAR! TODOS OS TESTES PASSARAM" : "TESTES PUBLICOS OK, agora :submit"}{" "}
                    <Gif gif={GIFS.sphere} height={24} />
                  </p>
                </>
              ) : (
                <>
                  {r.mode === "submit" && (
                    <div className="result-gif">
                      <Gif gif={GIFS.buuBlast} height={70} />
                    </div>
                  )}
                  <p className="banner-lose">GAME OVER · {r.tests.filter((t) => t.verdict === "AC").length}/{r.tests.length} · CONTINUE?</p>
                </>
              )}
              <ul className="tests">
                {r.tests.map((t) => (
                  <TestRow key={(t.hidden ? "h" : "p") + t.name} t={t} checker={checker} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  );
}
