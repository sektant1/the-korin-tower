import sys


def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    it = iter(map(int, data[1 : 1 + 2 * n]))
    intervals = sorted(zip(it, it))
    out = []
    a, b = intervals[0]
    for x, y in intervals[1:]:
        if x <= b:
            b = max(b, y)
        else:
            out.append(f"{a} {b}")
            a, b = x, y
    out.append(f"{a} {b}")
    print("\n".join(out))


main()
