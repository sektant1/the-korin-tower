"use client";
import { useEffect, useRef, useState } from "react";
import { buildShaderProgram } from "@/lib/client/shader";
import type { ShaderError } from "@/lib/client/shader";

interface Props {
  source: string;
  /** Incrementar recompila (`:run`). */
  version: number;
  onResult(errors: ShaderError[]): void;
}

export function ShaderCanvas({ source, version, onResult }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const el = canvas.current!;
    const gl = el.getContext("webgl2");
    if (!gl) {
      onResultRef.current([{ line: null, message: "Seu navegador não suporta WebGL2." }]);
      return;
    }
    const { program, errors } = buildShaderProgram(gl, source);
    if (!program) {
      onResultRef.current(errors);
      return;
    }
    onResultRef.current([]);

    // Triângulo que cobre a tela inteira.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
    const uRes = gl.getUniformLocation(program, "iResolution");
    const uTime = gl.getUniformLocation(program, "iTime");
    const uMouse = gl.getUniformLocation(program, "iMouse");

    const mouse = [0, 0, 0, 0];
    let down = false;
    const toPx = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * el.width, (1 - (e.clientY - r.top) / r.height) * el.height];
    };
    const onDown = (e: PointerEvent) => {
      down = true;
      const [x, y] = toPx(e);
      mouse.splice(0, 4, x, y, x, y);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const [x, y] = toPx(e);
      mouse[0] = x;
      mouse[1] = y;
    };
    const onUp = () => {
      down = false;
      mouse[2] = -Math.abs(mouse[2]);
      mouse[3] = -Math.abs(mouse[3]);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    let raf = 0;
    let time = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!pausedRef.current) time += (now - last) / 1000;
      last = now;
      const w = el.clientWidth * devicePixelRatio;
      const h = el.clientHeight * devicePixelRatio;
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
      }
      gl.viewport(0, 0, el.width, el.height);
      gl.uniform3f(uRes, el.width, el.height, 1);
      gl.uniform1f(uTime, time);
      gl.uniform4fv(uMouse, mouse);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      gl.deleteProgram(program);
      gl.deleteBuffer(buf);
    };
    // Recompila só quando `version` muda (:run), não a cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return (
    <div className="shader-box">
      <canvas ref={canvas} className="shader-canvas" aria-label="Saída do shader (WebGL2)" />
      <button type="button" className="btn98 small" onClick={() => setPaused((p) => !p)}>
        {paused ? "Continuar" : "Pausar"}
      </button>
    </div>
  );
}
