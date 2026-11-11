#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int maior(const char *s) {
    /* TODO */
    (void)s;
    return 0;
}

int main(void) {
    int t;
    if (scanf("%d", &t) != 1) return 1;
    char *linha = malloc(1000005);
    while (t-- > 0) {
        if (scanf("%1000000s", linha) != 1) break;
        printf("%d\n", maior(linha));
    }
    free(linha);
    return 0;
}
