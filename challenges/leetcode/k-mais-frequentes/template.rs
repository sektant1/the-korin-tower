use std::collections::HashMap;
use std::io::{self, BufWriter, Read, Write};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_ascii_whitespace().map(|s| s.parse::<i64>().unwrap());
    let n = it.next().unwrap() as usize;
    let k = it.next().unwrap() as usize;
    let a: Vec<i64> = (0..n).map(|_| it.next().unwrap()).collect();
    let mut out = BufWriter::new(io::stdout().lock());

    // TODO: escreva "valor contagem" para os k mais frequentes em `out`
    let _ = (&a, k, &mut out, HashMap::<i64, usize>::new());
}
