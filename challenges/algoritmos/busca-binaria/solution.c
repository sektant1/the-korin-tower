#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    int *v = malloc(sizeof(int) * n);
    for (int i = 0; i < n; i++) scanf("%d", &v[i]);
    int q;
    scanf("%d", &q);
    while (q-- > 0) {
        int x;
        scanf("%d", &x);
        int lo = 0, hi = n; /* resposta em [lo, hi) */
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (v[mid] < x) lo = mid + 1;
            else hi = mid;
        }
        printf("%d\n", lo < n && v[lo] == x ? lo : -1);
    }
    free(v);
    return 0;
}
