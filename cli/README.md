# korin

CLI da [Korin Tower](https://the-korin-tower.vercel.app): baixe desafios, teste e envie do seu terminal, no estilo das CLIs do LeetCode.

```bash
# instalação direto do site (um arquivo, sem dependências, Node 22.7+)
curl -fsSL https://the-korin-tower.vercel.app/cli/korin.mjs -o ~/.local/bin/korin && chmod +x ~/.local/bin/korin
# ou, se publicado no npm:
npm i -g korin-cli

korin login --url https://the-korin-tower.vercel.app   # token gerado em /conta
korin list --todo
korin pick dois-numeros -l rust
cd dois-numeros && vim main.rs
korin test --local    # testes públicos com o rustc da sua máquina
korin submit          # todos os testes, no servidor; pontua
```

`korin help` lista tudo. O desenho está em `docs/fase-6.md` no repositório.
