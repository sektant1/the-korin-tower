#include <iostream>
#include <stack>
#include <string>

bool valida(const std::string &s) {
    std::stack<char> p;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') p.push(c);
        else {
            char abre = c == ')' ? '(' : c == ']' ? '[' : '{';
            if (p.empty() || p.top() != abre) return false;
            p.pop();
        }
    }
    return p.empty();
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
