#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int valida(const char *s) {
    size_t n = strlen(s);
    char *pilha = malloc(n + 1);
    size_t topo = 0;
    int ok = 1;
    for (size_t i = 0; i < n && ok; i++) {
        char c = s[i];
        if (c == '(' || c == '[' || c == '{') pilha[topo++] = c;
        else {
            char abre = c == ')' ? '(' : c == ']' ? '[' : '{';
            if (topo == 0 || pilha[--topo] != abre) ok = 0;
        }
    }
    free(pilha);
    return ok && topo == 0;
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
