use std::cmp::Reverse;
use std::collections::HashMap;
use std::io::{self, BufWriter, Read, Write};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_ascii_whitespace().map(|s| s.parse::<i64>().unwrap());
    let n = it.next().unwrap() as usize;
    let k = it.next().unwrap() as usize;
    let mut cont: HashMap<i64, usize> = HashMap::with_capacity(n);
    for _ in 0..n {
        *cont.entry(it.next().unwrap()).or_insert(0) += 1;
    }
    let mut itens: Vec<(i64, usize)> = cont.into_iter().collect();
    itens.sort_unstable_by_key(|&(v, c)| (Reverse(c), v));
    let mut out = BufWriter::new(io::stdout().lock());
    for &(v, c) in itens.iter().take(k) {
        writeln!(out, "{} {}", v, c).unwrap();
    }
}
