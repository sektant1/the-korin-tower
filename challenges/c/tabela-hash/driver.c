/* Driver do desafio: lê os comandos e chama as suas funções ht_*. */
#include <inttypes.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    HashTable t;
    ht_init(&t);
    char cmd[8], key[KEY_MAX + 2];
    while (scanf("%7s", cmd) == 1) {
        if (strcmp(cmd, "set") == 0) {
            int64_t v;
            if (scanf("%33s %" SCNd64, key, &v) != 2) break;
            ht_set(&t, key, v);
        } else if (strcmp(cmd, "get") == 0) {
            if (scanf("%33s", key) != 1) break;
            int64_t v;
            if (ht_get(&t, key, &v)) printf("%" PRId64 "\n", v);
            else puts("nil");
        } else if (strcmp(cmd, "del") == 0) {
            if (scanf("%33s", key) != 1) break;
            puts(ht_del(&t, key) ? "1" : "0");
        } else if (strcmp(cmd, "count") == 0) {
            printf("%lu\n", (unsigned long)ht_count(&t));
        }
    }
    ht_free(&t);
    return 0;
}
