use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_ascii_whitespace().map(|s| s.parse::<i64>().unwrap());
    let n = it.next().unwrap() as usize;
    let h: Vec<i64> = (0..n).map(|_| it.next().unwrap()).collect();
    let (mut l, mut r) = (0usize, n - 1);
    let (mut maxl, mut maxr) = (0i64, 0i64);
    let mut total: i64 = 0;
    while l < r {
        if h[l] < h[r] {
            if h[l] > maxl { maxl = h[l]; } else { total += maxl - h[l]; }
            l += 1;
        } else {
            if h[r] > maxr { maxr = h[r]; } else { total += maxr - h[r]; }
            r -= 1;
        }
    }
    println!("{}", total);
}
