#!/bin/bash
echo "Waiting for Ollama to start..."
until ollama list > /dev/null 2>&1; do
    sleep 2
done

echo "Pulling nomic-embed-text..."
ollama pull nomic-embed-text

echo "Pulling llama3.1:8b..."
ollama pull llama3.1:8b

echo "Models ready!"