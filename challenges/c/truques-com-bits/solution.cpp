#include <cstdint>
#include <iostream>

int popcount(std::uint64_t n) {
    int c = 0;
    for (; n; n &= n - 1) c++;
    return c;
}

int msb(std::uint64_t n) {
    int p = -1;
    for (; n; n >>= 1) p++;
    return p;
}

bool potencia_de_2(std::uint64_t n) { return n != 0 && (n & (n - 1)) == 0; }

std::uint64_t gray(std::uint64_t n) { return n ^ (n >> 1); }

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int t;
    if (!(std::cin >> t)) return 0;
    while (t--) {
        std::uint64_t n;
        std::cin >> n;
        std::cout << popcount(n) << ' ' << msb(n) << ' ' << (potencia_de_2(n) ? "sim" : "nao") << ' ' << gray(n) << '\n';
    }
    return 0;
}
