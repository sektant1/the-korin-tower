import sys


def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    refs = []
    k = 1
    for _ in range(n):
        cnt = int(data[k])
        refs.append(data[k + 1 : k + 1 + cnt])
        k += 1 + cnt
    r = int(data[k])
    marked = bytearray(n)
    stack = []
    for x in map(int, data[k + 1 : k + 1 + r]):
        if not marked[x]:
            marked[x] = 1
            stack.append(x)
    # mark: DFS com pilha explícita (sem recursão)
    while stack:
        for y in map(int, refs[stack.pop()]):
            if not marked[y]:
                marked[y] = 1
                stack.append(y)
    # sweep
    dead = [str(i) for i in range(n) if not marked[i]]
    print("\n".join(dead) if dead else "nada")


main()
