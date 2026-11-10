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
#[allow(dead_code)]
fn dot(a: Vec3, b: Vec3) -> f64 { a.x * b.x + a.y * b.y + a.z * b.z }

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_whitespace().map(|s| s.parse::<usize>().unwrap());
    let (w, h) = (it.next().unwrap(), it.next().unwrap());

    let mut out = BufWriter::new(io::stdout().lock());
    writeln!(out, "P3\n{} {}\n255", w, h).unwrap();
    for j in 0..h {
        for i in 0..w {
            // TODO: lançar o raio do pixel (i, j) e calcular a cor
            let c = Vec3 { x: i as f64 / w as f64, y: j as f64 / h as f64, z: 0.25 };
            writeln!(out, "{} {} {}", (255.999 * c.x) as i32, (255.999 * c.y) as i32, (255.999 * c.z) as i32).unwrap();
        }
    }
}
