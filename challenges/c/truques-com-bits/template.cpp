#include <cstdint>
#include <iostream>

int popcount(std::uint64_t n) {
    // TODO
    (void)n;
    return 0;
}

int msb(std::uint64_t n) {
    // TODO: posição do bit 1 mais alto, ou -1 se n == 0
    (void)n;
    return -1;
}

bool potencia_de_2(std::uint64_t n) {
    // TODO
    (void)n;
    return false;
}

std::uint64_t gray(std::uint64_t n) {
    // TODO
    return n;
}

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
