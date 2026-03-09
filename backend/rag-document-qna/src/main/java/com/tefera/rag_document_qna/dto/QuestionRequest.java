package com.tefera.rag_document_qna.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class QuestionRequest {

    @NotBlank(message = "Question cannot be blank")
    private String question;

    private String documentId;
}