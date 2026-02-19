# SkinScan AI - Master Project Documentation
## Version 1.0 (February 2026)

---

### 1. Complete Project Introduction

#### What is SkinScan AI?
SkinScan AI is a sophisticated, full-stack medical technology platform designed to bridge the gap between AI-driven dermatological preliminary analysis and professional medical consultation. It is a comprehensive ecosystem that combines deep learning, secure cloud computing, and a dual-portal interface for both patients (users) and healthcare providers (doctors).

#### What problem does it solve?
The primary challenge SkinScan AI addresses is the high barrier to early skin lesion detection and the lack of immediate, reliable guidance for skin health concerns. Dermatological conditions are often ignored in their early stages due to:
- **Limited Access**: Scarcity of specialized dermatologists in many regions.
- **Cost and Time**: Long waiting periods for appointments and high consultation fees for minor concerns.
- **Anxiety**: The "cyberchondria" effect, where users search symptoms online and receive terrifying, non-specific results.

#### Why was it created?
SkinScan AI was created to provide a "safety first" preliminary analysis tool. It is not intended to replace a doctor but to empower users with a tool that can:
1. Detect high-risk lesions early using high-accuracy CNN models.
2. Provide immediate triage through a rule-based medical chatbot.
3. Streamline the path to professional care via an integrated doctor appointment system.

#### Target Users
- **Primary Users (Patients)**: Individuals seeking a quick, private, and preliminary check on skin concerns.
- **Doctors/Specialists**: Dermatologists who want to manage appointments and review AI-pre-screened reports.
- **Admins**: System administrators who moderate the AI models, manage user verification, and monitor system health.

#### Core Idea in Simple Language
Think of SkinScan AI as a "Smart Medical Sorter." You take a photo of a skin concern; the AI analyzes it based on thousands of medical images and tells you if it looks suspicious. If it does, or if you're worried, the system connects you directly to a licensed doctor who can review that exact photo and provide a professional diagnosis.

---

### 2. Full System Architecture Explanation

SkinScan AI is built using a modern decoupled architecture, separating the presentation layer from the business logic and AI inference engine.

#### Frontend (Architecture & Tech)
The frontend is built using **HTML5, Vanilla CSS3, and JavaScript (ES6+)**.
- **Reasoning**: We opted for a lightweight local-first approach for Phase 1 & 2 to ensure maximum performance across devices without the overhead of heavy frameworks like React during the rapid prototyping phase. However, the system is designed with a **RESTful mindset**, making it trivial to migrate to React or Next.js in the future.
- **Key Components**:
    - `dashboard.html`: The main user interface.
    - `admin.html`: The management portal for system moderators.
    - `doctor-dashboard.html`: Specialized view for healthcare providers.
    - `script.js`: Core client-side logic handling state and API communication.

#### Backend (Django + Django REST Framework)
The brain of the system is a **Django (Python)** server.
- **Architecture**: It follows the MVT (Model-View-Template) pattern but is primarily utilized as a **REST API provider** via DRF (Django REST Framework).
- **Security**: Implements JWT (JSON Web Tokens) for stateless authentication and bcrypt for industry-standard password hashing.
- **Asynchronous Processing**: Uses a `ThreadPoolExecutor` to handle AI predictions in the background, preventing the UI from freezing during the expensive image analysis phase.

#### Database (MySQL / SQLite Transitional)
- **Current State**: The project recently migrated from **SQLite** (development) to **MySQL** (production-ready).
- **Structure**: Uses a relational schema designed for **3NF (Third Normal Form)** compliance.
- **Separation of Concerns**: User auth is strictly separated from professional doctor profiles to ensure data integrity and easier auditing.

#### AI Model (CNN / Transfer Learning)
The AI pipeline is the most critical technical component.
- **Engine**: Built with **PyTorch** (migrated from an initial Keras/TensorFlow prototype for better performance and dynamic graphing).
- **Backbone**: Uses **ConvNeXt Small**, a state-of-the-art "pure-CNN" architecture that rivals Transformers in accuracy while remaining efficient.
- **Features**: Implements **GeM (Generalized Mean Pooling)** for better feature extraction from skin lesions, which often have irregular shapes.
- **Safety Triage**: A confidence-gated logic ensures that the system returns "Inconclusive" if the model is less than 60% sure, preventing false positives.

#### Chatbot API Integration
- **Now**: Currently a rule-based medical knowledge base.
- **Next**: Planned integration with specialized LLMs (like Med-PaLM or GPT-4 with a skin-specialized system prompt) to provide more conversational and nuanced guidance.

#### Doctor Consultation Module
- **Mechanism**: Connects the `User` and `DoctorProfile` models.
- **Workflow**: User completes a scan → Generates a Report → Report shared with Doctor → Doctor Reviews & provides feedback through the portal.

---

### 3. Development Timeline

#### Phase 1 – Authentication & Access Control (COMPLETED)
The foundation of the project focused on security and multi-tenancy.
- **Registration System**: Validates unique emails and enforces strong password rules.
- **Login Validation**: Implements a lockout mechanism (5 failed attempts locks the account for 1 hour).
- **Database Structure**:
    - `User`: Base identity.
    - `Login`: Credentials and security state.
    - `DoctorProfile`: Professional credentials (MRN, Specialization).
- **Role-Based Access (RBAC)**:
    - **User**: Can scan, chat, and book.
    - **Doctor**: Can manage appointments and view reports.
    - **Admin**: Full control over users, doctors, and AI models.

#### Phase 2 – AI Image Prediction Pipeline (COMPLETED)
This phase transformed the system from a "web app" to an "AI platform."
- **Image Upload Flow**: Supports multi-image analysis (up to 3 photos of the same lesion) to increase accuracy.
- **Preprocessing**: High-pass filtering for blur detection and normalization to the ImageNet standard.
- **Medical Gating**:
    - **High Confidence (>80%)**: Specific disease label and recommendation.
    - **Medium Confidence (60-80%)**: Disease label with a "strong uncertainty" warning.
    - **Inconclusive (<60%)**: Refuses to label, advises seeing a doctor.
- **Dataset Challenges**: Addressed a significant imbalance issue where certain diseases (like Psoriasis) were over-represented, leading to model bias. This was fixed using weighted loss functions and synthetic data augmentation.

#### Phase 3 – UI/UX Design Structure (COMPLETED)
- **Design Philosophy**: "Medical Luxury." Minimalist, clean, using a palette of calming blues and whites with high-contrast call-to-action buttons.
- **Responsiveness**: Entirely mobile-first, ensuring that users can take photos and get results directly on their smartphones.
- **Component System**: Centralized `style.css` ensures consistency across the user, doctor, and admin portals.

#### Phase 4 – Doctor Appointment System (IN PROGRESS)
- **Booking Logic**: Users can select a doctor based on specialty and available time slots.
- **Availability Validation**: Prevents double-booking and ensures appointments are only made within valid working hours.
- **Admin Control**: Admins must "Approve" doctor accounts based on their Medical Registration Number (MRN) before they appear in the user search.

#### Phase 5 – AI Chatbot Integration Plan (PLANNED)
- **Purpose**: To provide a safe space for users to ask follow-up questions after a scan.
- **Knowledge Base**: Curated information for the 10 most common skin diseases.
- **Safety**: Every response is hard-coded to include a medical disclaimer.

---

### 4. Database Schema

#### Core Identity (Authentication Module)
1. **users**
    - `id`: Auto-incrementing Primary Key.
    - `email`: Unique string (Used for login).
    - `first_name` / `last_name`: User identity.
    - `is_doctor`: Boolean flag for quick role check.
    - `account_status`: Enum (ACTIVE, PENDING, LOCKED).

2. **login**
    - `user_id`: One-to-one link to `users`.
    - `password_hash`: Bcrypt hashed string.
    - `login_attempts`: Integer counter for security throttling.
    - `locked_until`: DateTime for security lockout.

3. **doctor_profile** (3NF Expansion)
    - `user_id`: One-to-one link to `users` (where `is_doctor=true`).
    - `medical_license_number`: Unique MRN for verification.
    - `specialization`: String (e.g., Dermatologist, Oncologist).
    - `is_verified`: Boolean (Controlled by Admin).

#### AI & Predictions (Prediction Module)
1. **prediction_jobs**
    - `id`: UUID (Used for async client polling).
    - `user_id`: Foreign Key.
    - `status`: (PENDING, PROCESSING, COMPLETED, FAILED).

2. **skin_images**
    - `id`: Primary Key.
    - `job_id`: Foreign Key to `prediction_jobs`.
    - `image_url`: Path to file (Local/GCS).
    - `quality_score`: Float (calculated via Laplacian variance).

3. **prediction_results**
    - `job_id`: Link to the analysis job.
    - `disease_name`: The predicted label.
    - `confidence_score`: 0.0 to 100.0.
    - `recommendation`: Contextual medical advice.

---

### 5. Current Status

#### ✅ Fully Completed
- **Full Auth Pipeline**: Registration, Login (with lockout), JWT token management.
- **AI Inference Engine**: PyTorch implementation of ConvNeXt Small.
- **3-Image Upload Workflow**: Clients can upload multiple images for a single analysis.
- **Admin Management**: Model moderation (upload/switch), User management.
- **3NF Database Migration**: Separation of user and doctor credentials.

#### ⚠️ Partially Completed
- **Doctor Dashboard**: Basic UI exists, but appointment management logic is currently Being finalized.
- **Medical Knowledge Base**: Chatbot currently uses static rules; needs dynamic retrieval.
- **Report Generation**: PDF export for physical doctor visits is not yet implemented.

#### ❌ Not Started
- **Live Video Consultation**: Future plan for real-time doctor-patient interactions.
- **Payment Gateway**: Integration of Stripe/PayPal for booking consultations.
- **Multi-lingual Support**: Currently English-only.

---

### 6. Known Problems & Technical Debt

1. **Model Imbalance**: The AI model occasionally confuses "Acne" with "Rosacea" due to visual similarities in the training set. Advanced feature-weighting is needed.
2. **F1 Score Lag**: While accuracy is high, the F1 score for rare diseases (like Melanoma) lags slightly behind. This is a critical medical safety priority.
3. **UI Alignment**: The doctor dashboard navigation sidebar has minor overflow issues on specific tablet resolutions.
4. **Local Storage Dependency**: Currently, images are stored locally (`/media/uploads`). This must be switched to Google Cloud Storage (GCS) for production scaling.

---

### 7. Exact Next Steps (In Order)

1. **Finalize Doctor Verification Workflow**: (CRITICAL) Ensure the Admin "Verification" button correctly updates the `is_verified` flag in the DB and enables doctor features.
2. **Implement Notification System**: Add a "New Appointment" alert for doctors and "Scan Ready" alerts for users using a message queue or polling.
3. **Enhance Chatbot Knowledge**: Sync the `DiseaseInfo` table with the Chatbot logic so information is centralized.
4. **Deploy to Cloud Run / Firebase**: Move from local testing to a cloud environment to test production latency and GCS integration.

---

### 8. Long-Term Vision

SkinScan AI aims to become the "Digital Triage Room" for global dermatology.
- **Scaling**: Using Docker and Kubernetes (via Google Cloud Run) to handle thousands of concurrent image uploads.
- **Production Architecture**: A microservices approach where the AI Inference Engine sits in a separate high-compute node (GPU-enabled), while the Web Backend handles user traffic.
- **Future AI**: Implementation of **Explainable AI (XAI)**, where the system "highlights" the exact pixels it used to make a diagnosis, giving doctors more confidence in the tool.

---
**SkinScan AI - Building a Safer Future for Skin Health.**
