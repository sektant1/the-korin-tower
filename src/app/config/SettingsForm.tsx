"use client";
import { EDITOR_THEMES, DEFAULT_SETTINGS, updateSettings, useSettings, type EditorTheme } from "@/lib/client/store";
import { parseVimrc } from "@/lib/client/vimrc";

export function SettingsForm() {
  const [s] = useSettings();
  const vimrcErrors = parseVimrc(s.vimrc).errors;

  return (
    <form className="settings" onSubmit={(e) => e.preventDefault()}>
      <fieldset className="fieldset98">
        <legend>Editor</legend>
        <label className="check98">
          <input type="checkbox" checked={s.vim} onChange={(e) => updateSettings({ vim: e.target.checked })} /> Modo Vim
        </label>
        <label>
          Tema do editor{" "}
          <select className="select98" value={s.editorTheme} onChange={(e) => updateSettings({ editorTheme: e.target.value as EditorTheme })}>
            {EDITOR_THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tamanho da fonte{" "}
          <select className="select98" value={s.fontSize} onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}>
            {[12, 13, 14, 15, 16, 18, 20, 22].map((n) => (
              <option key={n} value={n}>
                {n}px
              </option>
            ))}
          </select>
        </label>
        <label className="block" htmlFor="vimrc">
          .vimrc simplificado
        </label>
        <textarea
          id="vimrc"
          className="stdin98"
          rows={6}
          spellCheck={false}
          value={s.vimrc}
          onChange={(e) => updateSettings({ vimrc: e.target.value })}
          aria-describedby="vimrc-help"
        />
        <p id="vimrc-help" className="dim small">
          Aceita <code>map</code>, <code>nmap</code>, <code>imap</code>, <code>vmap</code>, <code>noremap</code> e <code>set theme=ambar</code>.
        </p>
        {vimrcErrors.map((e) => (
          <p key={e} className="out-warn">
            (!) {e}
          </p>
        ))}
      </fieldset>

      <fieldset className="fieldset98">
        <legend>Compilador (C / C++)</legend>
        <p className="dim small">
          Flags extras, ex.: <code>-O0 -g -fsanitize=address</code>. Só uma lista segura é aceita.
        </p>
        <label>
          gcc{" "}
          <input className="input98" value={s.flags.c} onChange={(e) => updateSettings({ flags: { ...s.flags, c: e.target.value } })} />
        </label>
        <label>
          g++{" "}
          <input className="input98" value={s.flags.cpp} onChange={(e) => updateSettings({ flags: { ...s.flags, cpp: e.target.value } })} />
        </label>
      </fieldset>

      <fieldset className="fieldset98">
        <legend>Visual</legend>
        <label className="check98">
          <input type="checkbox" checked={s.sanity} onChange={(e) => updateSettings({ sanity: e.target.checked })} /> Menos animações
        </label>
        <label className="check98">
          <input type="checkbox" checked={s.starTrail} onChange={(e) => updateSettings({ starTrail: e.target.checked })} /> Estrelinhas atrás do mouse
        </label>
      </fieldset>

      <button type="button" className="btn98" onClick={() => updateSettings(DEFAULT_SETTINGS)}>
        Restaurar padrões
      </button>
    </form>
  );
}
