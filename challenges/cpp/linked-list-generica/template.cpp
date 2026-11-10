#include <cstddef>
#include <iostream>
#include <optional>
#include <string>
#include <utility>

template <typename T>
class LinkedList {
    struct Node {
        T value;
        Node* next;
    };

    Node* head_ = nullptr;
    Node* tail_ = nullptr;
    std::size_t size_ = 0;

public:
    LinkedList() = default;

    LinkedList(const LinkedList& other) {
        // TODO: cópia profunda
        (void)other;
    }

    LinkedList& operator=(const LinkedList& other) {
        // TODO: cópia profunda (dica: copy-and-swap)
        (void)other;
        return *this;
    }

    ~LinkedList() {
        // TODO: liberar todos os nós
    }

    void push_front(const T& x) {
        // TODO
        (void)x;
    }

    void push_back(const T& x) {
        // TODO
        (void)x;
    }

    std::optional<T> pop_front() {
        // TODO
        return std::nullopt;
    }

    std::size_t size() const { return size_; }

    void reverse() {
        // TODO
    }

    long find(const T& x) const {
        // TODO
        (void)x;
        return -1;
    }

    template <typename F>
    void for_each(F f) const {
        for (Node* n = head_; n; n = n->next) f(n->value);
    }
};

// ======== NÃO ALTERE DAQUI PARA BAIXO ========

template <typename T>
void print(const LinkedList<T>& list) {
    std::cout << '[';
    bool first = true;
    list.for_each([&](const T& v) {
        if (!first) std::cout << ", ";
        std::cout << v;
        first = false;
    });
    std::cout << "]\n";
}

template <typename T>
void run() {
    LinkedList<T> list, snap;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "push_front" || cmd == "push_back") {
            T x;
            std::cin >> x;
            if (cmd == "push_front") list.push_front(x);
            else list.push_back(x);
        } else if (cmd == "pop_front") {
            auto v = list.pop_front();
            if (v) std::cout << *v << '\n';
            else std::cout << "vazia\n";
        } else if (cmd == "size") {
            std::cout << list.size() << '\n';
        } else if (cmd == "print") {
            print(list);
        } else if (cmd == "reverse") {
            list.reverse();
        } else if (cmd == "find") {
            T x;
            std::cin >> x;
            std::cout << list.find(x) << '\n';
        } else if (cmd == "snapshot") {
            snap = list;
        } else if (cmd == "print_snapshot") {
            print(snap);
        }
    }
}

int main() {
    std::ios::sync_with_stdio(false);
    std::string type;
    std::cin >> type;
    if (type == "int") run<int>();
    else run<std::string>();
    return 0;
}
