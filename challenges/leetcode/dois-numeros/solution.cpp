#include <iostream>
#include <unordered_map>
#include <vector>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int n;
    std::cin >> n;
    std::vector<long long> a(n);
    for (auto &x : a) std::cin >> x;
    long long alvo;
    std::cin >> alvo;
    std::unordered_map<long long, int> visto;
    visto.reserve(n * 2);
    for (int i = 0; i < n; i++) {
        auto it = visto.find(alvo - a[i]);
        if (it != visto.end()) {
            std::cout << it->second << ' ' << i << '\n';
            return 0;
        }
        visto.emplace(a[i], i);
    }
    return 0;
}
