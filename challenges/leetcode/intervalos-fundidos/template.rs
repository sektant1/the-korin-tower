use std::io::{self, BufWriter, Read, Write};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_ascii_whitespace().map(|s| s.parse::<i64>().unwrap());
    let n = it.next().unwrap() as usize;
    let mut v: Vec<(i64, i64)> = (0..n).map(|_| (it.next().unwrap(), it.next().unwrap())).collect();
    let mut out = BufWriter::new(io::stdout().lock());

    // TODO: ordene por início, funda e escreva "a b" por linha em `out`
    let _ = (&mut v, &mut out);
}
