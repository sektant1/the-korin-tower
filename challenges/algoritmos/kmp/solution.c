#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static char p[200005], t[200005];
static int f[200005];

int main(void) {
    if (scanf("%200004s %200004s", p, t) != 2) return 1;
    int m = strlen(p), n = strlen(t);
    for (int i = 1, k = 0; i < m; i++) {
        while (k > 0 && p[i] != p[k]) k = f[k - 1];
        if (p[i] == p[k]) k++;
        f[i] = k;
    }
    int found = 0;
    for (int i = 0, k = 0; i < n; i++) {
        while (k > 0 && t[i] != p[k]) k = f[k - 1];
        if (t[i] == p[k]) k++;
        if (k == m) { printf("%d\n", i - m + 1); found = 1; k = f[k - 1]; }
    }
    if (!found) puts("nenhuma");
    return 0;
}
