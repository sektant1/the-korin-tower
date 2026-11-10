#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_ID 1000000

// Sugestão: todos os blocos (livres e ocupados) numa lista duplamente ligada,
// em ordem de endereço. No começo existe um único bloco livre [0, H).
typedef struct Block {
    long addr, size;
    int free;
    struct Block *prev, *next;
} Block;

static Block *head;

static void do_malloc(long id, long n) {
    // TODO: arredonde n para múltiplo de 8, ache o primeiro bloco livre que caiba,
    //       divida se sobrar espaço e imprima o endereço (ou NULL).
    (void)id, (void)n;
    puts("NULL");
}

static void do_free(long id) {
    // TODO: libere e junte com os vizinhos livres; "erro" se id não estiver alocado.
    (void)id;
}

static void dump(void) {
    // TODO: "livre: [a,b) [c,d)" ou "livre: (nada)"
    puts("livre: (nada)");
}

static void stats(void) {
    // TODO: "usado U livre L maior M"
    puts("usado 0 livre 0 maior 0");
}

int main(void) {
    long h;
    if (scanf("%ld", &h) != 1) return 0;
    head = malloc(sizeof *head);
    *head = (Block){.addr = 0, .size = h, .free = 1, .prev = NULL, .next = NULL};

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
