package com.tefera.rag_document_qna.service;

import com.tefera.rag_document_qna.dto.DocumentResponse;
import com.tefera.rag_document_qna.dto.QuestionResponse;
import com.tefera.rag_document_qna.model.ChatHistory;
import com.tefera.rag_document_qna.model.Document;
import com.tefera.rag_document_qna.repository.DocumentRepository;
import com.tefera.rag_document_qna.repository.ChatHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.DocumentReader;
import org.springframework.ai.reader.TextReader;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.Loader;

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
	private final ChatHistoryRepository chatHistoryRepository;

    public DocumentResponse ingestDocument(MultipartFile file) throws IOException {
        log.info("Ingesting document: {}", file.getOriginalFilename());

        // Extract text based on file type
        String content;
        String fileType = file.getContentType();
        
        if (fileType != null && fileType.equals("application/pdf")) {
            // Extract text from PDF using PDFBox
        	try (PDDocument pdDocument = Loader.loadPDF(file.getBytes())) {
        	    PDFTextStripper stripper = new PDFTextStripper();
        	    content = stripper.getText(pdDocument);
        	}
        } else {
            // Plain text extraction
            content = new String(file.getBytes(), StandardCharsets.UTF_8);
        }

        // Save document metadata to DB
        Document document = Document.builder()
                .fileName(file.getOriginalFilename())
                .fileType(fileType)
                .content(content)
                .status("PROCESSING")
                .build();
        document = documentRepository.save(document);

        try {
            org.springframework.ai.document.Document aiDoc =
                    new org.springframework.ai.document.Document(content);
            aiDoc.getMetadata().put("documentId", document.getId());
            aiDoc.getMetadata().put("fileName", file.getOriginalFilename());

            vectorStore.add(List.of(aiDoc));

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
    
    public void deleteDocument(String documentId) {
        log.info("Deleting document: {}", documentId);
        
        // Remove from vector store
        vectorStore.delete(List.of(documentId));
        
        // Remove from database
        documentRepository.deleteById(documentId);
        
        log.info("Document deleted successfully: {}", documentId);
    }

    public QuestionResponse askQuestion(String question, String documentId, String sessionId) {
        log.info("Processing question: {}", question);

        try {
            // Generate session ID if not provided
            if (sessionId == null || sessionId.isEmpty()) {
                sessionId = java.util.UUID.randomUUID().toString();
            }

            // Save user message to history
            chatHistoryRepository.save(ChatHistory.builder()
                    .sessionId(sessionId)
                    .role("user")
                    .content(question)
                    .build());

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

            // Get previous conversation history
            List<ChatHistory> history = chatHistoryRepository
                    .findBySessionIdOrderByCreatedAtAsc(sessionId);

            // Build conversation history string
            String conversationHistory = history.stream()
                    .map(h -> h.getRole().toUpperCase() + ": " + h.getContent())
                    .collect(Collectors.joining("\n"));

            // Build prompt with context and history
            String prompt = """
                    You are a helpful assistant that answers questions based on the provided document context.
                    
                    Context from documents:
                    %s
                    
                    Conversation history:
                    %s
                    
                    Current question: %s
                    
                    Please provide a clear and accurate answer based on the context provided.
                    If the answer cannot be found in the context, say so clearly.
                    """.formatted(context, conversationHistory, question);

            // Call Ollama via Spring AI
            String answer = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();

            // Save assistant response to history
            String finalSessionId = sessionId;
            chatHistoryRepository.save(ChatHistory.builder()
                    .sessionId(finalSessionId)
                    .role("assistant")
                    .content(answer)
                    .build());

            return QuestionResponse.builder()
                    .answer(answer)
                    .documentId(documentId)
                    .sessionId(finalSessionId)
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