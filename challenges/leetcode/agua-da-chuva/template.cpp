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

    long long total = 0;
    // TODO

    std::cout << total << '\n';
    return 0;
}
