#include <inttypes.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define KEY_MAX 32

typedef struct Entry {
    char key[KEY_MAX + 1];
    int64_t value;
    struct Entry *next;
} Entry;

typedef struct {
    Entry **buckets;
    size_t cap; // sempre potência de 2
    size_t count;
} HashTable;

/* FNV-1a 64 bits */
static uint64_t hash(const char *s) {
    uint64_t h = 1469598103934665603ULL;
    for (; *s; s++) {
        h ^= (unsigned char)*s;
        h *= 1099511628211ULL;
    }
    return h;
}

void ht_init(HashTable *t) {
    t->cap = 16;
    t->count = 0;
    t->buckets = calloc(t->cap, sizeof(Entry *));
    if (!t->buckets) abort();
}

/* Dobra a capacidade reaproveitando os nós (só troca os ponteiros). */
static void grow(HashTable *t) {
    size_t ncap = t->cap * 2;
    Entry **nb = calloc(ncap, sizeof(Entry *));
    if (!nb) abort();
    for (size_t i = 0; i < t->cap; i++) {
        Entry *e = t->buckets[i];
        while (e) {
            Entry *next = e->next;
            size_t j = hash(e->key) & (ncap - 1);
            e->next = nb[j];
            nb[j] = e;
            e = next;
        }
    }
    free(t->buckets);
    t->buckets = nb;
    t->cap = ncap;
}

void ht_set(HashTable *t, const char *key, int64_t value) {
    size_t i = hash(key) & (t->cap - 1);
    for (Entry *e = t->buckets[i]; e; e = e->next) {
        if (strcmp(e->key, key) == 0) {
            e->value = value;
            return;
        }
    }
    if ((t->count + 1) * 4 > t->cap * 3) { // fator de carga 0.75
        grow(t);
        i = hash(key) & (t->cap - 1);
    }
    Entry *e = malloc(sizeof *e);
    if (!e) abort();
    strcpy(e->key, key);
    e->value = value;
    e->next = t->buckets[i];
    t->buckets[i] = e;
    t->count++;
}

bool ht_get(const HashTable *t, const char *key, int64_t *out) {
    for (Entry *e = t->buckets[hash(key) & (t->cap - 1)]; e; e = e->next) {
        if (strcmp(e->key, key) == 0) {
            *out = e->value;
            return true;
        }
    }
    return false;
}

bool ht_del(HashTable *t, const char *key) {
    Entry **pp = &t->buckets[hash(key) & (t->cap - 1)];
    while (*pp) {
        if (strcmp((*pp)->key, key) == 0) {
            Entry *dead = *pp;
            *pp = dead->next;
            free(dead);
            t->count--;
            return true;
        }
        pp = &(*pp)->next;
    }
    return false;
}

size_t ht_count(const HashTable *t) { return t->count; }

void ht_free(HashTable *t) {
    for (size_t i = 0; i < t->cap; i++) {
        Entry *e = t->buckets[i];
        while (e) {
            Entry *next = e->next;
            free(e);
            e = next;
        }
    }
    free(t->buckets);
    t->buckets = NULL;
    t->cap = t->count = 0;
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
