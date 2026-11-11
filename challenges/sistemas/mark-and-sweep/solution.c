#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    int *start = malloc(sizeof(int) * (n + 1));
    int cap = 1024, m = 0;
    int *adj = malloc(sizeof(int) * cap);
    for (int i = 0; i < n; i++) {
        int k;
        scanf("%d", &k);
        start[i] = m;
        for (int j = 0; j < k; j++) {
            if (m == cap) { cap *= 2; adj = realloc(adj, sizeof(int) * cap); }
            scanf("%d", &adj[m++]);
        }
    }
    start[n] = m;
    char *marked = calloc(n, 1);
    int *stack = malloc(sizeof(int) * (n + 1));
    int sp = 0, r;
    scanf("%d", &r);
    for (int i = 0; i < r; i++) {
        int x;
        scanf("%d", &x);
        if (!marked[x]) { marked[x] = 1; stack[sp++] = x; }
    }
    while (sp > 0) {
        int x = stack[--sp];
        for (int j = start[x]; j < start[x + 1]; j++) {
            int y = adj[j];
            if (!marked[y]) { marked[y] = 1; stack[sp++] = y; }
        }
    }
    int dead = 0;
    for (int i = 0; i < n; i++)
        if (!marked[i]) { printf("%d\n", i); dead++; }
    if (!dead) puts("nada");
    return 0;
}
