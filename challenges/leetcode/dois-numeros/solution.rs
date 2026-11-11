use std::collections::HashMap;
use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_ascii_whitespace().map(|s| s.parse::<i64>().unwrap());
    let n = it.next().unwrap() as usize;
    let a: Vec<i64> = (0..n).map(|_| it.next().unwrap()).collect();
    let alvo = it.next().unwrap();
    let mut visto: HashMap<i64, usize> = HashMap::with_capacity(n);
    for (i, &x) in a.iter().enumerate() {
        if let Some(&j) = visto.get(&(alvo - x)) {
            println!("{} {}", j, i);
            return;
        }
        visto.insert(x, i);
    }
}
