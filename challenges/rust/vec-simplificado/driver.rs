// Driver do desafio: lê os comandos e chama o seu MyVec<T>.
fn main() {
    korin_driver::run_all();
}

mod korin_driver {
    use super::*;
    use std::fmt::Display;
    use std::io::{self, BufRead, Write};
    use std::str::FromStr;

    fn run<T: FromStr + Display>(lines: impl Iterator<Item = String>, out: &mut impl Write) {
        let mut v: MyVec<T> = MyVec::new();
        for line in lines {
            let parts: Vec<&str> = line.split_whitespace().collect();
            let parse_t = |s: &str| s.parse::<T>().ok().expect("valor inválido");
            let parse_i = |s: &str| s.parse::<usize>().expect("índice inválido");
            match parts.as_slice() {
                ["push", x] => v.push(parse_t(x)),
                ["pop"] => match v.pop() {
                    Some(x) => writeln!(out, "{}", x).unwrap(),
                    None => writeln!(out, "None").unwrap(),
                },
                ["get", i] => match v.get(parse_i(i)) {
                    Some(x) => writeln!(out, "{}", x).unwrap(),
                    None => writeln!(out, "None").unwrap(),
                },
                ["insert", i, x] => {
                    let i = parse_i(i);
                    if i > v.len() {
                        writeln!(out, "erro").unwrap();
                    } else {
                        v.insert(i, parse_t(x));
                    }
                }
                ["remove", i] => {
                    let i = parse_i(i);
                    if i >= v.len() {
                        writeln!(out, "erro").unwrap();
                    } else {
                        let x = v.remove(i);
                        writeln!(out, "{}", x).unwrap();
                    }
                }
                ["len"] => writeln!(out, "{}", v.len()).unwrap(),
                ["cap"] => writeln!(out, "{}", v.capacity()).unwrap(),
                ["print"] => {
                    let items: Vec<String> = v.as_slice().iter().map(|x| x.to_string()).collect();
                    writeln!(out, "[{}]", items.join(", ")).unwrap();
                }
                _ => {}
            }
        }
    }

    pub fn run_all() {
        let stdin = io::stdin();
        let mut lines = stdin.lock().lines().map(|l| l.unwrap());
        let ty = lines.next().unwrap_or_default();
        let stdout = io::stdout();
        let mut out = io::BufWriter::new(stdout.lock());
        if ty.trim() == "i64" {
            run::<i64>(lines, &mut out);
        } else {
            run::<String>(lines, &mut out);
        }
    }
}
