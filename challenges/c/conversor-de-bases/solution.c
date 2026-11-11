#include <stdio.h>

int main(void) {
    unsigned long long n;
    int b;
    while (scanf("%llu %d", &n, &b) == 2) {
        char buf[72];
        int len = 0;
        if (n == 0) buf[len++] = '0';
        while (n > 0) { buf[len++] = "0123456789ABCDEF"[n % b]; n /= b; }
        while (len > 0) putchar(buf[--len]);
        putchar('\n');
    }
    return 0;
}
