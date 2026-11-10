#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

using Digits = std::vector<int>; // ao contrário: d[0] = unidade

Digits parse(const std::string& s) {
    Digits d(s.rbegin(), s.rend());
    for (int& x : d) x -= '0';
    return d;
}

bool geq(const std::string& x, const std::string& y) {
    if (x.size() != y.size()) return x.size() > y.size();
    return x >= y;
}

void trim(Digits& d) {
    while (d.size() > 1 && d.back() == 0) d.pop_back();
}

Digits add(const Digits& a, const Digits& b) {
    Digits r(std::max(a.size(), b.size()) + 1, 0);
    int carry = 0;
    for (std::size_t i = 0; i < r.size(); i++) {
        int s = (i < a.size() ? a[i] : 0) + (i < b.size() ? b[i] : 0) + carry;
        r[i] = s % 10;
        carry = s / 10;
    }
    trim(r);
    return r;
}

Digits sub(const Digits& a, const Digits& b) { // pré-condição: a >= b
    Digits r(a.size());
    int borrow = 0;
    for (std::size_t i = 0; i < a.size(); i++) {
        int s = a[i] - (i < b.size() ? b[i] : 0) - borrow;
        borrow = s < 0;
        r[i] = borrow ? s + 10 : s;
    }
    trim(r);
    return r;
}

Digits mul(const Digits& a, const Digits& b) {
    Digits r(a.size() + b.size(), 0);
    for (std::size_t i = 0; i < a.size(); i++)
        for (std::size_t j = 0; j < b.size(); j++) r[i + j] += a[i] * b[j];
    int carry = 0;
    for (int& x : r) {
        int s = x + carry;
        x = s % 10;
        carry = s / 10;
    }
    trim(r);
    return r;
}

int main() {
    std::ios::sync_with_stdio(false);
    std::string a, b;
    char op;
    while (std::cin >> a >> op >> b) {
        bool negative = false;
        Digits r;
        if (op == '+') {
            r = add(parse(a), parse(b));
        } else if (op == '-') {
            if (geq(a, b)) {
                r = sub(parse(a), parse(b));
            } else {
                r = sub(parse(b), parse(a));
                negative = true;
            }
        } else {
            r = mul(parse(a), parse(b));
        }
        if (negative && !(r.size() == 1 && r[0] == 0)) std::cout << '-';
        for (auto it = r.rbegin(); it != r.rend(); ++it) std::cout << *it;
        std::cout << '\n';
    }
    return 0;
}
