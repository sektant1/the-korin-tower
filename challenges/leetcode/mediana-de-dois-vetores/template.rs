use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_ascii_whitespace().map(|s| s.parse::<i64>().unwrap());
    let n = it.next().unwrap() as usize;
    let m = it.next().unwrap() as usize;
    let a: Vec<i64> = (0..n).map(|_| it.next().unwrap()).collect();
    let b: Vec<i64> = (0..m).map(|_| it.next().unwrap()).collect();

    let mut mediana: f64 = 0.0;
    // TODO
    let _ = (&a, &b, &mut mediana);

    println!("{:.1}", mediana);
}
