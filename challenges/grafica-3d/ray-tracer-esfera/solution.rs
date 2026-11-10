use std::io::{self, BufWriter, Read, Write};
use std::ops::{Add, Mul, Sub};

#[derive(Clone, Copy, Debug)]
struct Vec3 {
    x: f64,
    y: f64,
    z: f64,
}

impl Add for Vec3 {
    type Output = Vec3;
    fn add(self, o: Vec3) -> Vec3 { Vec3 { x: self.x + o.x, y: self.y + o.y, z: self.z + o.z } }
}
impl Sub for Vec3 {
    type Output = Vec3;
    fn sub(self, o: Vec3) -> Vec3 { Vec3 { x: self.x - o.x, y: self.y - o.y, z: self.z - o.z } }
}
impl Mul<f64> for Vec3 {
    type Output = Vec3;
    fn mul(self, s: f64) -> Vec3 { Vec3 { x: self.x * s, y: self.y * s, z: self.z * s } }
}
fn dot(a: Vec3, b: Vec3) -> f64 { a.x * b.x + a.y * b.y + a.z * b.z }

const fn v3(x: f64, y: f64, z: f64) -> Vec3 { Vec3 { x, y, z } }

fn ray_color(dir: Vec3) -> Vec3 {
    let center = v3(0.0, 0.0, -1.0);
    let radius = 0.5;
    let a = dot(dir, dir);
    let h = dot(dir, center);
    let c = dot(center, center) - radius * radius;
    let disc = h * h - a * c;
    if disc >= 0.0 {
        let t = (h - disc.sqrt()) / a;
        if t > 0.0 {
            let n = (dir * t - center) * (1.0 / radius);
            return (n + v3(1.0, 1.0, 1.0)) * 0.5;
        }
    }
    let unit = dir * (1.0 / a.sqrt());
    let alpha = 0.5 * (unit.y + 1.0);
    v3(1.0, 1.0, 1.0) * (1.0 - alpha) + v3(0.5, 0.7, 1.0) * alpha
}

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_whitespace().map(|s| s.parse::<usize>().unwrap());
    let (w, h) = (it.next().unwrap(), it.next().unwrap());
    let (wf, hf) = (w as f64, h as f64);
    let (vh, vw) = (2.0, 2.0 * wf / hf);

    let mut out = BufWriter::new(io::stdout().lock());
    writeln!(out, "P3\n{} {}\n255", w, h).unwrap();
    for j in 0..h {
        for i in 0..w {
            let dir = v3(
                -vw / 2.0 + (i as f64 + 0.5) * vw / wf,
                vh / 2.0 - (j as f64 + 0.5) * vh / hf,
                -1.0,
            );
            let c = ray_color(dir);
            writeln!(out, "{} {} {}", (255.999 * c.x) as i32, (255.999 * c.y) as i32, (255.999 * c.z) as i32).unwrap();
        }
    }
}
