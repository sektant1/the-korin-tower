import sys


def main():
    data = sys.stdin.read().split()
    size, block, ways = int(data[0]), int(data[1]), int(data[2])
    n_sets = size // (block * ways)
    # Um dict por conjunto: a ordem de inserção é a ordem de uso (o primeiro é o LRU).
    sets = [{} for _ in range(n_sets)]
    hits = misses = 0
    for tok in data[3:]:
        blk = int(tok, 16) // block
        s = sets[blk % n_sets]
        tag = blk // n_sets
        if tag in s:
            hits += 1
            del s[tag]  # reinserir move para o fim (mais recente)
        else:
            misses += 1
            if len(s) == ways:
                del s[next(iter(s))]
        s[tag] = True
    print(f"hits: {hits}\nmisses: {misses}")


main()
