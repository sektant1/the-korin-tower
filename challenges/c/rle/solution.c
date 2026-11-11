#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    static char s[200005];
    while (fgets(s, sizeof s, stdin)) {
        size_t n = strlen(s);
        while (n > 0 && (s[n - 1] == '\n' || s[n - 1] == '\r')) s[--n] = 0;
        for (size_t i = 0; i < n;) {
            size_t j = i;
            while (j < n && s[j] == s[i]) j++;
            printf("%zu%c", j - i, s[i]);
            i = j;
        }
        putchar('\n');
    }
    return 0;
}
