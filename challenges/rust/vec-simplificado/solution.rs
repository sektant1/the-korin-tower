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
        let new_cap = if self.cap == 0 { 4 } else { self.cap * 2 };
        let new_layout = Layout::array::<T>(new_cap).expect("capacidade grande demais");
        let new_ptr = if self.cap == 0 {
            unsafe { alloc::alloc(new_layout) }
        } else {
            let old_layout = Layout::array::<T>(self.cap).unwrap();
            unsafe { alloc::realloc(self.ptr.as_ptr() as *mut u8, old_layout, new_layout.size()) }
        };
        self.ptr = match NonNull::new(new_ptr as *mut T) {
            Some(p) => p,
            None => alloc::handle_alloc_error(new_layout),
        };
        self.cap = new_cap;
    }

    pub fn push(&mut self, x: T) {
        if self.len == self.cap {
            self.grow();
        }
        unsafe { ptr::write(self.ptr.as_ptr().add(self.len), x) };
        self.len += 1;
    }

    pub fn pop(&mut self) -> Option<T> {
        if self.len == 0 {
            return None;
        }
        self.len -= 1;
        Some(unsafe { ptr::read(self.ptr.as_ptr().add(self.len)) })
    }

    pub fn get(&self, i: usize) -> Option<&T> {
        if i < self.len {
            Some(unsafe { &*self.ptr.as_ptr().add(i) })
        } else {
            None
        }
    }

    pub fn insert(&mut self, i: usize, x: T) {
        assert!(i <= self.len, "índice fora dos limites");
        if self.len == self.cap {
            self.grow();
        }
        unsafe {
            let p = self.ptr.as_ptr().add(i);
            ptr::copy(p, p.add(1), self.len - i);
            ptr::write(p, x);
        }
        self.len += 1;
    }

    pub fn remove(&mut self, i: usize) -> T {
        assert!(i < self.len, "índice fora dos limites");
        unsafe {
            self.len -= 1;
            let p = self.ptr.as_ptr().add(i);
            let x = ptr::read(p);
            ptr::copy(p.add(1), p, self.len - i);
            x
        }
    }

    pub fn len(&self) -> usize {
        self.len
    }

    pub fn capacity(&self) -> usize {
        self.cap
    }

    pub fn as_slice(&self) -> &[T] {
        unsafe { std::slice::from_raw_parts(self.ptr.as_ptr(), self.len) }
    }
}

impl<T> Drop for MyVec<T> {
    fn drop(&mut self) {
        while self.pop().is_some() {}
        if self.cap > 0 {
            unsafe { alloc::dealloc(self.ptr.as_ptr() as *mut u8, Layout::array::<T>(self.cap).unwrap()) };
        }
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
