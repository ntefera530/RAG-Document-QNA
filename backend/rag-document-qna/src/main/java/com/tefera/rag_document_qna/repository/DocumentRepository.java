package com.tefera.rag_document_qna.repository;

import com.tefera.rag_document_qna.model.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, String> {

    List<Document> findByStatus(String status);
    
    List<Document> findByFileType(String fileType);
    
    boolean existsByFileName(String fileName);
}