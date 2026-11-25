import sys


def main():
    linhas = palavras = total = 0
    dentro = False
    # Em blocos de 64 KB: memória constante, como o wc de verdade.
    while chunk := sys.stdin.buffer.read(65536):
        total += len(chunk)
        linhas += chunk.count(b"\n")
        palavras += len(chunk.split())
        # palavra cortada entre dois blocos foi contada duas vezes
        if dentro and not chunk[:1].isspace():
            palavras -= 1
        dentro = not chunk[-1:].isspace()
    print(linhas, palavras, total)


main()
