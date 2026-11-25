// Driver do desafio: lê os comandos e chama a sua LinkedList<T>.
#include <iostream>
#include <string>

namespace korin_driver {

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

}  // namespace korin_driver

int main() {
    std::ios::sync_with_stdio(false);
    std::string type;
    std::cin >> type;
    if (type == "int") korin_driver::run<int>();
    else korin_driver::run<std::string>();
    return 0;
}
