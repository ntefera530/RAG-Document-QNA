package com.tefera.rag_document_qna.controller;

import com.tefera.rag_document_qna.dto.DocumentResponse;
import com.tefera.rag_document_qna.dto.QuestionRequest;
import com.tefera.rag_document_qna.dto.QuestionResponse;
import com.tefera.rag_document_qna.service.RagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RagController {

    private final RagService ragService;

    @PostMapping("/documents/upload")
    public ResponseEntity<DocumentResponse> uploadDocument(
            @RequestParam("file") MultipartFile file) throws IOException {
        log.info("Received document upload request: {}", file.getOriginalFilename());
        DocumentResponse response = ragService.ingestDocument(file);
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/documents/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable String id) {
        log.info("Received delete request for document: {}", id);
        ragService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/documents")
    public ResponseEntity<List<DocumentResponse>> getAllDocuments() {
        return ResponseEntity.ok(ragService.getAllDocuments());
    }

    @PostMapping("/ask")
    public ResponseEntity<QuestionResponse> askQuestion(
            @Valid @RequestBody QuestionRequest request) {
        log.info("Received question: {}", request.getQuestion());
        QuestionResponse response = ragService.askQuestion(
                request.getQuestion(),
                request.getDocumentId()
        );
        return ResponseEntity.ok(response);
    }
}