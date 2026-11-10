#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>

static int popcount(uint64_t n) {
    int c = 0;
    for (; n; n &= n - 1) c++; // Kernighan: apaga o bit 1 mais baixo
    return c;
}

static int msb(uint64_t n) {
    int p = -1;
    for (; n; n >>= 1) p++;
    return p;
}

static int potencia_de_2(uint64_t n) { return n != 0 && (n & (n - 1)) == 0; }

static uint64_t gray(uint64_t n) { return n ^ (n >> 1); }

int main(void) {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        uint64_t n;
        if (scanf("%" SCNu64, &n) != 1) break;
        printf("%d %d %s %" PRIu64 "\n", popcount(n), msb(n), potencia_de_2(n) ? "sim" : "nao", gray(n));
    }
    return 0;
}
