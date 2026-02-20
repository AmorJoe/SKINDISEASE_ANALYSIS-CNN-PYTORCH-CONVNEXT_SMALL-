# Database Schema Tables

### 1. TABLE: USERS
*Maps to Django Model: `authentication.User`*

| FIELD | TYPE | SIZE | KEY |
| :--- | :--- | :--- | :--- |
| id | Int | 11 | Primary Key |
| first_name | Varchar | 50 | |
| last_name | Varchar | 50 | |
| email | Varchar | 254 | Unique Key |
| password_hash | Varchar | 255 | |
| avatar | Varchar | 100 | |
| phone | Varchar | 15 | |
| date_of_birth | Date | - | |
| gender | Varchar | 10 | |
| country | Varchar | 100 | |
| address | Text | - | |
| skin_type | Varchar | 50 | |
| skin_tone | Varchar | 50 | |
| is_admin | Boolean | - | |
| is_doctor | Boolean | - | |
| specialty | Varchar | 100 | |
| assigned_model | Varchar | 255 | |
| account_status | Varchar | 20 | |
| last_login | Datetime | - | |
| created_at | Datetime | - | |
| updated_at | Datetime | - | |

### 2. TABLE: USER_PROFILES
*Maps to Django Model: `authentication.UserProfile`*

| FIELD | TYPE | SIZE | KEY |
| :--- | :--- | :--- | :--- |
| id | Int | 11 | Primary Key |
| user_id | Int | 11 | Foreign Key (Unique) |
| first_name | Varchar | 50 | |
| last_name | Varchar | 50 | |
| phone | Varchar | 15 | |
| date_of_birth | Date | - | |
| gender | Varchar | 10 | |
| country | Varchar | 100 | |
| address | Text | - | |
| avatar | Varchar | 100 | |
| skin_type | Varchar | 50 | |
| skin_tone | Varchar | 50 | |
| created_at | Datetime | - | |
| updated_at | Datetime | - | |

### 3. TABLE: DOCTOR_PROFILES
*Maps to Django Model: `authentication.DoctorProfile`*

| FIELD | TYPE | SIZE | KEY |
| :--- | :--- | :--- | :--- |
| id | Int | 11 | Primary Key |
| user_id | Int | 11 | Foreign Key (Unique) |
| medical_license_number | Varchar | 50 | Unique Key |
| specialization | Varchar | 100 | |
| years_of_experience | Int | 11 | |
| hospital_affiliation | Varchar | 200 | |
| bio | Text | - | |
| is_verified | Boolean | - | |
| verification_date | Datetime | - | |
| consultation_fee | Decimal | 10,2 | |
| available_days | JSON | - | |
| created_at | Datetime | - | |
| updated_at | Datetime | - | |

### 4. TABLE: NOTIFICATIONS
*Maps to Django Model: `authentication.Notification`*

| FIELD | TYPE | SIZE | KEY |
| :--- | :--- | :--- | :--- |
| id | Int | 11 | Primary Key |
| user_id | Int | 11 | Foreign Key |
| title | Varchar | 255 | |
| message | Text | - | |
| type | Varchar | 50 | |
| is_read | Boolean | - | |
| created_at | Datetime | - | |

### 5. TABLE: DOCTOR_DOCUMENTS
*Maps to Django Model: `authentication.DoctorDocument`*

| FIELD | TYPE | SIZE | KEY |
| :--- | :--- | :--- | :--- |
| id | Int | 11 | Primary Key |
| doctor_id | Int | 11 | Foreign Key |
| patient_id | Int | 11 | Foreign Key |
| document | Varchar | 100 | |
| name | Varchar | 255 | |
| note | Text | - | |
| created_at | Datetime | - | |

### 6. TABLE: SKIN_IMAGES
*Maps to Django Model: `prediction.SkinImage`*

| FIELD | TYPE | SIZE | KEY |
| :--- | :--- | :--- | :--- |
| id | Int | 11 | Primary Key |
| user_id | Int | 11 | Foreign Key |
| image_url | Varchar | 500 | |
| original_filename | Varchar | 255 | |
| file_size | Int | 11 | |
| uploaded_at | Datetime | - | |

### 7. TABLE: PREDICTION_RESULTS
*Maps to Django Model: `prediction.PredictionResult`*

| FIELD | TYPE | SIZE | KEY |
| :--- | :--- | :--- | :--- |
| id | Int | 11 | Primary Key |
| user_id | Int | 11 | Foreign Key |
| image_id | Int | 11 | Foreign Key |
| disease_name | Varchar | 100 | |
| confidence_score | Float | - | |
| recommendation | Text | - | |
| report | Varchar | 100 | |
| doctor_notes | Text | - | |
| notes_updated_at | Datetime | - | |
| created_at | Datetime | - | |

### 8. TABLE: SCAN_HISTORY
*Maps to Django Model: `prediction.ScanHistory`*

| FIELD | TYPE | SIZE | KEY |
| :--- | :--- | :--- | :--- |
| id | Int | 11 | Primary Key |
| user_id | Int | 11 | Foreign Key |
| image_id | Int | 11 | Foreign Key |
| result_id | Int | 11 | Foreign Key |
| title | Varchar | 100 | |
| notes | Text | - | |
| is_bookmarked | Boolean | - | |
| severity_tag | Varchar | 20 | |
| body_location | Varchar | 50 | |
| created_at | Datetime | - | |

### 9. TABLE: APPOINTMENTS
*Maps to Django Model: `prediction.Appointment`*

| FIELD | TYPE | SIZE | KEY |
| :--- | :--- | :--- | :--- |
| id | Int | 11 | Primary Key |
| patient_id | Int | 11 | Foreign Key |
| doctor_id | Int | 11 | Foreign Key |
| date | Date | - | |
| time_slot | Varchar | 50 | |
| status | Varchar | 20 | |
| video_link | Varchar | 200 | |
| created_at | Datetime | - | |

### 10. TABLE: SHARED_REPORTS
*Maps to Django Model: `prediction.SharedReport`*

| FIELD | TYPE | SIZE | KEY |
| :--- | :--- | :--- | :--- |
| id | Int | 11 | Primary Key |
| report_id | Int | 11 | Foreign Key |
| doctor_id | Int | 11 | Foreign Key |
| shared_at | Datetime | - | |
| status | Varchar | 20 | |
| doctor_notes | Text | - | |

### 11. TABLE: CHAT_HISTORY
*Maps to Django Model: `chatbot.ChatHistory`*

| FIELD | TYPE | SIZE | KEY |
| :--- | :--- | :--- | :--- |
| id | Int | 11 | Primary Key |
| user_id | Int | 11 | Foreign Key |
| role | Varchar | 10 | |
| message | Text | - | |
| session_id | Varchar | 100 | |
| created_at | Datetime | - | |

### 12. TABLE: DISEASE_INFO
*Maps to Django Model: `admin_module.DiseaseInfo`*

| FIELD | TYPE | SIZE | KEY |
| :--- | :--- | :--- | :--- |
| id | Int | 11 | Primary Key |
| name | Varchar | 100 | Unique Key |
| category | Varchar | 100 | |
| description | Text | - | |
| symptoms | Text | - | |
| prevention | Text | - | |
| icon_class | Varchar | 50 | |
| learn_more_url | Varchar | 200 | |
| created_at | Datetime | - | |
| updated_at | Datetime | - | |

### 13. TABLE: APP_SETTING
*Maps to Django Model: `admin_module.AppSetting`*

| FIELD | TYPE | SIZE | KEY |
| :--- | :--- | :--- | :--- |
| id | Int | 11 | Primary Key |
| key | Varchar | 100 | Unique Key |
| value | Text | - | |
| description | Text | - | |
| updated_at | Datetime | - | |
