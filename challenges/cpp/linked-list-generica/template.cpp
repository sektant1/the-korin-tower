#include <cstddef>
#include <optional>

// Os campos são escolha sua. O main (que lê os comandos) já existe e usa estes métodos.
template <typename T>
class LinkedList {
public:
    LinkedList() = default;
    LinkedList(const LinkedList& other);
    LinkedList& operator=(const LinkedList& other);
    ~LinkedList();

    void push_front(const T& x);
    void push_back(const T& x);
    std::optional<T> pop_front();
    std::size_t size() const;
    void reverse();
    long find(const T& x) const;

    template <typename F>
    void for_each(F f) const;
};
