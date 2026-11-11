#include <algorithm>
#include <array>
#include <iostream>
#include <string>

int maior(const std::string &s) {
    // TODO
    (void)s;
    return 0;
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
