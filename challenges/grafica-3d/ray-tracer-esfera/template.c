#include <math.h>
#include <stdio.h>

typedef struct { double x, y, z; } Vec3;

static Vec3 v3(double x, double y, double z) { Vec3 v = {x, y, z}; return v; }
static Vec3 add(Vec3 a, Vec3 b) { return v3(a.x + b.x, a.y + b.y, a.z + b.z); }
static Vec3 sub(Vec3 a, Vec3 b) { return v3(a.x - b.x, a.y - b.y, a.z - b.z); }
static Vec3 mul(Vec3 a, double s) { return v3(a.x * s, a.y * s, a.z * s); }
static double dot(Vec3 a, Vec3 b) { return a.x * b.x + a.y * b.y + a.z * b.z; }

int main(void) {
    int w, h;
    if (scanf("%d %d", &w, &h) != 2) return 1;

    printf("P3\n%d %d\n255\n", w, h);
    for (int j = 0; j < h; j++) {
        for (int i = 0; i < w; i++) {
            /* TODO: lançar o raio do pixel (i, j) e calcular a cor */
            Vec3 color = v3((double)i / w, (double)j / h, 0.25);
            printf("%d %d %d\n", (int)(255.999 * color.x), (int)(255.999 * color.y), (int)(255.999 * color.z));
        }
    }
    (void)add; (void)sub; (void)mul; (void)dot;
    return 0;
}
