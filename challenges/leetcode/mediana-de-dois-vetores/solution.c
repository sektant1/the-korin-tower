#include <stdio.h>
#include <stdlib.h>

/* Merge até o meio: O(N + M). A versão O(log) está em solution.cpp. */
int main(void) {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 1;
    int *a = malloc(sizeof(int) * (n + 1));
    int *b = malloc(sizeof(int) * (m + 1));
    for (int i = 0; i < n; i++) if (scanf("%d", &a[i]) != 1) return 1;
    for (int i = 0; i < m; i++) if (scanf("%d", &b[i]) != 1) return 1;
    int total = n + m, i = 0, j = 0, ant = 0, cur = 0;
    for (int k = 0; k <= total / 2; k++) {
        ant = cur;
        if (i < n && (j >= m || a[i] <= b[j])) cur = a[i++];
        else cur = b[j++];
    }
    double mediana = total % 2 ? cur : (ant + cur) / 2.0;
    printf("%.1f\n", mediana);
    free(a);
    free(b);
    return 0;
}
