#include <cctype>
#include <iostream>
#include <iterator>

int main() {
    std::ios::sync_with_stdio(false);
    long linhas = 0, palavras = 0, bytes = 0;
    bool dentro = false;

    for (std::istreambuf_iterator<char> it(std::cin), end; it != end; ++it) {
        unsigned char c = static_cast<unsigned char>(*it);
        bytes++;
        if (c == '\n') linhas++;
        if (std::isspace(c)) {
            dentro = false;
        } else if (!dentro) {
            dentro = true;
            palavras++;
        }
    }

    std::cout << linhas << ' ' << palavras << ' ' << bytes << '\n';
    return 0;
}
