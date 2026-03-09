package com.tefera.rag_document_qna.repository;

import com.tefera.rag_document_qna.model.ChatHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatHistoryRepository extends JpaRepository<ChatHistory, String> {

    List<ChatHistory> findBySessionIdOrderByCreatedAtAsc(String sessionId);
    
    void deleteBySessionId(String sessionId);
}