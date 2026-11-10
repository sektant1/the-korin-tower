#include <inttypes.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define KEY_MAX 32

// Sugestão de estrutura (encadeamento). Pode mudar à vontade.
typedef struct Entry {
    char key[KEY_MAX + 1];
    int64_t value;
    struct Entry *next;
} Entry;

typedef struct {
    Entry **buckets;
    size_t cap;
    size_t count;
} HashTable;

void ht_init(HashTable *t) {
    // TODO
    t->buckets = NULL;
    t->cap = 0;
    t->count = 0;
}

void ht_set(HashTable *t, const char *key, int64_t value) {
    // TODO
    (void)t, (void)key, (void)value;
}

bool ht_get(const HashTable *t, const char *key, int64_t *out) {
    // TODO: se achar, escreva em *out e devolva true
    (void)t, (void)key, (void)out;
    return false;
}

bool ht_del(HashTable *t, const char *key) {
    // TODO
    (void)t, (void)key;
    return false;
}

size_t ht_count(const HashTable *t) { return t->count; }

void ht_free(HashTable *t) {
    // TODO: libere todos os nós e o vetor de baldes
    (void)t;
}

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
