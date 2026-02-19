# SkyCrate User Authentication Flow

## Authentication Flow Overview

```mermaid
graph TB
    subgraph "User Interface"
        A[Web Browser]
        B[React App]
        C[Login/Register Components]
        D[Protected Routes]
        E[Local Storage]
    end
    
    subgraph "Authentication Flow"
        F[User Input]
        G[Form Validation]
        H[API Request]
        I[JWT Token]
        J[Token Storage]
        K[Route Protection]
        L[Auto Logout]
    end
    
    subgraph "Backend Authentication"
        M[Express Routes]
        N[Authentication Middleware]
        O[JWT Service]
        P[User Model]
        Q[Database]
        R[AWS Service]
        S[S3 Bucket]
    end
    
    subgraph "Security Features"
        T[Password Hashing]
        U[Token Validation]
        V[Rate Limiting]
        W[CORS Protection]
        X[Helmet Security]
    end
    
    %% Flow Connections
    A --> B
    B --> C
    C --> F
    F --> G
    G --> H
    H --> M
    M --> N
    N --> O
    O --> P
    P --> Q
    Q --> R
    R --> S
    
    S --> R
    R --> P
    P --> O
    O --> N
    N --> M
    M --> H
    H --> G
    G --> F
    F --> J
    J --> E
    E --> I
    I --> K
    K --> D
    D --> B
    B --> A
    
    L --> E
    E --> C
    
    T --> N
    U --> N
    V --> M
    W --> M
    X --> M
    
    classDef ui fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef flow fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef backend fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef security fill:#fff3e0,stroke:#e65100,stroke-width:2px
    
    class A,B,C,D,E ui
    class F,G,H,I,J,K,L flow
    class M,N,O,P,Q,R,S backend
    class T,U,V,W,X security
```

## Authentication Sequence Diagrams

### 1. User Registration Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant Form as Form Component
    participant API as Express API
    participant Auth as Auth Middleware
    participant User as User Model
    participant JWT as JWT Service
    participant Storage as Local Storage
    participant AWS as AWS Service
    participant S3 as AWS S3
    
    UI->>Form: Show registration form
    Form->>UI: Collect user data
    UI->>API: POST /auth/register (userData)
    API->>Auth: Validate input
    Auth->>User: Check if email exists
    User->>Auth: Email available
    Auth->>User: Create user record
    User->>AWS: Create S3 bucket
    AWS->>S3: Create bucket with security config
    S3->>AWS: Bucket created
    AWS->>User: Bucket name returned
    User->>JWT: Generate JWT token
    JWT->>User: JWT token created
    User->>API: User data + token
    API->>UI: Success response + token
    UI->>Storage: Store token and user data
    Storage->>UI: Data stored
    UI->>Form: Show success message
```

### 2. User Login Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant Form as Form Component
    participant API as Express API
    participant Auth as Auth Middleware
    participant User as User Model
    participant JWT as JWT Service
    participant Storage as Local Storage
    
    UI->>Form: Show login form
    Form->>UI: Collect credentials
    UI->>API: POST /auth/login (credentials)
    API->>Auth: Validate credentials
    Auth->>User: Find user by email
    User->>Auth: User found
    Auth->>User: Verify password
    User->>Auth: Password valid
    Auth->>JWT: Generate JWT token
    JWT->>Auth: JWT token created
    Auth->>API: Token + user data
    API->>UI: Success response + token
    UI->>Storage: Store token and user data
    Storage->>UI: Data stored
    UI->>Form: Redirect to dashboard
```

### 3. Protected Route Access Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant Router as React Router
    participant API as Express API
    participant Auth as Auth Middleware
    participant JWT as JWT Service
    participant Storage as Local Storage
    
    UI->>Router: Navigate to protected route
    Router->>UI: Check for token
    UI->>Storage: Get token from storage
    Storage->>UI: Token returned
    UI->>Router: Token available
    Router->>API: Request with Authorization header
    API->>Auth: Verify JWT token
    Auth->>JWT: Validate token
    JWT->>Auth: Token valid
    Auth->>API: Authentication passed
    API->>UI: Request processed
    UI->>Router: Show protected content
```

### 4. Token Refresh Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant Auth as Auth Middleware
    participant JWT as JWT Service
    participant Storage as Local Storage
    
    UI->>API: Request with expired token
    API->>Auth: Verify JWT token
    Auth->>JWT: Check token expiry
    JWT->>Auth: Token expired
    Auth->>API: Return 401 Unauthorized
    API->>UI: 401 response
    UI->>Storage: Clear token and user data
    Storage->>UI: Data cleared
    UI->>Router: Redirect to login
    Router->>UI: Show login page
```

### 5. Auto Logout Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant Auth as Auth Middleware
    participant JWT as JWT Service
    participant Storage as Local Storage
    participant Router as React Router
    
    UI->>API: Request with invalid token
    API->>Auth: Verify JWT token
    Auth->>JWT: Validate token
    JWT->>Auth: Token invalid/expired
    Auth->>API: Return 401/403
    API->>UI: Error response
    UI->>Storage: Clear token and user data
    Storage->>UI: Data cleared
    UI->>Router: Redirect to appropriate page
    Router->>UI: Show public page (login/register)
```

### 6. Account Deletion Flow
```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant Auth as Auth Middleware
    participant User as User Model
    participant AWS as AWS Service
    participant S3 as AWS S3
    participant Storage as Local Storage
    
    UI->>API: DELETE /auth/account
    API->>Auth: Verify authentication
    Auth->>User: Get user data
    User->>Auth: User data returned
    Auth->>AWS: Delete S3 bucket
    AWS->>S3: Delete bucket and contents
    S3->>AWS: Bucket deleted
    AWS->>User: Bucket deletion confirmed
    User->>API: User record deleted
    API->>Storage: Clear client data
    Storage->>API: Data cleared
    API->>UI: Account deleted response
    UI->>Router: Redirect to register page
    Router->>UI: Show registration page
```

## Authentication Components

### Frontend Authentication Components
- **Login Component** ([`src/components/Login.js`](src/components/Login.js)): User login interface
- **Register Component** ([`src/components/Register.js`](src/components/Register.js)): User registration interface
- **Protected Route Component** ([`src/App.js`](src/App.js)): Route protection logic
- **API Service** ([`src/services/api.js`](src/services/api.js)): JWT token management

### Backend Authentication Components
- **Auth Routes** ([`server/routes/auth.js`](server/routes/auth.js)): Authentication endpoints
- **Auth Middleware** ([`server/middleware/auth.js`](server/middleware/auth.js)): JWT verification
- **User Model** ([`server/models/User.js`](server/models/User.js)): User data management
- **AWS Service** ([`server/services/awsService.js`](server/services/awsService.js)): Bucket creation/deletion

### Security Middleware
- **Helmet Security** ([`server/middleware/security.js`](server/middleware/security.js)): Security headers
- **CORS Protection** ([`server/middleware/security.js`](server/middleware/security.js)): Cross-origin requests
- **Rate Limiting** ([`server/middleware/security.js`](server/middleware/security.js)): Request throttling

## JWT Token Management

### Token Structure
```json
{
  "userId": "user-uuid",
  "email": "user@example.com",
  "bucketName": "skycrate-user-uuid-timestamp",
  "iat": 1640995200,
  "exp": 1641004800,
  "jti": "token-uuid"
}
```

### Token Flow
1. **Generation**: Created during login/registration
2. **Storage**: Saved in localStorage on client side
3. **Usage**: Added to Authorization header for API requests
4. **Validation**: Verified on each protected request
5. **Expiry**: Automatically refreshed or user re-authenticates

## Security Features

### 1. Password Security
- **Hashing**: Secure password hashing (bcrypt)
- **Salt**: Random salt generation for each password
- **Verification**: Secure password comparison

### 2. Token Security
- **JWT**: JSON Web Token standard
- **Expiry**: Automatic token expiration
- **Signing**: Digital signature verification
- **Revocation**: Token invalidation on logout

### 3. Request Security
- **HTTPS**: Encrypted communication
- **CORS**: Restricted cross-origin requests
- **Rate Limiting**: Protection against brute force
- **Headers**: Security headers (Helmet)

### 4. Data Security
- **Encryption**: AES256 encryption for S3 objects
- **Access Control**: Bucket ownership enforcement
- **Public Access Block**: Prevents accidental public access
- **Input Validation**: Sanitization and validation

## Error Handling in Authentication

### Common Authentication Errors
1. **Invalid Credentials**: 401 Unauthorized
2. **Token Expired**: 401 Unauthorized with auto-redirect
3. **Token Invalid**: 403 Forbidden
4. **User Not Found**: 404 Not Found
5. **Bucket Not Found**: 404 Not Found with redirect to register

### Error Recovery Flow
```mermaid
graph TB
    A[Authentication Error]
    B[Error Detection]
    C[Token Clear]
    D[User Redirect]
    E[Error Display]
    
    A --> B
    B --> C
    C --> D
    D --> E
    
    classDef error fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef recovery fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class A,B error
    class C,D,E recovery
```

## Authentication Configuration

### Environment Variables
```env
JWT_SECRET=your-secret-key-here
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000
```

### JWT Configuration
- **Algorithm**: HS256 (HMAC using SHA-256)
- **Expiry**: 24 hours (configurable)
- **Issuer**: SkyCrate Application
- **Audience**: SkyCrate Users

This authentication flow provides a secure, user-friendly experience with proper error handling, automatic token management, and comprehensive security measures throughout the application.