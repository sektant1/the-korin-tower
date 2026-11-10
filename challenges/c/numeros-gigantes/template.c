#include <stdio.h>
#include <string.h>

#define MAXD 1000

// Dica: converta as strings em vetores de dígitos ao contrário (d[0] = unidade).

int main(void) {
    static char a[MAXD + 2], b[MAXD + 2];
    char op;

    while (scanf("%1001s %c %1001s", a, &op, b) == 3) {
        // TODO: calcule a op b e imprima o resultado
        printf("0\n");
    }
    return 0;
}
