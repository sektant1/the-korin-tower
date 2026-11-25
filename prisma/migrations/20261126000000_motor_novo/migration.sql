-- Motor de execução novo (src/lib/runner): driver oculto por linguagem,
-- anexado ao código do jogador (desafios em que ele escreve só uma função).
ALTER TABLE "Challenge" ADD COLUMN "drivers" JSONB NOT NULL DEFAULT '{}';
