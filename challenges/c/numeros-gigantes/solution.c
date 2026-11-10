#include <stdio.h>
#include <string.h>

#define MAXD 1000

static int da[MAXD + 2], db[MAXD + 2];
static int res[2 * MAXD + 4];

/* Converte "1234" em {4,3,2,1}; devolve o número de dígitos. */
static int to_digits(const char *s, int *d) {
    int n = (int)strlen(s);
    for (int i = 0; i < n; i++) d[i] = s[n - 1 - i] - '0';
    return n;
}

/* |x| >= |y| para strings sem zeros à esquerda */
static int geq(const char *x, const char *y) {
    size_t lx = strlen(x), ly = strlen(y);
    if (lx != ly) return lx > ly;
    return strcmp(x, y) >= 0;
}

static void print_result(int n, int negative) {
    while (n > 1 && res[n - 1] == 0) n--;
    if (negative && !(n == 1 && res[0] == 0)) putchar('-');
    for (int i = n - 1; i >= 0; i--) putchar('0' + res[i]);
    putchar('\n');
}

int main(void) {
    static char a[MAXD + 2], b[MAXD + 2];
    char op;

    while (scanf("%1001s %c %1001s", a, &op, b) == 3) {
        const char *x = a, *y = b;
        int negative = 0;
        if (op == '-' && !geq(a, b)) { // A - B = -(B - A)
            x = b;
            y = a;
            negative = 1;
        }
        int la = to_digits(x, da), lb = to_digits(y, db);
        int n;

        if (op == '+') {
            n = (la > lb ? la : lb) + 1;
            int carry = 0;
            for (int i = 0; i < n; i++) {
                int s = (i < la ? da[i] : 0) + (i < lb ? db[i] : 0) + carry;
                res[i] = s % 10;
                carry = s / 10;
            }
        } else if (op == '-') {
            n = la;
            int borrow = 0;
            for (int i = 0; i < n; i++) {
                int s = da[i] - (i < lb ? db[i] : 0) - borrow;
                borrow = s < 0;
                res[i] = borrow ? s + 10 : s;
            }
        } else {
            n = la + lb;
            memset(res, 0, sizeof(int) * (size_t)n);
            for (int i = 0; i < la; i++)
                for (int j = 0; j < lb; j++) res[i + j] += da[i] * db[j];
            int carry = 0;
            for (int i = 0; i < n; i++) {
                int s = res[i] + carry;
                res[i] = s % 10;
                carry = s / 10;
            }
        }
        print_result(n, negative);
    }
    return 0;
}
