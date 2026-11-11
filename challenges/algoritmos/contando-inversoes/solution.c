#include <stdio.h>
#include <stdlib.h>

static int *tmp;

static long long sort_count(int *v, int lo, int hi) { /* [lo, hi) */
    if (hi - lo <= 1) return 0;
    int mid = lo + (hi - lo) / 2;
    long long c = sort_count(v, lo, mid) + sort_count(v, mid, hi);
    int i = lo, j = mid, k = lo;
    while (i < mid && j < hi) {
        if (v[i] <= v[j]) tmp[k++] = v[i++];
        else { tmp[k++] = v[j++]; c += mid - i; }
    }
    while (i < mid) tmp[k++] = v[i++];
    while (j < hi) tmp[k++] = v[j++];
    for (k = lo; k < hi; k++) v[k] = tmp[k];
    return c;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    int *v = malloc(sizeof(int) * n);
    tmp = malloc(sizeof(int) * n);
    for (int i = 0; i < n; i++) scanf("%d", &v[i]);
    printf("%lld\n", sort_count(v, 0, n));
    return 0;
}
