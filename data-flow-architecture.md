# SkyCrate Data Flow Architecture

## Main Data Flow Diagram

```mermaid
graph TB
    subgraph "Frontend"
        A[React Components]
        B[API Service]
        C[Local Storage]
    end
    
    subgraph "Backend API"
        D[Express Routes]
        E[Authentication Middleware]
        F[Request Processing]
    end
    
    subgraph "Services"
        G[File Service]
        H[AWS Service]
        I[Storage Service]
        J[Billing Service]
        K[Version Service]
    end
    
    subgraph "Data Models"
        L[User Model]
        M[File Model]
        N[Shared File Model]
        O[Billing Model]
        P[JSON Files]
    end
    
    subgraph "Storage"
        Q[AWS S3]
        R[Local Files]
    end
    
    %% Data Flow Connections
    A --> B
    B --> D
    D --> E
    E --> F
    F --> G
    
    G --> H
    G --> I
    G --> J
    G --> K
    
    H --> Q
    I --> H
    J --> L
    J --> M
    J --> N
    J --> O
    K --> M
    
    L --> P
    M --> P
    N --> P
    O --> P
    
    P --> R
    
    %% Response Flow
    Q --> H
    H --> G
    G --> F
    F --> E
    E --> D
    D --> B
    B --> A
    
    classDef frontend fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef backend fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef services fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef storage fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class A,B,C frontend
    class D,E,F backend
    class G,H,I,J,K services
    class L,M,N,O,P data
    class Q,R storage
```

## Core Data Flows

### 1. User Registration Data Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant Auth as Auth Service
    participant User as User Model
    participant AWS as AWS Service
    participant S3 as AWS S3
    
    UI->>API: POST /auth/register (userData)
    API->>Auth: Validate user data
    Auth->>User: Create user record
    User->>AWS: Create S3 bucket
    AWS->>S3: Create bucket with security config
    S3->>AWS: Bucket created
    AWS->>User: Bucket name returned
    User->>API: User data with bucket info
    API->>UI: JWT token + user data
    UI->>C: Store token and user data
```

### 2. File Upload Data Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant File as File Service
    participant AWS as AWS Service
    participant S3 as AWS S3
    participant Data as File Model
    participant Storage as JSON Files
    
    UI->>API: POST /files/upload (file + metadata)
    API->>File: Process upload request
    File->>AWS: Check bucket exists
    AWS->>S3: Verify bucket
    S3->>AWS: Bucket status
    AWS->>File: Bucket confirmed
    
    File->>Storage: Get existing files (for versioning)
    Storage->>File: File list returned
    
    File->>AWS: Upload file to S3
    AWS->>S3: PutObjectCommand
    S3->>AWS: File uploaded
    AWS->>File: Signed URL generated
    
    File->>Data: Create file record
    Data->>Storage: Save to JSON files
    Storage->>Data: Record saved
    
    Data->>File: File record returned
    File->>API: Upload response
    API->>UI: Success + file details
```

### 3. File Download Data Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant File as File Service
    participant AWS as AWS Service
    participant S3 as AWS S3
    
    UI->>API: GET /files/{id}/download
    API->>File: Get file metadata
    File->>Data: Find file record
    Data->>File: File details returned
    
    File->>AWS: Generate presigned URL
    AWS->>S3: Create presigned URL
    S3->>AWS: URL generated
    AWS->>File: Signed URL returned
    
    File->>API: Download URL
    API->>UI: Presigned URL
    UI->>S3: Direct download via URL
```

### 4. File Sharing Data Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant Share as Shared Files Service
    participant AWS as AWS Service
    participant S3 as AWS S3
    participant Data as Shared File Model
    participant Storage as JSON Files
    
    UI->>API: POST /shared-files (fileId + expiry)
    API->>Share: Create share request
    Share->>Data: Find file record
    Data->>Share: File details returned
    
    Share->>AWS: Generate presigned share URL
    AWS->>S3: Create share URL
    S3->>AWS: Share URL generated
    AWS->>Share: Share URL returned
    
    Share->>Data: Create share record
    Data->>Storage: Save share metadata
    Storage->>Data: Share record saved
    
    Data->>Share: Share record returned
    Share->>API: Share response
    API->>UI: Share URL
```

### 5. File Deletion Data Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant File as File Service
    participant AWS as AWS Service
    participant S3 as AWS S3
    participant Data as File Model
    participant Storage as JSON Files
    
    UI->>API: DELETE /files/{id}
    API->>File: Delete file request
    File->>Data: Find file record
    Data->>File: File details returned
    
    File->>AWS: Delete from S3
    AWS->>S3: DeleteObjectCommand
    S3->>AWS: File deleted
    AWS->>File: S3 deletion confirmed
    
    File->>Data: Delete file record
    Data->>Storage: Remove from JSON files
    Storage->>Data: Record deleted
    
    Data->>File: Deletion confirmed
    File->>API: Delete response
    API->>UI: Success message
```

### 6. Storage Class Change Data Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant File as File Service
    participant Storage as Storage Service
    participant Data as File Model
    participant Billing as Billing Service
    
    UI->>API: PUT /files/{id}/storage-class (new class)
    API->>File: Storage class change request
    File->>Data: Find file record
    Data->>File: Current file details
    
    File->>Storage: Calculate new costs
    Storage->>File: Cost analysis returned
    
    File->>Billing: Track billing activity
    Billing->>File: Activity tracked
    
    File->>Data: Update file record
    Data->>Storage: Save updated record
    Storage->>Data: Record updated
    
    Data->>File: Updated file returned
    File->>API: Update response
    API->>UI: Success + cost change
```

### 7. User Authentication Data Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant Auth as Auth Service
    participant User as User Model
    participant C as Local Storage
    
    UI->>API: POST /auth/login (credentials)
    API->>Auth: Validate credentials
    Auth->>User: Find user by email
    User->>Auth: User data returned
    
    Auth->>API: Generate JWT token
    API->>UI: JWT token + user data
    UI->>C: Store token and user data
    
    UI->>API: Authenticated requests
    API->>Auth: Verify JWT token
    Auth->>API: Token valid
    API->>UI: Request processed
```

### 8. Billing Data Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant Billing as Billing Service
    participant Data as Billing Model
    participant Storage as JSON Files
    
    UI->>API: GET /billing/stats
    API->>Billing: Get billing data
    Billing->>Data: Read billing records
    Data->>Storage: Load from JSON files
    Storage->>Data: Records loaded
    
    Data->>Billing: Billing data returned
    Billing->>API: Stats response
    API->>UI: Billing statistics
    
    UI->>API: POST /files/upload (billing tracked)
    API->>Billing: Track activity
    Billing->>Data: Create billing record
    Data->>Storage: Save to JSON files
    Storage->>Data: Record saved
```

## Data Persistence Flow

### JSON File Storage Flow
```mermaid
graph TB
    A[User Request]
    B[Express Route]
    C[Service Layer]
    D[Model Operations]
    E[JSON File Read]
    F[JSON File Write]
    G[File System]
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> G
    G --> F
    F --> D
    D --> C
    C --> B
    B --> A
    
    classDef request fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef service fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef data fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef storage fill:#fff3e0,stroke:#e65100,stroke-width:2px
    
    class A,B request
    class C service
    class D,E,F data
    class G storage
```

## Error Handling Data Flow

### Error Propagation Flow
```mermaid
graph TB
    A[User Action]
    B[Frontend]
    C[API Request]
    D[Express Middleware]
    E[Service Layer]
    F[AWS Service]
    G[Data Layer]
    H[Error Handler]
    I[User Response]
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    
    classDef user fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef system fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef error fill:#fff3e0,stroke:#e65100,stroke-width:2px
    
    class A,B,I user
    class C,D,E,F,G system
    class H error
```

## Data Flow Characteristics

### Synchronous Operations
- User authentication
- File metadata updates
- Storage class changes
- Billing calculations

### Asynchronous Operations
- File uploads to AWS S3
- File downloads via presigned URLs
- Share URL generation
- AWS bucket operations

### Data Transformation Points
1. **Request Validation**: Input sanitization and validation
2. **Data Serialization**: JSON conversion for file storage
3. **URL Generation**: Presigned URL creation for secure access
4. **Cost Calculation**: Storage cost optimization and billing
5. **Version Management**: File version tracking and updates

### Cache Layers
- **Frontend**: React state management
- **API**: Request/response caching
- **Service**: In-memory service state
- **Storage**: File system caching

This data flow architecture shows how information moves through the SkyCrate system from user interactions to persistent storage, with proper error handling and data transformation at each stage.