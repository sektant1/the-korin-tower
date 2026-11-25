import sys


def main():
    n = int(sys.stdin.readline())
    composite = bytearray(n + 1)
    i = 2
    while i * i <= n:
        if not composite[i]:
            composite[i * i :: i] = b"\x01" * len(range(i * i, n + 1, i))
        i += 1
    print("\n".join(str(i) for i in range(2, n + 1) if not composite[i]))


main()
