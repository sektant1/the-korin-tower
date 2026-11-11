#include <stdio.h>

int main(void) {
    int k;
    if (scanf("%d", &k) != 1) return 1;
    k = ((k % 26) + 26) % 26;
    int c;
    while ((c = getchar()) != '\n' && c != EOF) {} /* resto da primeira linha */
    while ((c = getchar()) != EOF) {
        if (c >= 'a' && c <= 'z') c = 'a' + (c - 'a' + k) % 26;
        else if (c >= 'A' && c <= 'Z') c = 'A' + (c - 'A' + k) % 26;
        putchar(c);
    }
    return 0;
}
