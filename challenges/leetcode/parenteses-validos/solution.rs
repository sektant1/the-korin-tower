use std::io::{self, BufWriter, Read, Write};

fn valida(s: &[u8]) -> bool {
    let mut pilha = Vec::with_capacity(s.len());
    for &c in s {
        match c {
            b'(' | b'[' | b'{' => pilha.push(c),
            _ => {
                let abre = match c { b')' => b'(', b']' => b'[', _ => b'{' };
                if pilha.pop() != Some(abre) { return false; }
            }
        }
    }
    pilha.is_empty()
}

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_ascii_whitespace();
    let t: usize = it.next().unwrap().parse().unwrap();
    let mut out = BufWriter::new(io::stdout().lock());
    for _ in 0..t {
        let s = it.next().unwrap_or("");
        writeln!(out, "{}", if valida(s.as_bytes()) { "sim" } else { "nao" }).unwrap();
    }
}
