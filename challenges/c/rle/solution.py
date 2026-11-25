import sys
from itertools import groupby


def main():
    out = []
    for line in sys.stdin.read().split("\n"):
        out.append("".join(f"{len(list(g))}{ch}" for ch, g in groupby(line.rstrip("\r"))))
    # split("\n") gera uma linha vazia extra depois do último \n
    if out and out[-1] == "":
        out.pop()
    print("\n".join(out))


main()
