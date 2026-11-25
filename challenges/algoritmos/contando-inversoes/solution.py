import sys


def sort_count(v):
    """Merge sort iterativo (sem recursão) que conta as inversões no caminho."""
    n = len(v)
    count = 0
    width = 1
    src = v
    while width < n:
        dst = []
        for lo in range(0, n, 2 * width):
            mid = min(lo + width, n)
            hi = min(lo + 2 * width, n)
            i, j = lo, mid
            while i < mid and j < hi:
                if src[i] <= src[j]:
                    dst.append(src[i])
                    i += 1
                else:
                    dst.append(src[j])
                    count += mid - i
                    j += 1
            dst.extend(src[i:mid])
            dst.extend(src[j:hi])
        src = dst
        width *= 2
    return count


def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    print(sort_count(list(map(int, data[1 : 1 + n]))))


main()
