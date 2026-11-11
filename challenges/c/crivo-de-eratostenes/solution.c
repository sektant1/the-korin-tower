#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    char *composto = calloc(n + 1, 1);
    for (long i = 2; i * i <= n; i++)
        if (!composto[i])
            for (long j = i * i; j <= n; j += i) composto[j] = 1;
    for (int i = 2; i <= n; i++)
        if (!composto[i]) printf("%d\n", i);
    free(composto);
    return 0;
}
