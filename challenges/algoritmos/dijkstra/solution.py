import sys
from heapq import heappop, heappush


def main():
    data = sys.stdin.buffer.read().split()
    n, m, s = int(data[0]), int(data[1]), int(data[2])
    adj = [[] for _ in range(n + 1)]
    k = 3
    for _ in range(m):
        u, v, w = int(data[k]), int(data[k + 1]), int(data[k + 2])
        adj[u].append((v, w))
        k += 3
    inf = float("inf")
    dist = [inf] * (n + 1)
    dist[s] = 0
    heap = [(0, s)]
    while heap:
        d, u = heappop(heap)
        if d > dist[u]:
            continue  # entrada velha
        for v, w in adj[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heappush(heap, (nd, v))
    print("\n".join(str(d) if d != inf else "-1" for d in dist[1:]))


main()
