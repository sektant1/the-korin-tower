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

Vec3 ray_color(const Vec3& dir) {
    const Vec3 center{0, 0, -1};
    const double radius = 0.5;
    double a = dot(dir, dir);
    double h = dot(dir, center);
    double c = dot(center, center) - radius * radius;
    double disc = h * h - a * c;
    if (disc >= 0) {
        double t = (h - std::sqrt(disc)) / a;
        if (t > 0) {
            Vec3 n = (dir * t - center) * (1.0 / radius);
            return (n + Vec3{1, 1, 1}) * 0.5;
        }
    }
    Vec3 unit = dir * (1.0 / std::sqrt(a));
    double alpha = 0.5 * (unit.y + 1.0);
    return Vec3{1, 1, 1} * (1.0 - alpha) + Vec3{0.5, 0.7, 1.0} * alpha;
}

int main() {
    int w, h;
    if (!(std::cin >> w >> h)) return 1;
    double vh = 2.0, vw = 2.0 * w / h;

    std::printf("P3\n%d %d\n255\n", w, h);
    for (int j = 0; j < h; j++) {
        for (int i = 0; i < w; i++) {
            Vec3 dir{-vw / 2 + (i + 0.5) * vw / w, vh / 2 - (j + 0.5) * vh / h, -1};
            Vec3 c = ray_color(dir);
            std::printf("%d %d %d\n", int(255.999 * c.x), int(255.999 * c.y), int(255.999 * c.z));
        }
    }
}
