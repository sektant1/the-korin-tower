use std::io::{self, BufWriter, Read, Write};

fn maior(s: &[u8]) -> usize {
    // TODO
    let _ = s;
    0
}

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_ascii_whitespace();
    let t: usize = it.next().unwrap().parse().unwrap();
    let mut out = BufWriter::new(io::stdout().lock());
    for _ in 0..t {
        let s = it.next().unwrap_or("");
        writeln!(out, "{}", maior(s.as_bytes())).unwrap();
    }
}
