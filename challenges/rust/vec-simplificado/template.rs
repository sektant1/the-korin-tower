#![allow(dead_code, unused_variables, unused_imports)]
use std::alloc::{self, Layout};
use std::ptr::{self, NonNull};

// Os campos são escolha sua. O main (que lê os comandos) já existe e usa estes métodos.
pub struct MyVec<T> {
    ptr: NonNull<T>,
    cap: usize,
    len: usize,
}

impl<T> MyVec<T> {
    pub fn new() -> Self {
        MyVec { ptr: NonNull::dangling(), cap: 0, len: 0 }
    }
    pub fn push(&mut self, x: T) { todo!() }
    pub fn pop(&mut self) -> Option<T> { todo!() }
    pub fn get(&self, i: usize) -> Option<&T> { todo!() }
    pub fn insert(&mut self, i: usize, x: T) { todo!() }
    pub fn remove(&mut self, i: usize) -> T { todo!() }
    pub fn len(&self) -> usize { self.len }
    pub fn capacity(&self) -> usize { self.cap }
    pub fn as_slice(&self) -> &[T] { todo!() }
}

impl<T> Drop for MyVec<T> {
    fn drop(&mut self) { todo!() }
}
