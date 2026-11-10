#include <cmath>
#include <cstdio>
#include <iostream>

struct Vec3 {
    double x, y, z;
    Vec3 operator+(const Vec3& o) const { return {x + o.x, y + o.y, z + o.z}; }
    Vec3 operator-(const Vec3& o) const { return {x - o.x, y - o.y, z - o.z}; }
    Vec3 operator*(double s) const { return {x * s, y * s, z * s}; }
};

double dot(const Vec3& a, const Vec3& b) { return a.x * b.x + a.y * b.y + a.z * b.z; }

int main() {
    int w, h;
    if (!(std::cin >> w >> h)) return 1;

    std::printf("P3\n%d %d\n255\n", w, h);
    for (int j = 0; j < h; j++) {
        for (int i = 0; i < w; i++) {
            // TODO: lançar o raio do pixel (i, j) e calcular a cor
            Vec3 c{double(i) / w, double(j) / h, 0.25};
            std::printf("%d %d %d\n", int(255.999 * c.x), int(255.999 * c.y), int(255.999 * c.z));
        }
    }
}
