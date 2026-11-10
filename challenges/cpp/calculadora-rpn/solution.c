#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_LINE 65536
#define MAX_STACK 1024

static int is_number(const char *t) {
    size_t i = (t[1] != '\0' && (t[0] == '-' || t[0] == '+')) ? 1 : 0;
    if (t[i] == '\0') return 0;
    for (; t[i]; i++)
        if (!isdigit((unsigned char)t[i])) return 0;
    return 1;
}

static int eval(char *line, long long *out) {
    long long st[MAX_STACK];
    int top = 0;
    for (char *tok = strtok(line, " \t\r\n"); tok; tok = strtok(NULL, " \t\r\n")) {
        if (is_number(tok)) {
            if (top == MAX_STACK) return 0;
            st[top++] = strtoll(tok, NULL, 10);
        } else if (strcmp(tok, "dup") == 0) {
            if (top < 1 || top == MAX_STACK) return 0;
            st[top] = st[top - 1];
            top++;
        } else if (strcmp(tok, "drop") == 0) {
            if (top < 1) return 0;
            top--;
        } else if (strcmp(tok, "swap") == 0) {
            if (top < 2) return 0;
            long long t = st[top - 1];
            st[top - 1] = st[top - 2];
            st[top - 2] = t;
        } else if (tok[1] == '\0' && strchr("+-*/%", tok[0])) {
            if (top < 2) return 0;
            long long b = st[--top];
            long long a = st[--top];
            long long r;
            switch (tok[0]) {
                case '+': r = a + b; break;
                case '-': r = a - b; break;
                case '*': r = a * b; break;
                case '/':
                    if (b == 0) return 0;
                    r = a / b;
                    break;
                default:
                    if (b == 0) return 0;
                    r = a % b;
                    break;
            }
            st[top++] = r;
        } else {
            return 0;
        }
    }
    if (top != 1) return 0;
    *out = st[0];
    return 1;
}

int main(void) {
    static char line[MAX_LINE];
    while (fgets(line, sizeof line, stdin)) {
        if (strspn(line, " \t\r\n") == strlen(line)) continue;
        long long r;
        if (eval(line, &r)) printf("%lld\n", r);
        else puts("erro");
    }
    return 0;
}
