import sys


def longest(s):
    last = {}
    best = start = 0
    for j, ch in enumerate(s):
        if last.get(ch, -1) >= start:
            start = last[ch] + 1
        last[ch] = j
        if j - start + 1 > best:
            best = j - start + 1
    return best


def main():
    data = sys.stdin.buffer.read().split()
    t = int(data[0])
    print("\n".join(str(longest(s)) for s in data[1 : 1 + t]))


main()
