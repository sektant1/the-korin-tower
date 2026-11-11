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

    // TODO: ordene por início, funda e imprima "a b" por linha

    return 0;
}
