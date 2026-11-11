#include <stdio.h>
#include <string.h>

#define MAXP 20000
#define TAPE 30000
#define LIMIT 1000000

static char code[MAXP];
static int jump[MAXP], stk[MAXP];
static unsigned char tape[TAPE];

int main(void) {
    static char line[MAXP + 8];
    if (!fgets(line, sizeof line, stdin)) return 1;
    int n = 0;
    for (char *p = line; *p; p++)
        if (strchr("<>+-.,[]", *p)) code[n++] = *p;
    int sp = 0;
    for (int i = 0; i < n; i++) {
        if (code[i] == '[') stk[sp++] = i;
        else if (code[i] == ']') {
            if (sp == 0) { puts("erro: colchetes"); return 0; }
            int j = stk[--sp];
            jump[i] = j; jump[j] = i;
        }
    }
    if (sp) { puts("erro: colchetes"); return 0; }
    int ptr = 0;
    long steps = 0;
    for (int pc = 0; pc < n; pc++) {
        if (++steps > LIMIT) { fputs("erro: limite de passos\n", stdout); break; }
        switch (code[pc]) {
            case '>': if (++ptr >= TAPE) { fputs("erro: fita\n", stdout); return 0; } break;
            case '<': if (--ptr < 0) { fputs("erro: fita\n", stdout); return 0; } break;
            case '+': tape[ptr]++; break;
            case '-': tape[ptr]--; break;
            case '.': putchar(tape[ptr]); break;
            case ',': { int c = getchar(); tape[ptr] = c == EOF ? 0 : (unsigned char)c; break; }
            case '[': if (!tape[ptr]) pc = jump[pc]; break;
            case ']': if (tape[ptr]) pc = jump[pc]; break;
        }
    }
    return 0;
}
