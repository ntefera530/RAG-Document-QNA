package com.tefera.rag_document_qna.service;

import com.tefera.rag_document_qna.dto.DocumentResponse;
import com.tefera.rag_document_qna.dto.QuestionResponse;
import com.tefera.rag_document_qna.model.Document;
import com.tefera.rag_document_qna.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.DocumentReader;
import org.springframework.ai.reader.TextReader;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagService {

    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final DocumentRepository documentRepository;

    public DocumentResponse ingestDocument(MultipartFile file) throws IOException {
        log.info("Ingesting document: {}", file.getOriginalFilename());

        // Save document metadata to DB
        Document document = Document.builder()
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .content(new String(file.getBytes(), StandardCharsets.UTF_8))
                .status("PROCESSING")
                .build();
        document = documentRepository.save(document);

        try {
            // Convert file to Spring AI documents and store in vector store
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            org.springframework.ai.document.Document aiDoc =
                    new org.springframework.ai.document.Document(content);
            aiDoc.getMetadata().put("documentId", document.getId());
            aiDoc.getMetadata().put("fileName", file.getOriginalFilename());

            vectorStore.add(List.of(aiDoc));

            // Update status to COMPLETED
            document.setStatus("COMPLETED");
            documentRepository.save(document);

            log.info("Document ingested successfully: {}", file.getOriginalFilename());

        } catch (Exception e) {
            document.setStatus("FAILED");
            documentRepository.save(document);
            log.error("Failed to ingest document: {}", e.getMessage());
            throw e;
        }

        return mapToResponse(document);
    }

    public QuestionResponse askQuestion(String question, String documentId) {
        log.info("Processing question: {}", question);

        try {
            // Search for relevant chunks in vector store
            SearchRequest searchRequest = SearchRequest.builder()
                    .query(question)
                    .topK(4)
                    .build();

            List<org.springframework.ai.document.Document> relevantDocs =
                    vectorStore.similaritySearch(searchRequest);

            // Build context from relevant chunks
            String context = relevantDocs.stream()
                    .map(org.springframework.ai.document.Document::getText)
                    .collect(Collectors.joining("\n\n"));

            // Build prompt with context
            String prompt = """
                    You are a helpful assistant that answers questions based on the provided document context.
                    
                    Context:
                    %s
                    
                    Question: %s
                    
                    Please provide a clear and accurate answer based only on the context provided.
                    If the answer cannot be found in the context, say so clearly.
                    """.formatted(context, question);

            // Call Ollama via Spring AI
            String answer = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();

            return QuestionResponse.builder()
                    .answer(answer)
                    .documentId(documentId)
                    .success(true)
                    .build();

        } catch (Exception e) {
            log.error("Failed to process question: {}", e.getMessage());
            return QuestionResponse.builder()
                    .answer(null)
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    public List<DocumentResponse> getAllDocuments() {
        return documentRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private DocumentResponse mapToResponse(Document document) {
        return DocumentResponse.builder()
                .id(document.getId())
                .fileName(document.getFileName())
                .fileType(document.getFileType())
                .status(document.getStatus())
                .uploadedAt(document.getUploadedAt())
                .build();
    }
}