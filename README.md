# 🤖 Rishabh AI — Enterprise 24/7 WhatsApp Multimodal Bot & CRM

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Runtime](https://img.shields.io/badge/Node.js%20%2F%20Python-Backend-3776AB?style=flat&logo=python&logoColor=white)](#)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-AI_Engine-8E75C2?style=flat&logo=google&logoColor=white)](#)
[![WhatsApp Cloud API](https://img.shields.io/badge/Meta_WhatsApp-Cloud_API-25D366?style=flat&logo=whatsapp&logoColor=white)](#)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat&logo=docker&logoColor=white)](#)
[![SQLite](https://img.shields.io/badge/SQLite-CRM_Database-003B57?style=flat&logo=sqlite&logoColor=white)](#)

An intelligent, cloud-native **24/7 WhatsApp AI Assistant and CRM Lead Automation System** engineered with **Meta WhatsApp Cloud API** and **Google Gemini AI**. Built to handle high-concurrency customer inquiries, multimodal image/voice document understanding, and automated CRM database lead logging.

---

## 🚀 Key Features

- 🧠 **Google Gemini AI Integration:** Context-aware bilingual conversational intelligence (Hindi & English).
- 👁️ **Multimodal Capabilities:** Real-time OCR receipt scanning, document reading, and voice note transcription.
- ⚡ **24/7 Webhook Service:** High-performance Meta WhatsApp Cloud API webhook handler for instant response delivery.
- 🗄️ **Automated CRM Database:** Automatically captures customer contact info, query intent, and timestamps into SQLite/MySQL.
- 🐳 **Docker Containerization:** One-command production deployment with isolated dependencies and minimal memory footprint.

---

## 🏗️ Architecture Flow

```text
User WhatsApp Message 📲
        │
        ▼
Meta WhatsApp Cloud API (Webhooks)
        │
        ▼
Node.js / Python Backend Engine ⚙️
        ├──► Google Gemini AI (Multimodal NLU & Vision) 🧠
        └──► SQLite / MySQL Lead CRM Database 🗄️
        │
        ▼
Instant Automated Reply to User ⚡
