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

    void clear() {
        while (head_) {
            Node* next = head_->next;
            delete head_;
            head_ = next;
        }
        tail_ = nullptr;
        size_ = 0;
    }

public:
    LinkedList() = default;

    LinkedList(const LinkedList& other) {
        for (Node* n = other.head_; n; n = n->next) push_back(n->value);
    }

    // copy-and-swap: a cópia acontece no parâmetro por valor;
    // se ela lançar exceção, *this fica intacto.
    LinkedList& operator=(LinkedList other) {
        std::swap(head_, other.head_);
        std::swap(tail_, other.tail_);
        std::swap(size_, other.size_);
        return *this;
    }

    ~LinkedList() { clear(); }

    void push_front(const T& x) {
        head_ = new Node{x, head_};
        if (!tail_) tail_ = head_;
        ++size_;
    }

    void push_back(const T& x) {
        Node* n = new Node{x, nullptr};
        if (tail_) tail_->next = n;
        else head_ = n;
        tail_ = n;
        ++size_;
    }

    std::optional<T> pop_front() {
        if (!head_) return std::nullopt;
        Node* n = head_;
        head_ = n->next;
        if (!head_) tail_ = nullptr;
        --size_;
        std::optional<T> v(std::move(n->value));
        delete n;
        return v;
    }

    std::size_t size() const { return size_; }

    void reverse() {
        Node* prev = nullptr;
        Node* cur = head_;
        tail_ = head_;
        while (cur) {
            Node* next = cur->next;
            cur->next = prev;
            prev = cur;
            cur = next;
        }
        head_ = prev;
    }

    long find(const T& x) const {
        long i = 0;
        for (Node* n = head_; n; n = n->next, ++i)
            if (n->value == x) return i;
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
