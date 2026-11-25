"use client";
// Rascunhos do editor, uma entrada por linguagem.
//
// O editor é um só: trocar de linguagem troca o texto. Este caderno guarda em memória
// o que estava em cada linguagem (vale até sair da página) e persiste:
// - sem login: localStorage;
// - com login: na conta (PUT/DELETE em fila por linguagem, para não chegar fora de ordem),
//   com uma cópia "pending" no localStorage até o servidor confirmar. Se o save falhar ou a
//   página fechar antes da resposta, a cópia vence o que está na conta na próxima abertura.
//
// Código igual ao template não vira rascunho: o rascunho é apagado, e quem abrir de novo
// recebe o template atual (que pode ter mudado desde então).
import { clearDraft, loadDraft, saveDraft } from "@/lib/client/store";
import type { LanguageId } from "@/lib/languages";

export type SaveResult = { ok: true; where: "local" | "account" } | { ok: false; error: string };

interface Options {
  /** chave dos rascunhos no localStorage (slug do desafio, ou "playground") */
  slug: string;
  templates: Partial<Record<LanguageId, string>>;
  /** com login: rascunhos que vieram da conta e o endpoint que os salva */
  account: { drafts: Partial<Record<LanguageId, string>>; endpoint: string } | null;
}

export class DraftBook {
  private readonly slug: string;
  private readonly templates: Partial<Record<LanguageId, string>>;
  private readonly account: Options["account"];
  /** texto atual de cada linguagem já aberta nesta página */
  private readonly code = new Map<LanguageId, string>();
  /** com login: último valor enviado à conta por linguagem (null = sem rascunho) */
  private readonly sent = new Map<LanguageId, string | null>();
  private readonly queue = new Map<LanguageId, Promise<SaveResult>>();

  constructor(o: Options) {
    this.slug = o.slug;
    this.templates = o.templates;
    this.account = o.account;
    if (o.account) {
      for (const l of Object.keys(o.templates) as LanguageId[]) this.sent.set(l, o.account.drafts[l] ?? null);
    }
  }

  template(lang: LanguageId): string {
    return this.templates[lang] ?? "";
  }

  /** O que mostrar ao abrir `lang`: o desta página, senão o rascunho salvo, senão o template. */
  open(lang: LanguageId): { code: string; restored: boolean } {
    const mem = this.code.get(lang);
    if (mem !== undefined) return { code: mem, restored: false };
    const stored = this.account
      ? // logado: o que não chegou na conta > conta > rascunho deste navegador de antes do login
        (loadDraft(this.slug, lang, "pending") ?? this.account.drafts[lang] ?? loadDraft(this.slug, lang))
      : loadDraft(this.slug, lang);
    const tpl = this.template(lang);
    const code = stored ?? tpl;
    this.code.set(lang, code);
    return { code, restored: stored !== null && stored !== tpl };
  }

  /** Guarda `code` como o texto de `lang` e persiste. */
  save(lang: LanguageId, code: string): Promise<SaveResult> {
    this.code.set(lang, code);
    const draft = code === this.template(lang) ? null : code;

    if (!this.account) {
      if (draft === null) {
        clearDraft(this.slug, lang);
        return Promise.resolve({ ok: true, where: "local" });
      }
      return Promise.resolve(
        saveDraft(this.slug, lang, draft) ? { ok: true, where: "local" } : { ok: false, error: "não deu para salvar neste navegador" },
      );
    }

    // Com login, o rascunho de antes do login já foi substituído pelo da conta.
    clearDraft(this.slug, lang);
    if (this.sent.has(lang) && this.sent.get(lang) === draft) {
      return this.queue.get(lang) ?? Promise.resolve({ ok: true, where: "account" });
    }
    this.sent.set(lang, draft);
    if (draft === null) clearDraft(this.slug, lang, "pending");
    else saveDraft(this.slug, lang, draft, "pending");

    const { endpoint } = this.account;
    const request = () =>
      draft === null
        ? fetch(`${endpoint}?language=${lang}`, { method: "DELETE", keepalive: true })
        : // keepalive: o save do :q sobrevive à troca de página (o navegador limita o corpo a 64 KB)
          fetch(endpoint, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ language: lang, code: draft }),
            keepalive: draft.length < 60_000,
          });

    const prev = this.queue.get(lang) ?? Promise.resolve<SaveResult>({ ok: true, where: "account" });
    const job = prev
      .then(request)
      .then(async (r): Promise<SaveResult> => {
        if (!r.ok) {
          const error = (await r.json().catch(() => ({}))).error ?? r.status;
          return this.failed(lang, `não salvou na conta (${error})`);
        }
        if (draft !== null && loadDraft(this.slug, lang, "pending") === draft) clearDraft(this.slug, lang, "pending");
        return { ok: true, where: "account" };
      })
      .catch(() => this.failed(lang, "sem conexão"));
    this.queue.set(lang, job);
    return job;
  }

  /** Volta `lang` ao template (apaga o rascunho). */
  reset(lang: LanguageId): Promise<SaveResult> {
    return this.save(lang, this.template(lang));
  }

  private failed(lang: LanguageId, error: string): SaveResult {
    this.sent.delete(lang); // o próximo save tenta de novo, mesmo sem mudança
    const kept = loadDraft(this.slug, lang, "pending") !== null;
    return { ok: false, error: kept ? `${error}; guardado só neste navegador` : error };
  }
}
