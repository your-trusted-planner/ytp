# DOCX Processing Architecture - Cloudflare Native

## Overview

This document describes the asynchronous DOCX processing architecture using Cloudflare Workers, Queues, R2, and D1.

## Architecture Diagram

```mermaid
sequenceDiagram
    participant Client
    participant UploadAPI as Upload API<br/>/api/documents/upload
    participant R2 as R2 Blob Storage
    participant D1 as D1 Database
    participant Queue as Cloudflare Queue
    participant Consumer as Queue Consumer<br/>(Background Worker)
    participant StatusAPI as Status API<br/>/api/documents/[id]/status
    participant Parser as DOCX Parser<br/>(fflate + fast-xml-parser)

    Note over Client,Parser: Phase 1: Upload & Queue

    Client->>UploadAPI: POST /api/documents/upload<br/>(multipart/form-data)
    UploadAPI->>R2: Store original DOCX<br/>documents/{userId}/{docId}.docx
    R2-->>UploadAPI: Blob URL
    UploadAPI->>D1: INSERT document record<br/>(status='processing')
    D1-->>UploadAPI: Document ID
    UploadAPI->>Queue: Send message<br/>{docId, userId, blobPath}
    Queue-->>UploadAPI: Queued
    UploadAPI-->>Client: 200 OK<br/>{documentId, status: 'processing'}

    Note over Client,Parser: Phase 2: Background Processing

    Queue->>Consumer: Deliver batch of messages
    Consumer->>R2: Fetch DOCX file<br/>by blobPath
    R2-->>Consumer: ArrayBuffer
    Consumer->>Parser: parseDocx(buffer)
    Parser->>Parser: 1. unzipSync()<br/>Extract word/document.xml
    Parser->>Parser: 2. Parse XML<br/>Extract paragraphs
    Parser->>Parser: 3. Build output<br/>{text, html, paragraphs}
    Parser-->>Consumer: Parsed content
    Consumer->>D1: UPDATE document<br/>SET content_text, content_html<br/>status='completed'
    D1-->>Consumer: Updated
    Consumer->>Queue: message.ack()

    Note over Client,Parser: Phase 3: Status Polling

    Client->>StatusAPI: GET /api/documents/{id}/status
    StatusAPI->>D1: SELECT status, content_text<br/>WHERE id = ?
    D1-->>StatusAPI: {status: 'completed', content_text, content_html}
    StatusAPI-->>Client: 200 OK<br/>{status: 'completed', ...}
    Client->>Client: Display processed content

    Note over Client,Parser: Error Handling

    Consumer->>D1: UPDATE status='failed'<br/>error_message=...
    Consumer->>Queue: message.retry()<br/>(automatic retry)
```

## Component Flow Diagram

```mermaid
flowchart TB
    subgraph Client["Client Application"]
        Upload[Upload Component]
        Status[Status Polling]
        Display[Display Content]
    end

    subgraph CloudflareWorkers["Cloudflare Workers"]
        UploadAPI[Upload API Handler]
        StatusAPI[Status API Handler]
        Consumer[Queue Consumer Worker]
    end

    subgraph Storage["Cloudflare Storage"]
        R2[R2 Blob Storage<br/>Original DOCX Files]
        D1[(D1 Database<br/>Metadata & Content)]
    end

    subgraph Processing["Processing Layer"]
        Queue[Cloudflare Queue<br/>document-processing]
        Parser[Custom DOCX Parser<br/>fflate + fast-xml-parser]
    end

    Upload -->|1. POST file| UploadAPI
    UploadAPI -->|2. Store original| R2
    UploadAPI -->|3. Create record<br/>status='processing'| D1
    UploadAPI -->|4. Send message| Queue
    UploadAPI -->|5. Return documentId| Upload

    Queue -->|6. Trigger| Consumer
    Consumer -->|7. Fetch file| R2
    Consumer -->|8. Parse| Parser
    Parser -->|9. Extract content| Consumer
    Consumer -->|10. Update record<br/>status='completed'| D1

    Status -->|11. Poll status| StatusAPI
    StatusAPI -->|12. Query| D1
    StatusAPI -->|13. Return status| Status
    Status -->|14. Display when complete| Display

    style Client fill:#e1f5ff
    style CloudflareWorkers fill:#fff4e6
    style Storage fill:#e8f5e9
    style Processing fill:#f3e5f5
```

## Data Flow

```mermaid
graph LR
    subgraph Input
        DOCX[DOCX File<br/>80-100 pages<br/>~300KB-1.5MB]
    end

    subgraph Upload["Upload Phase"]
        R2Store[R2 Storage<br/>Original DOCX]
        DBPending[D1 Record<br/>status: processing]
        QueueMsg[Queue Message<br/>{docId, path}]
    end

    subgraph Processing["Processing Phase"]
        Unzip[fflate.unzipSync<br/>Extract ZIP]
        XML[Extract<br/>word/document.xml]
        Parse[fast-xml-parser<br/>Parse XML]
        Extract[Extract Text<br/>from w:t nodes]
    end

    subgraph Output["Output Phase"]
        Text[Plain Text]
        HTML[HTML Content]
        Metadata[Paragraph Metadata]
        DBComplete[D1 Record<br/>status: completed]
    end

    DOCX --> R2Store
    DOCX --> DBPending
    R2Store --> QueueMsg

    QueueMsg --> Unzip
    Unzip --> XML
    XML --> Parse
    Parse --> Extract

    Extract --> Text
    Extract --> HTML
    Extract --> Metadata
    Text --> DBComplete
    HTML --> DBComplete
    Metadata --> DBComplete
```

## Database Schema

### documents table

```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  blob_path TEXT NOT NULL,

  -- Processing status
  status TEXT NOT NULL CHECK(status IN ('processing', 'completed', 'failed')),

  -- Extracted content
  content_text TEXT,
  content_html TEXT,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at INTEGER NOT NULL,
  processed_at INTEGER,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_documents_user_status ON documents(user_id, status);
CREATE INDEX idx_documents_status ON documents(status);
```

## DOCX File Structure

```mermaid
graph TD
    DOCX[DOCX File<br/>ZIP Archive]

    DOCX --> DocXML[word/document.xml<br/>Main Content]
    DOCX --> StyleXML[word/styles.xml<br/>Formatting]
    DOCX --> RelsXML[_rels/.rels<br/>Relationships]
    DOCX --> Media[word/media/*<br/>Images]

    DocXML --> Body[w:body]
    Body --> Para1[w:p - Paragraph 1]
    Body --> Para2[w:p - Paragraph 2]
    Body --> ParaN[w:p - Paragraph N]

    Para1 --> Run1[w:r - Run 1]
    Para1 --> Run2[w:r - Run 2]

    Run1 --> Text1[w:t - Text Node]
    Run2 --> Text2[w:t - Text Node]

    style DOCX fill:#ffeb3b
    style DocXML fill:#4caf50
    style Body fill:#2196f3
    style Para1 fill:#9c27b0
    style Run1 fill:#f44336
    style Text1 fill:#ff9800
```

## Key Benefits

### 1. Asynchronous Processing
- Upload returns immediately (~100ms)
- Processing happens in background
- No timeout issues for large files

### 2. Scalability
- Queue handles 100+ concurrent uploads
- Consumer processes batches efficiently
- Automatic retry on failures

### 3. Reliability
- Guaranteed message delivery
- Automatic retries with exponential backoff
- Dead letter queue for permanent failures

### 4. Performance
- Upload: ~100-200ms
- Queue latency: ~50-100ms
- Processing 100-page doc: ~1-3 seconds
- Total user-perceived time: <200ms (async)

### 5. Cost Efficiency
- No external services
- R2: $0.015/GB storage
- Queue: Included in Workers plan
- D1: First 5GB free

## Implementation Checklist

- [ ] Install dependencies (`fflate`, `fast-xml-parser`)
- [ ] Create DOCX parser utility
- [ ] Update `wrangler.jsonc` with queue config
- [ ] Implement upload API endpoint
- [ ] Implement queue consumer
- [ ] Implement status polling endpoint
- [ ] Add database migration for documents table
- [ ] Create frontend upload component with polling
- [ ] Test with sample 100-page documents
- [ ] Add error handling and monitoring
- [ ] Deploy to production

## Alternative: Cloudflare Workflows

For even more complex processing pipelines, consider using **Cloudflare Workflows** (currently in beta):

```mermaid
graph LR
    Upload[Upload] --> Workflow[Workflow Instance]
    Workflow --> Step1[Step 1: Validate]
    Step1 --> Step2[Step 2: Parse DOCX]
    Step2 --> Step3[Step 3: Extract Metadata]
    Step3 --> Step4[Step 4: Store Content]
    Step4 --> Step5[Step 5: Notify User]
```

Workflows provide:
- Up to 1024 steps per workflow
- Built-in state management
- Automatic retries and error handling
- Durable execution

## Security Considerations

1. **Authentication**: Verify user session on upload
2. **File Validation**: Check file type and size limits
3. **Path Sanitization**: Prevent path traversal attacks
4. **Quota Enforcement**: Limit uploads per user/day
5. **Virus Scanning**: Consider integration with scanning service
6. **Access Control**: Ensure users can only access their documents

## Monitoring & Observability

```typescript
// Add to queue consumer
export default {
  async queue(batch: MessageBatch, env: Env) {
    const startTime = Date.now()

    for (const message of batch.messages) {
      try {
        // Processing logic...

        // Log metrics
        console.log({
          event: 'document_processed',
          documentId: message.body.documentId,
          duration: Date.now() - startTime,
          fileSize: buffer.byteLength
        })
      } catch (error) {
        // Log errors
        console.error({
          event: 'document_processing_failed',
          documentId: message.body.documentId,
          error: error.message,
          stack: error.stack
        })
      }
    }
  }
}
```

## Future Enhancements

1. **Streaming Processing**: For very large files (>10MB)
2. **Format Preservation**: Extract tables, lists, formatting
3. **Image Extraction**: Store embedded images separately
4. **OCR Integration**: Extract text from images in documents
5. **Version Control**: Track document revisions
6. **Bulk Processing**: Process multiple documents in one upload
7. **Webhooks**: Notify external systems when processing completes
