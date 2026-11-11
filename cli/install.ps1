# Instala a CLI korin no Windows:  irm __KORIN_URL__/install.ps1 | iex
# Um arquivo Node, sem dependências. Precisa do Node 22.7 ou mais novo.
$ErrorActionPreference = "Stop"
$Url = if ($env:KORIN_URL) { $env:KORIN_URL } else { "__KORIN_URL__" }
$Dir = if ($env:KORIN_BIN) { $env:KORIN_BIN } else { Join-Path $env:LOCALAPPDATA "korin" }

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "Node.js não encontrado. A CLI precisa do Node 22.7 ou mais novo: https://nodejs.org (ou: winget install OpenJS.NodeJS.LTS)"
  exit 1
}
$ver = (& node -v).TrimStart("v").Split(".")
if ([int]$ver[0] -lt 22 -or ([int]$ver[0] -eq 22 -and [int]$ver[1] -lt 7)) {
  Write-Host "Node $(& node -v) é antigo demais; precisa de 22.7+ (https://nodejs.org)"
  exit 1
}

New-Item -ItemType Directory -Force -Path $Dir | Out-Null
$mjs = Join-Path $Dir "korin.mjs"
Invoke-WebRequest -UseBasicParsing "$Url/cli/korin.mjs" -OutFile $mjs
if (-not (Get-Content $mjs -TotalCount 1).StartsWith("#!/usr/bin/env node")) { Write-Host "o arquivo baixado não parece a CLI"; exit 1 }
# atalho korin.cmd no mesmo diretório
Set-Content -Path (Join-Path $Dir "korin.cmd") -Value "@echo off`r`nnode `"%~dp0korin.mjs`" %*" -Encoding ASCII

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (($userPath -split ";") -notcontains $Dir) {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$Dir", "User")
  $env:Path = "$env:Path;$Dir"
  Write-Host "✔ $Dir adicionado ao PATH do usuário (abra um terminal novo se o comando não for achado)"
}
if ($Url -ne "https://the-korin-tower.vercel.app") { & node $mjs config "url=$Url" | Out-Null }
$version = (Select-String -Path $mjs -Pattern 'const VERSION = "([^"]+)"').Matches[0].Groups[1].Value
Write-Host "✔ korin $version instalada em $Dir"
Write-Host ""
Write-Host "Agora:"
Write-Host "  korin login          # token gerado em $Url/conta"
Write-Host "  korin next --pick    # baixa o próximo desafio da torre"
