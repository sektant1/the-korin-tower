#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define KEY_MAX 32

/* Os campos são escolha sua. O main (que lê os comandos) já existe e chama estas funções. */
typedef struct {
    void *impl;
} HashTable;

void ht_init(HashTable *t);
void ht_set(HashTable *t, const char *key, int64_t value);
bool ht_get(const HashTable *t, const char *key, int64_t *out); /* achou: escreve em *out, devolve true */
bool ht_del(HashTable *t, const char *key);
size_t ht_count(const HashTable *t);
void ht_free(HashTable *t);
