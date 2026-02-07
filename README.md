# FINAL-YEAR-PROJECT-DEGREE-SECURE-CLOUD-BASED-FILE-STORAGE-SYSTEM-WITH-ENCRYPTION

# Secure Cloud-Based File Storage System with Encryption

This project is a Secure Cloud-Based File Storage System designed to protect user data by encrypting files before storing them in the cloud. The system ensures confidentiality and secure access, even if the cloud storage provider is compromised.

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
- Frontend: Web / Android (adjust based on implementation)
- Backend: Application server with Firebase integration
- Cloud Platform: Firebase
- Database: Firebase Firestore / Realtime Database
- Storage: Firebase Cloud Storage
- Encryption: AES-256 with secure key derivation (e.g., PBKDF2)

---

## Cloud Setup (Firebase Required)

This project requires Firebase to be configured before running the system.

### Create Firebase Project
1. Go to the Firebase Console
2. Click **Add project**
3. Create a new project (example: `secure-cloud-encryption`)

### Enable Firebase Services
1. Enable **Authentication** and turn on Email/Password sign-in
2. Enable **Firestore Database** or **Realtime Database**
3. Enable **Firebase Storage** for encrypted file storage

### Add Firebase App Configuration
1. Open Firebase Project Settings → **Your Apps**
2. Register your application (Web / Android)
3. Download the configuration file:
   - Web: Firebase configuration object
   - Android: `google-services.json`

### Insert Firebase Configuration into Project
- Web: Add Firebase config inside `firebaseConfig.js` (or equivalent)
- Android: Place `google-services.json` inside the `app/` directory

> ⚠️ Do not upload private keys, credentials, or sensitive configuration files to GitHub.  
> Use environment variables and `.gitignore` where applicable.

---

## Local Setup and Installation

### Prerequisites
1. Git installed
2. Internet connection
3. Runtime environment (based on implementation):
   - PHP 8+ with XAMPP  
   OR  
   - Python 3.10+  
   OR  
   - Node.js

### Clone the Repository
```bash
git clone https://github.com/<your-username>/<repo-name>.git

Navigate to the Project Directory
cd <repo-name>

Run the Project
PHP (XAMPP)
1. Move the project folder into htdocs
2. Start Apache (and MySQL if used)
3. Open the browser and access:
http://localhost/<project-folder>
