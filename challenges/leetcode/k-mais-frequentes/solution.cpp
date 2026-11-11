#include <algorithm>
#include <iostream>
#include <unordered_map>
#include <vector>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int n, k;
    std::cin >> n >> k;
    std::unordered_map<long long, int> cont;
    for (int i = 0; i < n; i++) {
        long long x;
        std::cin >> x;
        cont[x]++;
    }
    std::vector<std::pair<int, long long>> itens; // (-contagem, valor): ordena direto
    itens.reserve(cont.size());
    for (auto &[v, c] : cont) itens.emplace_back(-c, v);
    std::partial_sort(itens.begin(), itens.begin() + k, itens.end());
    for (int i = 0; i < k; i++) std::cout << itens[i].second << ' ' << -itens[i].first << '\n';
    return 0;
}
