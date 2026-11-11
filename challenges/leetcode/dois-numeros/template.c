#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) if (scanf("%lld", &a[i]) != 1) return 1;
    long long alvo;
    if (scanf("%lld", &alvo) != 1) return 1;

    /* TODO: imprima "i j" com i < j e a[i] + a[j] == alvo */

    free(a);
    return 0;
}
