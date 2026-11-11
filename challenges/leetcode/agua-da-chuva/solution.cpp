#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int n;
    std::cin >> n;
    std::vector<int> h(n);
    for (auto &x : h) std::cin >> x;
    std::vector<int> esq(n), dir(n);
    for (int i = 0; i < n; i++) esq[i] = std::max(h[i], i ? esq[i - 1] : 0);
    for (int i = n - 1; i >= 0; i--) dir[i] = std::max(h[i], i + 1 < n ? dir[i + 1] : 0);
    long long total = 0;
    for (int i = 0; i < n; i++) total += std::min(esq[i], dir[i]) - h[i];
    std::cout << total << '\n';
    return 0;
}
