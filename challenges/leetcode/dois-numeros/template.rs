use std::collections::HashMap;
use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_ascii_whitespace().map(|s| s.parse::<i64>().unwrap());
    let n = it.next().unwrap() as usize;
    let a: Vec<i64> = (0..n).map(|_| it.next().unwrap()).collect();
    let alvo = it.next().unwrap();

    // TODO: imprima "i j" com i < j e a[i] + a[j] == alvo
    let _ = (&a, alvo, HashMap::<i64, usize>::new());
}
