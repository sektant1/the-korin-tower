#include <cstdio>
#include <iostream>
#include <vector>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int n, m;
    std::cin >> n >> m;
    std::vector<int> a(n), b(m);
    for (auto &x : a) std::cin >> x;
    for (auto &x : b) std::cin >> x;

    double mediana = 0;
    // TODO

    std::printf("%.1f\n", mediana);
    return 0;
}
