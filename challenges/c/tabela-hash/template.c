#include <inttypes.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define KEY_MAX 32

/* Os campos são escolha sua; o main abaixo só usa as funções ht_*. */
typedef struct {
    void *impl;
} HashTable;

void ht_init(HashTable *t);
void ht_set(HashTable *t, const char *key, int64_t value);
bool ht_get(const HashTable *t, const char *key, int64_t *out); /* achou: escreve em *out, devolve true */
bool ht_del(HashTable *t, const char *key);
size_t ht_count(const HashTable *t);
void ht_free(HashTable *t);

/* ======== NÃO ALTERE DAQUI PARA BAIXO ======== */

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
