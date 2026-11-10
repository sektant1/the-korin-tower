#![allow(dead_code, unused_variables, unused_imports)]
use std::alloc::{self, Layout};
use std::fmt::Display;
use std::io::{self, BufRead, Write};
use std::ptr::{self, NonNull};
use std::str::FromStr;

pub struct MyVec<T> {
    ptr: NonNull<T>,
    cap: usize,
    len: usize,
}

impl<T> MyVec<T> {
    pub fn new() -> Self {
        MyVec { ptr: NonNull::dangling(), cap: 0, len: 0 }
    }

    fn grow(&mut self) {
        todo!("aumentar a capacidade: 0 -> 4 -> 8 -> 16 ...")
    }

    pub fn push(&mut self, x: T) {
        todo!()
    }

    pub fn pop(&mut self) -> Option<T> {
        todo!()
    }

    pub fn get(&self, i: usize) -> Option<&T> {
        todo!()
    }

    pub fn insert(&mut self, i: usize, x: T) {
        todo!()
    }

    pub fn remove(&mut self, i: usize) -> T {
        todo!()
    }

    pub fn len(&self) -> usize {
        self.len
    }

    pub fn capacity(&self) -> usize {
        self.cap
    }

    pub fn as_slice(&self) -> &[T] {
        todo!("dica: std::slice::from_raw_parts")
    }
}

impl<T> Drop for MyVec<T> {
    fn drop(&mut self) {
        // TODO: dropar os elementos e liberar a memória
    }
}

// ======== NÃO ALTERE DAQUI PARA BAIXO ========

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

fn main() {
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
