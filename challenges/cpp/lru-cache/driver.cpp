// Driver do desafio: lê os comandos e chama o seu LRUCache.
#include <iostream>
#include <string>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    std::size_t capacity;
    if (!(std::cin >> capacity)) return 0;
    LRUCache cache(capacity);
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "get") {
            long long k;
            std::cin >> k;
            std::cout << cache.get(k) << '\n';
        } else if (cmd == "put") {
            long long k, v;
            std::cin >> k >> v;
            if (auto out = cache.put(k, v)) std::cout << "evict " << *out << '\n';
        }
    }
    return 0;
}
