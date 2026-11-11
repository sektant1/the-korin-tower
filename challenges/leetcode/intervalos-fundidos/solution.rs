use std::io::{self, BufWriter, Read, Write};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_ascii_whitespace().map(|s| s.parse::<i64>().unwrap());
    let n = it.next().unwrap() as usize;
    let mut v: Vec<(i64, i64)> = (0..n).map(|_| (it.next().unwrap(), it.next().unwrap())).collect();
    let mut out = BufWriter::new(io::stdout().lock());
    v.sort_unstable();
    let mut atual = v[0];
    for &(a, b) in &v[1..] {
        if a <= atual.1 {
            atual.1 = atual.1.max(b);
        } else {
            writeln!(out, "{} {}", atual.0, atual.1).unwrap();
            atual = (a, b);
        }
    }
    writeln!(out, "{} {}", atual.0, atual.1).unwrap();
}
