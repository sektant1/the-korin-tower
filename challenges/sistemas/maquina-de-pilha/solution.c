#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAXN 10005
#define MAXS 100000
#define LIMIT 1000000

static char ops[MAXN][8];
static long long args[MAXN];
static long long st[MAXS + 1];
static int sp;

static int fail(const char *msg) { puts(msg); return 0; }

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    for (int i = 0; i < n; i++) {
        scanf("%7s", ops[i]);
        if (!strcmp(ops[i], "push") || ops[i][0] == 'j') scanf("%lld", &args[i]);
    }
    long long steps = 0;
    int pc = 0;
    while (pc >= 0 && pc < n) {
        if (++steps > LIMIT) return fail("erro: limite de passos");
        const char *op = ops[pc];
        long long a = args[pc];
        pc++;
        if (!strcmp(op, "push")) st[sp++] = a;
        else if (!strcmp(op, "halt")) break;
        else if (!strcmp(op, "jmp")) { if (a < 0 || a >= n) return fail("erro: salto invalido"); pc = (int)a; }
        else if (!strcmp(op, "pop") || !strcmp(op, "dup") || !strcmp(op, "print") || !strcmp(op, "jz") || !strcmp(op, "jnz")) {
            if (sp < 1) return fail("erro: pilha vazia");
            if (!strcmp(op, "pop")) sp--;
            else if (!strcmp(op, "dup")) { st[sp] = st[sp - 1]; sp++; }
            else if (!strcmp(op, "print")) printf("%lld\n", st[--sp]);
            else {
                long long v = st[--sp];
                if ((v == 0) == (op[1] == 'z')) {
                    if (a < 0 || a >= n) return fail("erro: salto invalido");
                    pc = (int)a;
                }
            }
        } else {
            if (sp < 2) return fail("erro: pilha vazia");
            long long y = st[sp - 1], x = st[sp - 2];
            if (!strcmp(op, "swap")) { st[sp - 1] = x; st[sp - 2] = y; }
            else if (!strcmp(op, "over")) { st[sp++] = x; }
            else {
                long long r;
                if (!strcmp(op, "add")) r = (long long)((unsigned long long)x + (unsigned long long)y);
                else if (!strcmp(op, "sub")) r = (long long)((unsigned long long)x - (unsigned long long)y);
                else if (!strcmp(op, "mul")) r = (long long)((unsigned long long)x * (unsigned long long)y);
                else {
                    if (y == 0) return fail("erro: divisao por zero");
                    r = !strcmp(op, "div") ? x / y : x % y;
                }
                sp -= 2;
                st[sp++] = r;
            }
        }
        if (sp > MAXS) return fail("erro: pilha cheia");
    }
    return 0;
}
