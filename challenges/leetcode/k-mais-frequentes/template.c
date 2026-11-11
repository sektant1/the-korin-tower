#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 1;
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) if (scanf("%lld", &a[i]) != 1) return 1;

    /* TODO: imprima "valor contagem" para os k mais frequentes */

    free(a);
    return 0;
}
