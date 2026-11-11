#include <iostream>
#include <stack>
#include <string>

bool valida(const std::string &s) {
    // TODO
    (void)s;
    return false;
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int t;
    std::cin >> t;
    std::string s;
    while (t-- > 0 && std::cin >> s) std::cout << (valida(s) ? "sim" : "nao") << '\n';
    return 0;
}
