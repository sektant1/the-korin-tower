#include <algorithm>
#include <iostream>
#include <unordered_map>
#include <vector>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int n, k;
    std::cin >> n >> k;
    std::vector<long long> a(n);
    for (auto &x : a) std::cin >> x;

    // TODO: imprima "valor contagem" para os k mais frequentes

    return 0;
}
