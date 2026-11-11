#include <algorithm>
#include <climits>
#include <cstdio>
#include <iostream>
#include <vector>

// Busca binária no corte do menor vetor: O(log min(N, M)).
int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    int n, m;
    std::cin >> n >> m;
    std::vector<int> a(n), b(m);
    for (auto &x : a) std::cin >> x;
    for (auto &x : b) std::cin >> x;
    if (a.size() > b.size()) std::swap(a, b);
    n = a.size();
    m = b.size();
    int metade = (n + m + 1) / 2, lo = 0, hi = n;
    double mediana = 0;
    while (lo <= hi) {
        int i = (lo + hi) / 2, j = metade - i;
        int aEsq = i ? a[i - 1] : INT_MIN, aDir = i < n ? a[i] : INT_MAX;
        int bEsq = j ? b[j - 1] : INT_MIN, bDir = j < m ? b[j] : INT_MAX;
        if (aEsq > bDir) hi = i - 1;
        else if (bEsq > aDir) lo = i + 1;
        else {
            int maxEsq = std::max(aEsq, bEsq), minDir = std::min(aDir, bDir);
            mediana = (n + m) % 2 ? maxEsq : (maxEsq + (double)minDir) / 2.0;
            break;
        }
    }
    std::printf("%.1f\n", mediana);
    return 0;
}
