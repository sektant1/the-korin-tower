#include <stdio.h>
#include <string.h>

static char g[9][10];
static int rows[9], cols[9], boxes[9];

static int box(int r, int c) { return (r / 3) * 3 + c / 3; }

static int solve(void) {
    int br = -1, bc = -1, bestn = 10;
    for (int r = 0; r < 9; r++)
        for (int c = 0; c < 9; c++)
            if (g[r][c] == '.') {
                int used = rows[r] | cols[c] | boxes[box(r, c)];
                int n = 0;
                for (int d = 1; d <= 9; d++) if (!(used & (1 << d))) n++;
                if (n == 0) return 0;
                if (n < bestn) { bestn = n; br = r; bc = c; }
            }
    if (br < 0) return 1;
    int b = box(br, bc);
    for (int d = 1; d <= 9; d++) {
        int bit = 1 << d;
        if ((rows[br] | cols[bc] | boxes[b]) & bit) continue;
        g[br][bc] = '0' + d; rows[br] |= bit; cols[bc] |= bit; boxes[b] |= bit;
        if (solve()) return 1;
        g[br][bc] = '.'; rows[br] &= ~bit; cols[bc] &= ~bit; boxes[b] &= ~bit;
    }
    return 0;
}

int main(void) {
    for (int r = 0; r < 9; r++) if (scanf("%9s", g[r]) != 1) return 1;
    for (int r = 0; r < 9; r++)
        for (int c = 0; c < 9; c++)
            if (g[r][c] != '.') {
                int bit = 1 << (g[r][c] - '0');
                if ((rows[r] | cols[c] | boxes[box(r, c)]) & bit) { puts("impossivel"); return 0; }
                rows[r] |= bit; cols[c] |= bit; boxes[box(r, c)] |= bit;
            }
    if (!solve()) { puts("impossivel"); return 0; }
    for (int r = 0; r < 9; r++) puts(g[r]);
    return 0;
}
