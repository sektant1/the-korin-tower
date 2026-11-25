import sys


def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    nums = list(map(int, data[1 : 1 + n]))
    target = int(data[1 + n])
    seen = {}
    for i, x in enumerate(nums):
        j = seen.get(target - x)
        if j is not None:
            print(j, i)
            return
        seen.setdefault(x, i)


main()
