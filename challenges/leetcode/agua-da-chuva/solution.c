#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    int *h = malloc(sizeof(int) * n);
    for (int i = 0; i < n; i++) if (scanf("%d", &h[i]) != 1) return 1;
    long long total = 0;
    int l = 0, r = n - 1, maxl = 0, maxr = 0;
    while (l < r) {
        if (h[l] < h[r]) {
            if (h[l] > maxl) maxl = h[l]; else total += maxl - h[l];
            l++;
        } else {
            if (h[r] > maxr) maxr = h[r]; else total += maxr - h[r];
            r--;
        }
    }
    printf("%lld\n", total);
    free(h);
    return 0;
}
