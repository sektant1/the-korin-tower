#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    int *h = malloc(sizeof(int) * n);
    for (int i = 0; i < n; i++) if (scanf("%d", &h[i]) != 1) return 1;

    long long total = 0;
    /* TODO */

    printf("%lld\n", total);
    free(h);
    return 0;
}
