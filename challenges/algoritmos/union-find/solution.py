import sys


def main():
    data = sys.stdin.buffer.read().split()
    n, m = int(data[0]), int(data[1])
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]  # compressão pela metade
            x = parent[x]
        return x

    k = 2
    for _ in range(m):
        parent[find(int(data[k]))] = find(int(data[k + 1]))
        k += 2
    q = int(data[k])
    k += 1
    out = []
    for _ in range(q):
        out.append("sim" if find(int(data[k])) == find(int(data[k + 1])) else "nao")
        k += 2
    print("\n".join(out))


main()
