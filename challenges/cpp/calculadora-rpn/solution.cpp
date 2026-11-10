#include <cctype>
#include <iostream>
#include <optional>
#include <sstream>
#include <string>
#include <vector>

bool is_number(const std::string& t) {
    std::size_t i = (t.size() > 1 && (t[0] == '-' || t[0] == '+')) ? 1 : 0;
    if (i == t.size()) return false;
    for (; i < t.size(); i++)
        if (!std::isdigit(static_cast<unsigned char>(t[i]))) return false;
    return true;
}

std::optional<long long> eval(const std::string& line) {
    std::vector<long long> st;
    std::istringstream in(line);
    std::string tok;
    while (in >> tok) {
        if (is_number(tok)) {
            st.push_back(std::stoll(tok));
        } else if (tok == "dup") {
            if (st.empty()) return std::nullopt;
            st.push_back(st.back());
        } else if (tok == "drop") {
            if (st.empty()) return std::nullopt;
            st.pop_back();
        } else if (tok == "swap") {
            if (st.size() < 2) return std::nullopt;
            std::swap(st[st.size() - 1], st[st.size() - 2]);
        } else if (tok.size() == 1 && std::string("+-*/%").find(tok[0]) != std::string::npos) {
            if (st.size() < 2) return std::nullopt;
            long long b = st.back();
            st.pop_back();
            long long a = st.back();
            st.pop_back();
            switch (tok[0]) {
                case '+': st.push_back(a + b); break;
                case '-': st.push_back(a - b); break;
                case '*': st.push_back(a * b); break;
                case '/':
                    if (b == 0) return std::nullopt;
                    st.push_back(a / b);
                    break;
                case '%':
                    if (b == 0) return std::nullopt;
                    st.push_back(a % b);
                    break;
            }
        } else {
            return std::nullopt; // token desconhecido
        }
    }
    if (st.size() != 1) return std::nullopt;
    return st.back();
}

int main() {
    std::ios::sync_with_stdio(false);
    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.find_first_not_of(" \t\r") == std::string::npos) continue;
        auto r = eval(line);
        if (r) std::cout << *r << '\n';
        else std::cout << "erro\n";
    }
    return 0;
}
