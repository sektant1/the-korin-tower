import sys

DIGITS = "0123456789ABCDEF"


def to_base(n, b):
    if n == 0:
        return "0"
    out = []
    while n:
        n, r = divmod(n, b)
        out.append(DIGITS[r])
    return "".join(reversed(out))


def main():
    data = sys.stdin.read().split()
    pairs = zip(data[0::2], data[1::2])
    print("\n".join(to_base(int(n), int(b)) for n, b in pairs))


main()
