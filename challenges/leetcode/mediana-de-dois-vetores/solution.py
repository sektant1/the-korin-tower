import sys


def median(a, b):
    """Busca binária na partição do menor vetor: O(log min(N, M))."""
    if len(a) > len(b):
        a, b = b, a
    n, m = len(a), len(b)
    half = (n + m + 1) // 2
    lo, hi = 0, n
    inf = float("inf")
    while True:
        i = (lo + hi) // 2  # quantos de A ficam na metade esquerda
        j = half - i
        a_left = a[i - 1] if i > 0 else -inf
        a_right = a[i] if i < n else inf
        b_left = b[j - 1] if j > 0 else -inf
        b_right = b[j] if j < m else inf
        if a_left <= b_right and b_left <= a_right:
            left = max(a_left, b_left)
            if (n + m) % 2:
                return float(left)
            return (left + min(a_right, b_right)) / 2
        if a_left > b_right:
            hi = i - 1
        else:
            lo = i + 1


def main():
    lines = sys.stdin.read().split("\n")
    n, m = map(int, lines[0].split())
    a = list(map(int, lines[1].split())) if n else []
    b = list(map(int, lines[2].split())) if m else []
    print(f"{median(a, b):.1f}")


main()
