import sys


def popcount(n):
    c = 0
    while n:
        n &= n - 1  # Kernighan: apaga o bit 1 mais baixo
        c += 1
    return c


def msb(n):
    p = -1
    while n:
        n >>= 1
        p += 1
    return p


def main():
    data = sys.stdin.buffer.read().split()
    t = int(data[0])
    out = []
    for n in map(int, data[1 : 1 + t]):
        pot = "sim" if n and n & (n - 1) == 0 else "nao"
        out.append(f"{popcount(n)} {msb(n)} {pot} {n ^ (n >> 1)}")
    print("\n".join(out))


main()
