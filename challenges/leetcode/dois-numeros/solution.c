#include <stdio.h>
#include <stdlib.h>

typedef struct { long long v; int i; } Par;
static int cmp(const void *x, const void *y) {
    long long a = ((const Par *)x)->v, b = ((const Par *)y)->v;
    return (a > b) - (a < b);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    Par *p = malloc(sizeof(Par) * n);
    for (int i = 0; i < n; i++) { if (scanf("%lld", &p[i].v) != 1) return 1; p[i].i = i; }
    long long alvo;
    if (scanf("%lld", &alvo) != 1) return 1;
    qsort(p, n, sizeof(Par), cmp);
    int lo = 0, hi = n - 1;
    while (lo < hi) {
        long long s = p[lo].v + p[hi].v;
        if (s == alvo) {
            int a = p[lo].i, b = p[hi].i;
            printf("%d %d\n", a < b ? a : b, a < b ? b : a);
            break;
        }
        if (s < alvo) lo++; else hi--;
    }
    free(p);
    return 0;
}
