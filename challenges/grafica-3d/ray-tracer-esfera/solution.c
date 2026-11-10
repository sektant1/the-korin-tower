#include <math.h>
#include <stdio.h>

typedef struct { double x, y, z; } Vec3;

static Vec3 v3(double x, double y, double z) { Vec3 v = {x, y, z}; return v; }
static Vec3 add(Vec3 a, Vec3 b) { return v3(a.x + b.x, a.y + b.y, a.z + b.z); }
static Vec3 sub(Vec3 a, Vec3 b) { return v3(a.x - b.x, a.y - b.y, a.z - b.z); }
static Vec3 mul(Vec3 a, double s) { return v3(a.x * s, a.y * s, a.z * s); }
static double dot(Vec3 a, Vec3 b) { return a.x * b.x + a.y * b.y + a.z * b.z; }

static Vec3 ray_color(Vec3 dir) {
    const Vec3 center = v3(0, 0, -1);
    const double radius = 0.5;
    Vec3 oc = center; /* C - O, com O na origem */
    double a = dot(dir, dir);
    double h = dot(dir, oc);
    double c = dot(oc, oc) - radius * radius;
    double disc = h * h - a * c;
    if (disc >= 0) {
        double t = (h - sqrt(disc)) / a;
        if (t > 0) {
            Vec3 n = mul(sub(mul(dir, t), center), 1.0 / radius);
            return mul(add(n, v3(1, 1, 1)), 0.5);
        }
    }
    Vec3 unit = mul(dir, 1.0 / sqrt(a));
    double alpha = 0.5 * (unit.y + 1.0);
    return add(mul(v3(1, 1, 1), 1.0 - alpha), mul(v3(0.5, 0.7, 1.0), alpha));
}

int main(void) {
    int w, h;
    if (scanf("%d %d", &w, &h) != 2) return 1;
    double vh = 2.0, vw = 2.0 * w / h;

    printf("P3\n%d %d\n255\n", w, h);
    for (int j = 0; j < h; j++) {
        for (int i = 0; i < w; i++) {
            Vec3 dir = v3(-vw / 2 + (i + 0.5) * vw / w, vh / 2 - (j + 0.5) * vh / h, -1);
            Vec3 c = ray_color(dir);
            printf("%d %d %d\n", (int)(255.999 * c.x), (int)(255.999 * c.y), (int)(255.999 * c.z));
        }
    }
    return 0;
}
