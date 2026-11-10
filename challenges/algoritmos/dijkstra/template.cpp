#include <functional>
#include <iostream>
#include <limits>
#include <queue>
#include <utility>
#include <vector>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int n, m, s;
    std::cin >> n >> m >> s;
    std::vector<std::vector<std::pair<int, long long>>> adj(n + 1); // adj[u] = {(v, w)}
    for (int i = 0; i < m; i++) {
        int u, v;
        long long w;
        std::cin >> u >> v >> w;
        adj[u].push_back({v, w});
    }

    const long long INF = std::numeric_limits<long long>::max();
    std::vector<long long> dist(n + 1, INF);

    // TODO: Dijkstra a partir de s com std::priority_queue

    for (int i = 1; i <= n; i++) std::cout << (dist[i] == INF ? -1 : dist[i]) << '\n';
    return 0;
}
