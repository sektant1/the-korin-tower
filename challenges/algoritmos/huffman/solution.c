#include <stdio.h>
#include <string.h>

int main(void) {
    static char s[100005];
    if (!fgets(s, sizeof s, stdin)) return 1;
    long long cnt[256] = {0};
    long long n = 0;
    for (char *p = s; *p && *p != '\n' && *p != '\r'; p++) { cnt[(unsigned char)*p]++; n++; }
    long long heap[256];
    int k = 0;
    for (int c = 0; c < 256; c++) if (cnt[c]) heap[k++] = cnt[c];
    if (k == 1) { printf("%lld\n", n); return 0; }
    long long total = 0;
    while (k > 1) {
        /* pega os dois menores por busca linear: no máximo 95 símbolos */
        int a = 0;
        for (int i = 1; i < k; i++) if (heap[i] < heap[a]) a = i;
        long long x = heap[a]; heap[a] = heap[--k];
        int b = 0;
        for (int i = 1; i < k; i++) if (heap[i] < heap[b]) b = i;
        long long y = heap[b]; heap[b] = heap[--k];
        total += x + y;
        heap[k++] = x + y;
    }
    printf("%lld\n", total);
    return 0;
}
