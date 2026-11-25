import sys
from collections import Counter
from heapq import heapify, heappop, heappush


def main():
    text = sys.stdin.readline().rstrip("\r\n")
    heap = list(Counter(text).values())
    if len(heap) == 1:
        print(len(text))  # um símbolo só: 1 bit cada
        return
    heapify(heap)
    total = 0
    while len(heap) > 1:
        merged = heappop(heap) + heappop(heap)
        total += merged
        heappush(heap, merged)
    print(total)


main()
