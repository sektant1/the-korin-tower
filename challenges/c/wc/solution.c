#include <ctype.h>
#include <stdio.h>

int main(void) {
    long linhas = 0, palavras = 0, bytes = 0;
    int dentro = 0;
    int c; // int, não char: precisa caber EOF

    while ((c = getchar()) != EOF) {
        bytes++;
        if (c == '\n') linhas++;
        if (isspace(c)) {
            dentro = 0;
        } else if (!dentro) {
            dentro = 1;
            palavras++;
        }
    }

    printf("%ld %ld %ld\n", linhas, palavras, bytes);
    return 0;
}
