#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_ID 1000000

/* Todos os blocos (livres e ocupados) em ordem de endereço. */
typedef struct Block {
    long addr, size;
    int free;
    struct Block *prev, *next;
} Block;

static Block *head;
static Block *by_id[MAX_ID + 1]; // bloco ocupado de cada id (NULL = não alocado)

static Block *new_block(long addr, long size, int is_free) {
    Block *b = malloc(sizeof *b);
    if (!b) abort();
    b->addr = addr;
    b->size = size;
    b->free = is_free;
    b->prev = b->next = NULL;
    return b;
}

/* b absorve o vizinho seguinte (os dois livres). */
static void merge_next(Block *b) {
    Block *n = b->next;
    b->size += n->size;
    b->next = n->next;
    if (n->next) n->next->prev = b;
    free(n);
}

static void do_malloc(long id, long n) {
    long need = (n + 7) & ~7L;
    for (Block *b = head; b; b = b->next) {
        if (!b->free || b->size < need) continue;
        if (b->size > need) { // divide: o resto continua livre logo depois
            Block *rest = new_block(b->addr + need, b->size - need, 1);
            rest->prev = b;
            rest->next = b->next;
            if (b->next) b->next->prev = rest;
            b->next = rest;
            b->size = need;
        }
        b->free = 0;
        by_id[id] = b;
        printf("%ld\n", b->addr);
        return;
    }
    puts("NULL");
}

static void do_free(long id) {
    Block *b = by_id[id];
    if (!b) {
        puts("erro");
        return;
    }
    by_id[id] = NULL;
    b->free = 1;
    if (b->next && b->next->free) merge_next(b);
    if (b->prev && b->prev->free) merge_next(b->prev);
}

static void dump(void) {
    int any = 0;
    fputs("livre:", stdout);
    for (Block *b = head; b; b = b->next) {
        if (!b->free) continue;
        printf(" [%ld,%ld)", b->addr, b->addr + b->size);
        any = 1;
    }
    puts(any ? "" : " (nada)");
}

static void stats(void) {
    long used = 0, avail = 0, largest = 0;
    for (Block *b = head; b; b = b->next) {
        if (b->free) {
            avail += b->size;
            if (b->size > largest) largest = b->size;
        } else {
            used += b->size;
        }
    }
    printf("usado %ld livre %ld maior %ld\n", used, avail, largest);
}

int main(void) {
    long h;
    if (scanf("%ld", &h) != 1) return 0;
    head = new_block(0, h, 1);

    char cmd[8];
    while (scanf("%7s", cmd) == 1) {
        long id, n;
        if (strcmp(cmd, "malloc") == 0) {
            if (scanf("%ld %ld", &id, &n) != 2) break;
            do_malloc(id, n);
        } else if (strcmp(cmd, "free") == 0) {
            if (scanf("%ld", &id) != 1) break;
            do_free(id);
        } else if (strcmp(cmd, "dump") == 0) {
            dump();
        } else if (strcmp(cmd, "stats") == 0) {
            stats();
        }
    }
    return 0;
}
