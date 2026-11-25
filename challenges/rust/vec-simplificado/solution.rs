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
