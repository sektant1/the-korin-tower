import sys
from bisect import bisect_left


def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    v = list(map(int, data[1 : 1 + n]))
    q = int(data[1 + n])
    out = []
    for x in map(int, data[2 + n : 2 + n + q]):
        i = bisect_left(v, x)
        out.append(i if i < n and v[i] == x else -1)
    print("\n".join(map(str, out)))


main()
