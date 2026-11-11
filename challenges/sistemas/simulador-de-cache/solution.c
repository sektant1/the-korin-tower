#include <stdio.h>
#include <stdlib.h>

typedef struct { int valid; unsigned tag; long stamp; } Way;

int main(void) {
    unsigned S, B, A;
    if (scanf("%u %u %u", &S, &B, &A) != 3) return 1;
    unsigned sets = S / (B * A);
    Way *w = calloc((size_t)sets * A, sizeof(Way));
    long hits = 0, misses = 0, clock = 0;
    unsigned addr;
    while (scanf("%x", &addr) == 1) {
        clock++;
        unsigned blk = addr / B, idx = blk % sets, tag = blk / sets;
        Way *set = w + (size_t)idx * A;
        int found = -1, victim = 0;
        for (unsigned i = 0; i < A; i++) {
            if (set[i].valid && set[i].tag == tag) { found = i; break; }
            if (!set[i].valid) { victim = i; break; }
            if (set[i].stamp < set[victim].stamp) victim = i;
        }
        if (found >= 0) { hits++; set[found].stamp = clock; }
        else { misses++; set[victim].valid = 1; set[victim].tag = tag; set[victim].stamp = clock; }
    }
    printf("hits: %ld\nmisses: %ld\n", hits, misses);
    return 0;
}
