# SignBridge AI 🤟

## AI-Powered Communication Bridge for Indian Sign Language

SignBridge AI is an accessibility-focused platform designed to bridge communication between sign-language users and non-signers.

The system connects:

- Speech
- Text
- Indian Sign Language
- AI-based language processing

## Features

### 1. Media → Sign Language

Users can upload audio or video content.

Pipeline:

Media
↓
Speech/Text Extraction
↓
AI Processing
↓
ISL Gloss
↓
Sign Avatar

### 2. Live Sign → Speech

Users can use their camera to communicate through sign language.

Pipeline:

Camera
↓
Sign Recognition
↓
Text
↓
Speech

### 3. Live Speech → Sign Language

Users can speak through a microphone.

Pipeline:

Speech
↓
Speech-to-Text
↓
AI Language Processing
↓
ISL Gloss
↓
Sign Avatar

## Technology Stack

- Python
- Flask
- HTML
- CSS
- JavaScript
- Web Speech API
- Computer Vision
- Natural Language Processing
- Indian Sign Language

## Project Structure

```text
SignBridge AI/
│
├── app.py
├── modules/
├── templates/
├── static/
├── models/
└── uploads/