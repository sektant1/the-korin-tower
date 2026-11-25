#include <cstddef>
#include <iostream>
#include <list>
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>

class LRUCache {
    using Item = std::pair<long long, long long>; // chave, valor
    std::size_t capacity_;
    std::list<Item> items_;                                       // frente = mais recente
    std::unordered_map<long long, std::list<Item>::iterator> pos_; // chave -> nó na lista

    void touch(std::list<Item>::iterator it) { items_.splice(items_.begin(), items_, it); }

public:
    explicit LRUCache(std::size_t capacity) : capacity_(capacity) { pos_.reserve(capacity * 2); }

    long long get(long long key) {
        auto found = pos_.find(key);
        if (found == pos_.end()) return -1;
        touch(found->second);
        return found->second->second;
    }

    std::optional<long long> put(long long key, long long value) {
        if (auto found = pos_.find(key); found != pos_.end()) {
            found->second->second = value;
            touch(found->second);
            return std::nullopt;
        }
        std::optional<long long> evicted;
        if (items_.size() == capacity_) {
            evicted = items_.back().first;
            pos_.erase(items_.back().first);
            items_.pop_back();
        }
        items_.emplace_front(key, value);
        pos_[key] = items_.begin();
        return evicted;
    }
};
