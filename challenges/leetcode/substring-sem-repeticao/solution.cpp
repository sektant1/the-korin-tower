#include <algorithm>
#include <array>
#include <iostream>
#include <string>

int maior(const std::string &s) {
    std::array<int, 256> ultima;
    ultima.fill(-1);
    int melhor = 0, ini = 0;
    for (int j = 0; j < (int)s.size(); j++) {
        unsigned char c = s[j];
        ini = std::max(ini, ultima[c] + 1);
        ultima[c] = j;
        melhor = std::max(melhor, j - ini + 1);
    }
    return melhor;
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int t;
    std::cin >> t;
    std::string s;
    while (t-- > 0 && std::cin >> s) std::cout << maior(s) << '\n';
    return 0;
}
