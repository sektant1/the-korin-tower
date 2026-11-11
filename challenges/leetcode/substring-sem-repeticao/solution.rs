use std::io::{self, BufWriter, Read, Write};

fn maior(s: &[u8]) -> usize {
    let mut ultima = [usize::MAX; 256];
    let (mut melhor, mut ini) = (0usize, 0usize);
    for (j, &c) in s.iter().enumerate() {
        let u = ultima[c as usize];
        if u != usize::MAX && u >= ini { ini = u + 1; }
        ultima[c as usize] = j;
        melhor = melhor.max(j - ini + 1);
    }
    melhor
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
