#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Devolve 1 se s é válida, 0 se não. */
static int valida(const char *s) {
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
        puts(valida(linha) ? "sim" : "nao");
    }
    free(linha);
    return 0;
}
