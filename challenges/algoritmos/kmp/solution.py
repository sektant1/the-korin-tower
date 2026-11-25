import sys


def main():
    p, t = sys.stdin.read().split()[:2]
    m = len(p)
    fail = [0] * m
    k = 0
    for i in range(1, m):
        while k and p[i] != p[k]:
            k = fail[k - 1]
        if p[i] == p[k]:
            k += 1
        fail[i] = k
    out = []
    k = 0
    for i, ch in enumerate(t):
        while k and ch != p[k]:
            k = fail[k - 1]
        if ch == p[k]:
            k += 1
        if k == m:
            out.append(i - m + 1)
            k = fail[k - 1]
    print("\n".join(map(str, out)) if out else "nenhuma")


main()
