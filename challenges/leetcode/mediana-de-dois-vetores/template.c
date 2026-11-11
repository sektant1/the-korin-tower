#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 1;
    int *a = malloc(sizeof(int) * (n + 1));
    int *b = malloc(sizeof(int) * (m + 1));
    for (int i = 0; i < n; i++) if (scanf("%d", &a[i]) != 1) return 1;
    for (int i = 0; i < m; i++) if (scanf("%d", &b[i]) != 1) return 1;

    double mediana = 0;
    /* TODO */

    printf("%.1f\n", mediana);
    free(a);
    free(b);
    return 0;
}
