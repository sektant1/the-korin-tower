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

    // TODO: imprima "i j" com i < j e a[i] + a[j] == alvo

    return 0;
}
