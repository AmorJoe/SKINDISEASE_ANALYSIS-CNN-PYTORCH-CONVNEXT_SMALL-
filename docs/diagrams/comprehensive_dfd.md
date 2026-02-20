# SkinScan AI - Comprehensive Data Flow Diagrams

These Data Flow Diagrams (DFDs) are strictly derived from the actual code implementation of the SkinScan AI project. They represent the system's current logical architecture.

### **DFD Notation Key**
*   **RECTANGLES [ ]**: External Entities (Actors)
*   **OVALS ([ ])**: Processes (Functions/Logic)
*   **CYLINDERS [( )]**: Data Stores (Database/Storage)
*   **ARROWS -->**: Data Flow

---

## **Level 0: Context Diagram**
*High-level view of the system's boundaries.*

```mermaid
graph LR
    %% External Entities
    User[User]
    Doctor[Doctor]
    Admin[Admin]
    ExternalAI[External AI APIs<br>Gemini / NVIDIA NIM]

    %% Main System Process
    System([SKIN DISEASE<br>IDENTIFICATION<br>SYSTEM])

    %% Central Storage
    DB[(Central Database)]
    Storage[(File Storage)]

    %% Connections
    User -->|Skin Image, Appt Request, Profile Data| System
    System -->|Diagnosis, Treatment Plan, Notifications| User
    
    Doctor -->|Availability, Appt Status, Notes| System
    System -->|Patient Reports, Appt Requests, Stats| Doctor
    
    Admin -->|User Actions, Doctor Verification, Models| System
    System -->|Reports, User Lists, System Status| Admin

    System <-->|Read/Write Data| DB
    System -->|Save Images/Docs| Storage
    
    System <-->|Prompt & Diagnosis Data| ExternalAI

    %% Styles
    classDef entity fill:#fff,stroke:#333,stroke-width:2px;
    classDef process fill:#e1f5fe,stroke:#01579b,stroke-width:2px,rx:100,ry:100;
    classDef store fill:#f5f5f5,stroke:#616161,stroke-width:2px,cyl;
    
    class User,Doctor,Admin,ExternalAI entity;
    class System process;
    class DB,Storage store;
```

---

## **Level 1: System Overview**
*Breakdown into major subsystems found in the backend structure.*

```mermaid
graph TD
    %% Actors
    User[User]
    Doctor[Doctor]
    Admin[Admin]
    ExternalAI[External AI APIs]

    %% Subsystems (Processes)
    Auth([Authentication &<br>User Management])
    Prediction([AI Prediction &<br>Analysis Engine])
    DocMod([Doctor Module &<br>Appointments])
    AdminMod([Admin Management<br>& Moderation])

    %% Data Stores
    DB[(Central Database)]

    %% Auth Flows
    User -->|Login/Register| Auth
    Doctor -->|Login/Status| Auth
    Admin -->|Login| Auth
    Auth <-->|Verify Creds| DB

    %% Prediction Flows
    User -->|Upload Image| Prediction
    Prediction -->|Process Image| Prediction
    Prediction <-->|Get Treatment| ExternalAI
    Prediction -->|Save Result| DB
    Prediction -->|Return Result| User

    %% Doctor Flows
    Doctor -->|Manage Appts| DocMod
    User -->|Book Appt| DocMod
    DocMod <-->|Appt Data| DB
    
    %% Admin Flows
    Admin -->|Manage Users/Docs| AdminMod
    AdminMod <-->|Update Status| DB

    %% Cross-System
    Prediction -->|Share Report| DocMod
    DocMod -->|Update Notes| DB

    %% Styles
    classDef entity fill:#fff,stroke:#333,stroke-width:2px;
    classDef process fill:#e1f5fe,stroke:#01579b,stroke-width:2px,rx:20,ry:20;
    classDef store fill:#f5f5f5,stroke:#616161,stroke-width:2px,cyl;

    class User,Doctor,Admin,ExternalAI entity;
    class Auth,Prediction,DocMod,AdminMod process;
    class DB store;
```

---

## **Level 2.1: Admin Module**
*Deep dive into `admin_module/views.py` logic.*

```mermaid
graph LR
    %% Actor
    Admin[Admin]

    %% Processes
    VerifyDoc([Verify Doctor<br>Approve/Reject])
    ManageUsers([Manage Users<br>Lock/Ban/Promote])
    ModModels([Manage AI Models<br>Upload/Set Default])
    ContentView([Manage Disease<br>Info Content])
    ReportView([View & Delete<br>User Reports])

    %% Data Store
    DB[(Cntrl Database)]
    FS[(File System<br>ml_models)]

    %% Flows
    Admin -->|Action: approve/reject| VerifyDoc
    VerifyDoc -->|Update is_verified| DB
    
    Admin -->|Action: lock/ban| ManageUsers
    ManageUsers -->|Update account_status| DB
    
    Admin -->|Upload .pth| ModModels
    ModModels -->|Save File| FS
    ModModels -->|Update Settings| DB
    
    Admin -->|CRUD Content| ContentView
    ContentView <-->|Read/Write| DB
    
    Admin -->|Delete Report| ReportView
    ReportView -->|Remove Record| DB

    %% Styles
    classDef entity fill:#fff,stroke:#333,stroke-width:2px;
    classDef process fill:#e1f5fe,stroke:#01579b,stroke-width:2px,rx:20,ry:20;
    classDef store fill:#f5f5f5,stroke:#616161,stroke-width:2px,cyl;

    class Admin entity;
    class VerifyDoc,ManageUsers,ModModels,ContentView,ReportView process;
    class DB,FS store;
```

---

## **Level 2.2: User Module**
*Deep dive into User-facing features in `authentication` and `prediction`.*

```mermaid
graph LR
    %% Actor
    User[User]

    %% Processes
    RegLogin([Register / Login])
    UploadImg([Upload Skin Image])
    ViewHist([View Scan<br>History])
    BookAppt([Book Doctor<br>Appointment])
    Share([Share Report<br>with Doctor])
    Feedback([Submit<br>Prediction Feedback])

    %% Data Store
    DB[(Cntrl Database)]
    Supabase[(Storage)]

    %% Flows
    User <-->|Creds / Token| RegLogin
    RegLogin <-->|Validate| DB

    User -->|Image File| UploadImg
    UploadImg -->|Save Image| Supabase
    UploadImg -->|Create Record| DB

    User -->|Get Scans| ViewHist
    DB -->|Return Records| ViewHist
    ViewHist -->|Show History| User

    User -->|Select Slot| BookAppt
    BookAppt -->|Create Appointment| DB

    User -->|Report ID + Doc ID| Share
    Share -->|Create SharedReport| DB

    User -->|Feedback Data| Feedback
    Feedback -->|Update Record| DB

    %% Styles
    classDef entity fill:#fff,stroke:#333,stroke-width:2px;
    classDef process fill:#e1f5fe,stroke:#01579b,stroke-width:2px,rx:20,ry:20;
    classDef store fill:#f5f5f5,stroke:#616161,stroke-width:2px,cyl;

    class User entity;
    class RegLogin,UploadImg,ViewHist,BookAppt,Share,Feedback process;
    class DB,Supabase store;
```

---

## **Level 2.3: Doctor Module**
*Deep dive into `prediction/views_doctor.py` logic.*

```mermaid
graph LR
    %% Actor
    Doctor[Doctor]

    %% Processes
    Dashboard([View Dashboard<br>Stats])
    ManageAppt([Manage Appointments<br>Confirm/Reject])
    ViewShared([View Shared<br>Reports])
    UpdateNotes([Update Patient<br>Notes])
    ListPatients([View Patient<br>List])
    EditProfile([Update Doctor<br>Profile])

    %% Data Store
    DB[(Cntrl Database)]

    %% Flows
    Doctor -->|Request Stats| Dashboard
    DB -->|Aggregated Data| Dashboard
    Dashboard -->|Stats JSON| Doctor

    Doctor -->|Action: Confirm/Reject| ManageAppt
    ManageAppt -->|Update Status| DB
    ManageAppt -->|Generate Video Link| DB

    Doctor -->|Get Shared| ViewShared
    DB -->|Fetch Authorized Reports| ViewShared
    ViewShared -->|Report Details| Doctor

    Doctor -->|Write Notes| UpdateNotes
    UpdateNotes -->|Save to PredictionResult| DB

    Doctor -->|Get Patients| ListPatients
    DB -->|Query Unique Patients| ListPatients
    ListPatients -->|Patient Data| Doctor
    
    Doctor -->|Update Bio/Fee| EditProfile
    EditProfile -->|Save Profile| DB

    %% Styles
    classDef entity fill:#fff,stroke:#333,stroke-width:2px;
    classDef process fill:#e1f5fe,stroke:#01579b,stroke-width:2px,rx:20,ry:20;
    classDef store fill:#f5f5f5,stroke:#616161,stroke-width:2px,cyl;

    class Doctor entity;
    class Dashboard,ManageAppt,ViewShared,UpdateNotes,ListPatients,EditProfile process;
    class DB store;
```

---

## **Level 2.4: AI/ML Pipeline**
*Detailed flow of `cnn_inference.py` and `treatment_generator.py`.*

```mermaid
graph TD
    %% Actor/Trigger
    User[User Upload]
    ExternalAI[Gemini / NVIDIA API]

    %% Processes
    Validate([Validate Image<br>Format/Size])
    PreProcess([Preprocessing<br>Resize 256x256 / Norm])
    Inference([CNN Inference<br>ConvNeXt Small])
    Softmax([Softmax &<br>Confidence Score])
    CheckConf([Threshold Check<br>Inconclusive?])
    GenTreat([Generate Treatment<br>Plan])
    SaveRes([Persist Result])

    %% Data Stores
    ModelFile[(Model Weights<br>.pth)]
    DB[(Database)]

    %% Flow
    User -->|Image Bytes| Validate
    Validate -->|Valid Bytes| PreProcess
    
    PreProcess -->|Tensor| Inference
    ModelFile -->|Load Weights| Inference
    
    Inference -->|Logits| Softmax
    Softmax -->|Probs & Class| CheckConf
    
    CheckConf -->|Disease & Score| GenTreat
    GenTreat <-->|Prompt & Response| ExternalAI
    
    GenTreat -->|Final Result Struct| SaveRes
    CheckConf -->|Is Inconclusive| SaveRes
    
    SaveRes -->|Create PredictionResult| DB

    %% Styles
    classDef entity fill:#fff,stroke:#333,stroke-width:2px;
    classDef process fill:#e1f5fe,stroke:#01579b,stroke-width:2px,rx:20,ry:20;
    classDef store fill:#f5f5f5,stroke:#616161,stroke-width:2px,cyl;

    class User,ExternalAI entity;
    class Validate,PreProcess,Inference,Softmax,CheckConf,GenTreat,SaveRes process;
    class ModelFile,DB store;
```
