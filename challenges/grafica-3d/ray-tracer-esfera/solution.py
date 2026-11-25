import math
import sys


def main():
    w, h = map(int, sys.stdin.readline().split())
    vh, vw = 2.0, 2.0 * w / h
    cz, radius = -1.0, 0.5
    c = cz * cz - radius * radius  # ||C - O||^2 - r^2, com O na origem
    xs = [-vw / 2 + (i + 0.5) * vw / w for i in range(w)]
    out = [f"P3\n{w} {h}\n255"]
    for j in range(h):
        y = vh / 2 - (j + 0.5) * vh / h
        for x in xs:
            a = x * x + y * y + 1.0
            hh = -cz  # d . (C - O) = (x, y, -1) . (0, 0, -1)
            disc = hh * hh - a * c
            if disc >= 0:
                t = (hh - math.sqrt(disc)) / a
                if t > 0:
                    nx, ny, nz = x * t / radius, y * t / radius, (-t - cz) / radius
                    out.append(f"{int(255.999 * 0.5 * (nx + 1))} {int(255.999 * 0.5 * (ny + 1))} {int(255.999 * 0.5 * (nz + 1))}")
                    continue
            alpha = 0.5 * (y / math.sqrt(a) + 1.0)
            out.append(f"{int(255.999 * (1 - alpha + alpha * 0.5))} {int(255.999 * (1 - alpha + alpha * 0.7))} {int(255.999 * (1 - alpha + alpha))}")
    print("\n".join(out))


main()
