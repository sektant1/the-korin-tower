#include <stdio.h>
#include <stdlib.h>

static int *parent;

static int find(int x) {
    while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
}

int main(void) {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 1;
    parent = malloc(sizeof(int) * n);
    for (int i = 0; i < n; i++) parent[i] = i;
    for (int i = 0; i < m; i++) {
        int u, v;
        scanf("%d %d", &u, &v);
        parent[find(u)] = find(v);
    }
    int q;
    scanf("%d", &q);
    while (q-- > 0) {
        int u, v;
        scanf("%d %d", &u, &v);
        puts(find(u) == find(v) ? "sim" : "nao");
    }
    return 0;
}
