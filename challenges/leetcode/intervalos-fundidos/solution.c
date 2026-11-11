#include <stdio.h>
#include <stdlib.h>

typedef struct { long long a, b; } Intervalo;
static int cmp(const void *x, const void *y) {
    long long a = ((const Intervalo *)x)->a, b = ((const Intervalo *)y)->a;
    return (a > b) - (a < b);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    Intervalo *v = malloc(sizeof(Intervalo) * n);
    for (int i = 0; i < n; i++) if (scanf("%lld %lld", &v[i].a, &v[i].b) != 2) return 1;
    qsort(v, n, sizeof(Intervalo), cmp);
    Intervalo atual = v[0];
    for (int i = 1; i < n; i++) {
        if (v[i].a <= atual.b) {
            if (v[i].b > atual.b) atual.b = v[i].b;
        } else {
            printf("%lld %lld\n", atual.a, atual.b);
            atual = v[i];
        }
    }
    printf("%lld %lld\n", atual.a, atual.b);
    free(v);
    return 0;
}
