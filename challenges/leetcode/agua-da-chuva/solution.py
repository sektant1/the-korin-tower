import sys


def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    h = list(map(int, data[1 : 1 + n]))
    total = 0
    l, r = 0, n - 1
    max_l = max_r = 0
    while l < r:
        if h[l] < h[r]:
            if h[l] > max_l:
                max_l = h[l]
            else:
                total += max_l - h[l]
            l += 1
        else:
            if h[r] > max_r:
                max_r = h[r]
            else:
                total += max_r - h[r]
            r -= 1
    print(total)


main()
