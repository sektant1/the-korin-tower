#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

#define INF INT64_MAX

typedef struct {
    int64_t d;
    int v;
} Entry;

/* Min-heap binário num vetor (cresce com realloc). */
static Entry *heap;
static size_t hsize, hcap;

static void push(int64_t d, int v) {
    if (hsize == hcap) {
        hcap = hcap ? hcap * 2 : 1024;
        heap = realloc(heap, sizeof(Entry) * hcap);
        if (!heap) abort();
    }
    size_t i = hsize++;
    while (i > 0) {
        size_t p = (i - 1) / 2;
        if (heap[p].d <= d) break;
        heap[i] = heap[p];
        i = p;
    }
    heap[i] = (Entry){d, v};
}

static Entry pop(void) {
    Entry top = heap[0], last = heap[--hsize];
    size_t i = 0;
    for (;;) {
        size_t c = 2 * i + 1;
        if (c >= hsize) break;
        if (c + 1 < hsize && heap[c + 1].d < heap[c].d) c++;
        if (heap[c].d >= last.d) break;
        heap[i] = heap[c];
        i = c;
    }
    if (hsize > 0) heap[i] = last;
    return top;
}

int main(void) {
    int n, m, s;
    if (scanf("%d %d %d", &n, &m, &s) != 3) return 0;

    int *eu = malloc(sizeof(int) * (size_t)(m + 1));
    int *ev = malloc(sizeof(int) * (size_t)(m + 1));
    int64_t *ew = malloc(sizeof(int64_t) * (size_t)(m + 1));
    for (int i = 0; i < m; i++) scanf("%d %d %" SCNd64, &eu[i], &ev[i], &ew[i]);

    /* CSR: arestas de u ficam em to[start[u] .. start[u+1]) */
    int *start = calloc((size_t)n + 2, sizeof(int));
    for (int i = 0; i < m; i++) start[eu[i] + 1]++;
    for (int u = 1; u <= n + 1; u++) start[u] += start[u - 1];
    int *fill = malloc(sizeof(int) * (size_t)(n + 2));
    for (int u = 0; u <= n + 1; u++) fill[u] = start[u];
    int *to = malloc(sizeof(int) * (size_t)(m + 1));
    int64_t *wt = malloc(sizeof(int64_t) * (size_t)(m + 1));
    for (int i = 0; i < m; i++) {
        int k = fill[eu[i]]++;
        to[k] = ev[i];
        wt[k] = ew[i];
    }

    int64_t *dist = malloc(sizeof(int64_t) * (size_t)(n + 1));
    for (int i = 1; i <= n; i++) dist[i] = INF;
    dist[s] = 0;
    push(0, s);
    while (hsize > 0) {
        Entry e = pop();
        if (e.d > dist[e.v]) continue; // entrada velha
        for (int k = start[e.v]; k < start[e.v + 1]; k++) {
            int64_t nd = e.d + wt[k];
            if (nd < dist[to[k]]) {
                dist[to[k]] = nd;
                push(nd, to[k]);
            }
        }
    }

    for (int i = 1; i <= n; i++) {
        if (dist[i] == INF) puts("-1");
        else printf("%" PRId64 "\n", dist[i]);
    }
    return 0;
}
