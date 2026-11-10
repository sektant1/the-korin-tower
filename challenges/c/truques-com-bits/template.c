#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>

static int popcount(uint64_t n) {
    // TODO
    (void)n;
    return 0;
}

static int msb(uint64_t n) {
    // TODO: posição do bit 1 mais alto, ou -1 se n == 0
    (void)n;
    return -1;
}

static int potencia_de_2(uint64_t n) {
    // TODO
    (void)n;
    return 0;
}

static uint64_t gray(uint64_t n) {
    // TODO
    return n;
}

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
