---
title: "Código de Huffman"
difficulty: 5
tags: [compressao, heap, arvore, guloso]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 64
order: 7
hints:
  - "Conte a frequência de cada caractere. Depois, repetidamente, junte os dois nós menos frequentes num nó pai com a soma; o pai volta para o conjunto."
  - "O custo total é a soma das frequências de todos os nós internos criados: cada junção `a + b` adiciona `a + b` bits ao total. Não precisa montar os códigos."
  - "São no máximo 95 símbolos: um vetor e uma busca linear pelo menor funcionam. Um heap fica mais elegante, mas é opcional."
  - "Texto com um único símbolo distinto não tem junção nenhuma: por convenção, cada ocorrência custa 1 bit."
---

ZIP, PNG, JPEG, MP3: todos terminam com Huffman. A ideia de 1952 é simples e ótima: símbolos frequentes ganham códigos curtos, raros ganham códigos longos, e nenhum código é prefixo de outro.

## Tarefa

Dado um texto, calcule quantos bits ele ocupa codificado com um código de Huffman ótimo. Não importa como você desempata: o total é o mesmo para qualquer código ótimo.

Se o texto tem um único símbolo distinto, cada ocorrência custa 1 bit.

## Entrada

Uma linha com o texto, de 1 a $10^5$ caracteres ASCII imprimíveis (inclui espaço). A quebra de linha final não faz parte do texto.

## Saída

Um inteiro: o total de bits.

## Exemplo

Entrada:

```
abracadabra
```

Saída:

```
23
```

Frequências: `a` 5, `b` 2, `r` 2, `c` 1, `d` 1. Um código ótimo usa 1 bit para `a`, 3 para `b` e `r`, e 3 ou 4 para `c` e `d`: $5 \cdot 1 + 2 \cdot 3 + 2 \cdot 3 + 1 \cdot 3 + 1 \cdot 4 = 23$ (ou qualquer outra divisão que some 23).
