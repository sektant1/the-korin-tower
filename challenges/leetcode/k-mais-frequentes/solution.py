import sys
from collections import Counter


def main():
    data = sys.stdin.buffer.read().split()
    n, k = int(data[0]), int(data[1])
    counts = Counter(map(int, data[2 : 2 + n]))
    top = sorted(counts.items(), key=lambda vc: (-vc[1], vc[0]))[:k]
    print("\n".join(f"{v} {c}" for v, c in top))


main()
