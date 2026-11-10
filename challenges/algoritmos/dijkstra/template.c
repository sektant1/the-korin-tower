#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

#define INF INT64_MAX

int main(void) {
    int n, m, s;
    if (scanf("%d %d %d", &n, &m, &s) != 3) return 0;

    int *eu = malloc(sizeof(int) * (size_t)(m + 1));
    int *ev = malloc(sizeof(int) * (size_t)(m + 1));
    int64_t *ew = malloc(sizeof(int64_t) * (size_t)(m + 1));
    for (int i = 0; i < m; i++) scanf("%d %d %" SCNd64, &eu[i], &ev[i], &ew[i]);

    int64_t *dist = malloc(sizeof(int64_t) * (size_t)(n + 1));
    for (int i = 1; i <= n; i++) dist[i] = INF;

    // TODO: monte a lista de adjacência (dica: CSR) e rode Dijkstra com um heap binário.

    for (int i = 1; i <= n; i++) {
        if (dist[i] == INF) puts("-1");
        else printf("%" PRId64 "\n", dist[i]);
    }
    return 0;
}
