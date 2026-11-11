# korin

CLI da [Korin Tower](https://the-korin-tower.vercel.app): baixe desafios, teste e envie do seu terminal, no estilo das CLIs do LeetCode.

```bash
# Linux / macOS
curl -fsSL https://the-korin-tower.vercel.app/install.sh | bash
# Windows (PowerShell)
irm https://the-korin-tower.vercel.app/install.ps1 | iex

korin login           # token gerado em /conta
korin status          # seu andar na torre
korin next --pick     # baixa o próximo desafio
cd fizzbuzz && vim main.c
korin test --local    # testes públicos com o gcc da sua máquina
korin submit          # todos os testes, no servidor; pontua
```

`korin help` lista tudo. O desenho está em `docs/fase-6.md` no repositório.
