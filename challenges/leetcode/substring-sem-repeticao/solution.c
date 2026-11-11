#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int maior(const char *s) {
    int ultima[256];
    for (int i = 0; i < 256; i++) ultima[i] = -1;
    int melhor = 0, ini = 0;
    for (int j = 0; s[j]; j++) {
        unsigned char c = (unsigned char)s[j];
        if (ultima[c] >= ini) ini = ultima[c] + 1;
        ultima[c] = j;
        if (j - ini + 1 > melhor) melhor = j - ini + 1;
    }
    return melhor;
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
