#include <stdio.h>
#include <stdlib.h>

typedef struct { long long v; int c; } Item;
static int cmp_ll(const void *x, const void *y) {
    long long a = *(const long long *)x, b = *(const long long *)y;
    return (a > b) - (a < b);
}
static int cmp_item(const void *x, const void *y) {
    const Item *a = x, *b = y;
    if (a->c != b->c) return b->c - a->c;
    return (a->v > b->v) - (a->v < b->v);
}

int main(void) {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 1;
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) if (scanf("%lld", &a[i]) != 1) return 1;
    qsort(a, n, sizeof(long long), cmp_ll);
    Item *itens = malloc(sizeof(Item) * n);
    int m = 0;
    for (int i = 0; i < n; i++) {
        if (m && itens[m - 1].v == a[i]) itens[m - 1].c++;
        else { itens[m].v = a[i]; itens[m].c = 1; m++; }
    }
    qsort(itens, m, sizeof(Item), cmp_item);
    for (int i = 0; i < k && i < m; i++) printf("%lld %d\n", itens[i].v, itens[i].c);
    free(itens);
    free(a);
    return 0;
}
