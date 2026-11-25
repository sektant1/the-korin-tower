#include <cstddef>
#include <optional>

// O main (que lê os comandos) já existe e usa esta classe.
class LRUCache {
public:
    explicit LRUCache(std::size_t capacity);
    // Valor da chave (e marca como mais recente), ou -1.
    long long get(long long key);
    // Grava o valor. Devolve a chave removida, se alguém saiu do cache.
    std::optional<long long> put(long long key, long long value);
};
