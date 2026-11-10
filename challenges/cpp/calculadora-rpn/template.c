#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_LINE 65536
#define MAX_STACK 1024

/* Avalia uma linha em RPN. Devolve 1 e escreve em *out, ou 0 em caso de erro. */
static int eval(char *line, long long *out) {
    long long stack[MAX_STACK];
    int top = 0;
    for (char *tok = strtok(line, " \t\r\n"); tok; tok = strtok(NULL, " \t\r\n")) {
        // TODO: números (strtoll), + - * / %, dup, swap, drop
        (void)stack;
    }
    (void)top, (void)out;
    return 0; // TODO: válido só se sobrou exatamente um item
}

int main(void) {
    static char line[MAX_LINE];
    while (fgets(line, sizeof line, stdin)) {
        if (strspn(line, " \t\r\n") == strlen(line)) continue;
        long long r;
        if (eval(line, &r)) printf("%lld\n", r);
        else puts("erro");
    }
    return 0;
}
