#include <stdio.h>
#include <string.h>

static int matchhere(const char *re, const char *text);

static int matchstar(int c, const char *re, const char *text) {
    do {
        if (matchhere(re, text)) return 1;
    } while (*text != '\0' && (*text++ == c || c == '.'));
    return 0;
}

static int matchhere(const char *re, const char *text) {
    if (re[0] == '\0') return 1;
    if (re[1] == '*') return matchstar(re[0], re + 2, text);
    if (re[0] == '$' && re[1] == '\0') return *text == '\0';
    if (*text != '\0' && (re[0] == '.' || re[0] == *text)) return matchhere(re + 1, text + 1);
    return 0;
}

static int match(const char *re, const char *text) {
    if (re[0] == '^') return matchhere(re + 1, text);
    do {
        if (matchhere(re, text)) return 1;
    } while (*text++ != '\0');
    return 0;
}

static void chomp(char *s) {
    size_t n = strlen(s);
    while (n > 0 && (s[n - 1] == '\n' || s[n - 1] == '\r')) s[--n] = 0;
}

int main(void) {
    static char re[256], line[4096];
    if (!fgets(re, sizeof re, stdin)) return 1;
    chomp(re);
    while (fgets(line, sizeof line, stdin)) {
        chomp(line);
        puts(match(re, line) ? "sim" : "nao");
    }
    return 0;
}
