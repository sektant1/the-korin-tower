#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static long long *h;
static int n;

static void swap(int a, int b) { long long t = h[a]; h[a] = h[b]; h[b] = t; }

static void push(long long x) {
    int i = n++;
    h[i] = x;
    while (i > 0 && h[(i - 1) / 2] > h[i]) { swap(i, (i - 1) / 2); i = (i - 1) / 2; }
}

static long long pop(void) {
    long long top = h[0];
    h[0] = h[--n];
    int i = 0;
    for (;;) {
        int l = 2 * i + 1, r = l + 1, m = i;
        if (l < n && h[l] < h[m]) m = l;
        if (r < n && h[r] < h[m]) m = r;
        if (m == i) break;
        swap(i, m);
        i = m;
    }
    return top;
}

int main(void) {
    int q;
    if (scanf("%d", &q) != 1) return 1;
    h = malloc(sizeof(long long) * (q + 1));
    char op[8];
    while (q-- > 0) {
        scanf("%7s", op);
        if (strcmp(op, "push") == 0) { long long x; scanf("%lld", &x); push(x); }
        else if (strcmp(op, "pop") == 0) { if (n) printf("%lld\n", pop()); else puts("vazia"); }
        else { if (n) printf("%lld\n", h[0]); else puts("vazia"); }
    }
    return 0;
}
