#include <cctype>
#include <iostream>

int main() {
    long linhas = 0, palavras = 0, bytes = 0;

    // TODO: leia a entrada byte a byte (std::cin.get(c) ou std::istreambuf_iterator)
    //       e atualize os três contadores. Cuidado: std::cin >> c pula espaços!

    std::cout << linhas << ' ' << palavras << ' ' << bytes << '\n';
    return 0;
}
