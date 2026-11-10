#include <cstddef>
#include <iostream>
#include <list>
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>

class LRUCache {
    std::size_t capacity_;
    // TODO: uma std::list (mais recente na frente) + um unordered_map chave -> iterador

public:
    explicit LRUCache(std::size_t capacity) : capacity_(capacity) {}

    // Valor da chave (e marca como mais recente), ou -1.
    long long get(long long key) {
        // TODO
        (void)key;
        return -1;
    }

    // Grava o valor. Devolve a chave removida, se alguém saiu do cache.
    std::optional<long long> put(long long key, long long value) {
        // TODO
        (void)key, (void)value;
        return std::nullopt;
    }
};

// ======== NÃO ALTERE DAQUI PARA BAIXO ========

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
