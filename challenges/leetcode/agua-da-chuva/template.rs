use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_ascii_whitespace().map(|s| s.parse::<i64>().unwrap());
    let n = it.next().unwrap() as usize;
    let h: Vec<i64> = (0..n).map(|_| it.next().unwrap()).collect();

    let mut total: i64 = 0;
    // TODO
    let _ = (&h, &mut total);

    println!("{}", total);
}
