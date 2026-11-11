use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_ascii_whitespace().map(|s| s.parse::<i64>().unwrap());
    let n = it.next().unwrap() as usize;
    let m = it.next().unwrap() as usize;
    let a: Vec<i64> = (0..n).map(|_| it.next().unwrap()).collect();
    let b: Vec<i64> = (0..m).map(|_| it.next().unwrap()).collect();
    let total = n + m;
    let (mut i, mut j) = (0usize, 0usize);
    let (mut ant, mut cur) = (0i64, 0i64);
    for _ in 0..=total / 2 {
        ant = cur;
        if i < n && (j >= m || a[i] <= b[j]) {
            cur = a[i];
            i += 1;
        } else {
            cur = b[j];
            j += 1;
        }
    }
    let mediana = if total % 2 == 1 { cur as f64 } else { (ant + cur) as f64 / 2.0 };
    println!("{:.1}", mediana);
}
