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
    std::vector<std::vector<std::pair<int, long long>>> adj(n + 1);
    for (int i = 0; i < m; i++) {
        int u, v;
        long long w;
        std::cin >> u >> v >> w;
        adj[u].push_back({v, w});
    }

    const long long INF = std::numeric_limits<long long>::max();
    std::vector<long long> dist(n + 1, INF);
    using Entry = std::pair<long long, int>; // (distância, vértice)
    std::priority_queue<Entry, std::vector<Entry>, std::greater<>> pq;

    dist[s] = 0;
    pq.push({0, s});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > dist[u]) continue; // entrada velha
        for (auto [v, w] : adj[u]) {
            if (d + w < dist[v]) {
                dist[v] = d + w;
                pq.push({dist[v], v});
            }
        }
    }

    for (int i = 1; i <= n; i++) std::cout << (dist[i] == INF ? -1 : dist[i]) << '\n';
    return 0;
}
