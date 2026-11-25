import sys

ALL = 0x3FE  # bits 1..9


def main():
    grid = [list(line.strip()) for line in sys.stdin.read().split()[:9]]
    rows, cols, boxes = [0] * 9, [0] * 9, [0] * 9
    empty = []
    for r in range(9):
        for c in range(9):
            ch = grid[r][c]
            if ch == ".":
                empty.append((r, c, r // 3 * 3 + c // 3))
                continue
            bit = 1 << int(ch)
            b = r // 3 * 3 + c // 3
            if (rows[r] | cols[c] | boxes[b]) & bit:
                print("impossivel")
                return
            rows[r] |= bit
            cols[c] |= bit
            boxes[b] |= bit

    def solve():
        # Casa com menos candidatos primeiro (MRV): corta a árvore cedo.
        best, best_free, best_n = -1, 0, 10
        for i, (r, c, b) in enumerate(empty):
            if grid[r][c] != ".":
                continue
            free = ALL & ~(rows[r] | cols[c] | boxes[b])
            n = bin(free).count("1")
            if n == 0:
                return False
            if n < best_n:
                best, best_free, best_n = i, free, n
                if n == 1:
                    break
        if best < 0:
            return True
        r, c, b = empty[best]
        while best_free:
            bit = best_free & -best_free
            best_free ^= bit
            grid[r][c] = str(bit.bit_length() - 1)
            rows[r] |= bit
            cols[c] |= bit
            boxes[b] |= bit
            if solve():
                return True
            rows[r] ^= bit
            cols[c] ^= bit
            boxes[b] ^= bit
        grid[r][c] = "."
        return False

    if not solve():
        print("impossivel")
        return
    print("\n".join("".join(row) for row in grid))


main()
