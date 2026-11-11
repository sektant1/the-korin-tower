#include <stdio.h>
#include <stdlib.h>

typedef struct { long long a, b; } Intervalo;

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    Intervalo *v = malloc(sizeof(Intervalo) * n);
    for (int i = 0; i < n; i++) if (scanf("%lld %lld", &v[i].a, &v[i].b) != 2) return 1;

    /* TODO: ordene por a, funda e imprima "a b" por linha */

    free(v);
    return 0;
}
