package com.library.library_api.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.library.library_api.model.Book;

public interface BookRepository extends JpaRepository<Book, Long> {
}