# FINAL-YEAR-PROJECT-DEGREE-SECURE-CLOUD-BASED-FILE-STORAGE-SYSTEM-WITH-ENCRYPTION

# Secure Cloud-Based File Storage System with Encryption

This project is a Secure Cloud-Based File Storage System designed to protect user files by encrypting them before storing them in the cloud. The system ensures that sensitive data remains confidential even if the cloud storage is compromised.

This project was developed as a Final Year Project (FYP) for academic purposes.

---

## Features
1. User authentication (Register & Login)
2. Secure file upload with encryption
3. Secure file download with decryption
4. Cloud-based storage using Firebase
5. Access control to prevent unauthorized file access

---

## Tech Stack
- Frontend: (e.g. Web / Android / Flutter – adjust if needed)
- Backend: (e.g. PHP / Python / Firebase integration)
- Cloud Platform: Firebase
- Database: Firebase Firestore / Realtime Database
- Storage: Firebase Cloud Storage
- Encryption: AES-256 with key derivation (e.g. PBKDF2)

---

## Cloud Setup (Firebase Required)

This project **requires Firebase to be configured** before it can run properly.

### 1. Create Firebase Project
1. Go to the Firebase Console
2. Click **Add project**
3. Create a new project (example: `secure-cloud-encryption`)

### 2. Enable Firebase Services
Enable the following services based on the project implementation:
1. **Authentication**
   - Enable Email/Password authentication
2. **Firestore Database** or **Realtime Database**
   - Create a database and configure basic security rules
3. **Firebase Storage**
   - Used to store encrypted user files

### 3. Add Firebase App
1. Open Firebase Project Settings → **Your Apps**
2. Register your application (Web / Android)
3. Download the configuration file:
   - Web: Firebase config object
   - Android: `google-services.json`

### 4. Insert Firebase Configuration
Add the Firebase configuration into the project:
- Web: Place config inside `firebaseConfig.js` (or equivalent)
- Android: Place `google-services.json` inside the `app/` directory

> ⚠️ Important:  
> Do NOT upload private keys, credentials, or secret configuration files to GitHub.

---

## How to Run (Local Setup)

### Prerequisites
1. Git
2. Internet connection
3. Required runtime environment (example):
   - PHP 8+ with XAMPP  
   **OR**
   - Python 3.10+  
   **OR**
   - Node.js (if applicable)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/<repo-name>.git
