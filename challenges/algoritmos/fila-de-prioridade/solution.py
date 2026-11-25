import sys


class MinHeap:
    """Min-heap binário num vetor (sem heapq: a graça é escrever)."""

    def __init__(self):
        self.h = []

    def push(self, x):
        h = self.h
        h.append(x)
        i = len(h) - 1
        while i > 0:
            p = (i - 1) // 2
            if h[p] <= x:
                break
            h[i] = h[p]
            i = p
        h[i] = x

    def pop(self):
        h = self.h
        top = h[0]
        last = h.pop()
        n = len(h)
        if n:
            i = 0
            while True:
                c = 2 * i + 1
                if c >= n:
                    break
                if c + 1 < n and h[c + 1] < h[c]:
                    c += 1
                if h[c] >= last:
                    break
                h[i] = h[c]
                i = c
            h[i] = last
        return top

    def __len__(self):
        return len(self.h)


def main():
    data = sys.stdin.buffer.read().split()
    q = int(data[0])
    heap = MinHeap()
    out = []
    k = 1
    for _ in range(q):
        op = data[k]
        k += 1
        if op == b"push":
            heap.push(int(data[k]))
            k += 1
        elif op == b"pop":
            out.append(str(heap.pop()) if len(heap) else "vazia")
        else:
            out.append(str(heap.h[0]) if len(heap) else "vazia")
    print("\n".join(out))


main()
