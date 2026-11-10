#include <iostream>
#include <optional>
#include <sstream>
#include <string>
#include <vector>

// Avalia uma linha em RPN. std::nullopt = erro.
std::optional<long long> eval(const std::string& line) {
    std::vector<long long> stack;
    std::istringstream in(line);
    std::string tok;
    while (in >> tok) {
        // TODO: números, + - * / %, dup, swap, drop
    }
    // TODO: só é válido se sobrou exatamente um item
    return std::nullopt;
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
