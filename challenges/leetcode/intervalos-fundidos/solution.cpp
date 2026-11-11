#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int n;
    std::cin >> n;
    std::vector<std::pair<long long, long long>> v(n);
    for (auto &[a, b] : v) std::cin >> a >> b;
    std::sort(v.begin(), v.end());
    auto atual = v[0];
    for (int i = 1; i < n; i++) {
        if (v[i].first <= atual.second) atual.second = std::max(atual.second, v[i].second);
        else {
            std::cout << atual.first << ' ' << atual.second << '\n';
            atual = v[i];
        }
    }
    std::cout << atual.first << ' ' << atual.second << '\n';
    return 0;
}
