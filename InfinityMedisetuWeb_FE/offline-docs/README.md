# Offline Desktop App Documentation

Welcome to the documentation for the Medi-Setu Offline-First Desktop Application. This folder contains detailed information on the architectural decisions, database schemas, and synchronization mechanisms built into the Electron desktop client.

## Table of Contents

1. [System Architecture & Flow](./architecture.md)
2. [Database Schema & Migrations](./database-schema.md)
3. [Sync Engine & Data Bootstrap](./sync-engine.md)

## High-Level Summary

The desktop application is built to provide an **Offline-First** experience for clinics using Medi-Setu. 
It consists of a React frontend (the Renderer) and a Node.js backend (the Main Process) bundled together via Electron.

**Key Achievements:**
- **Local SQLite Database:** A fully managed local database (`better-sqlite3`) that stores data directly on the user's hard drive.
- **IPC Bridge & Transport Layer:** A secure communication layer allowing the React UI to request offline data without exposing Node.js APIs to the browser context. RTK Query automatically falls back to `window.ipcAPI` and gracefully handles generic unported endpoints to prevent network crashes.
- **Domain-Driven Design (DDD):** A clean backend architecture separating IPC handlers, Application Services, and Repositories.
- **Pull Sync Engine:** A background service that securely caches the user's authentication token and synchronizes Master Data (Doctors, Services) from the Cloud REST API directly into the local SQLite database.
- **Push Sync Engine:** A continuous background worker that monitors local offline write operations via an `event_log` table and replays those HTTP requests to the Cloud API once internet connectivity is restored.
- **Cloud UUID Preservation:** Local records maintain the exact same UUIDs as the PostgreSQL Cloud database, dynamically replacing local temporary IDs with Cloud IDs upon successful synchronization to ensure relational integrity.
