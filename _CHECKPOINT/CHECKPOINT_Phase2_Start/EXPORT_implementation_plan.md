# Profile Interface Implementation Plan (Demo Phase)

This plan outlines the creation of a standalone **Demo Page** (`profile_demo.html`) to visualize and test the new Profile Interface and Avatar Dropdown.

## User Review Required

> [!IMPORTANT]
> **Demo Strategy**: We are building a *demo* page first. No changes to `index.html`.
> **Database Schema Changes**:
> - We will add the following columns to the `users` table:
>   - `first_name`
>   - `last_name`
>   - `country`
>   - `address`
>   - `avatar` (Image)
>   - `skin_type` & `skin_tone`
> **Profile Fields Constraints**:
> - **First Name & Last Name**: Editable.
> - **Email**: Read-only (Locked).
> - **Phone Number**: Editable.
> - **Date of Birth**: Editable.
> - **Country**: Editable (Dropdown or Text).
> - **Address**: Editable (Text Area).
> - **Gender**: Editable Dropdown (Male, Female, Others).
> **Theme**: Must match `style.css` (Medical Blue #0288d1, Poppins font, Glassmorphism).

## Proposed Changes

### Backend (`skinscan-backend/authentication`)

#### [MODIFY] [models.py](file:///d:/Project/FIREBASE/skinscan-backend/authentication/models.py)
- Update `User` model to add:
    
    -   `first_name` (CharField)
    -   `last_name` (CharField)
    -   `country` (CharField)
    -   `address` (TextField)
    -   `avatar` (ImageField/URL)
    -   `skin_type` (CharField)
    -   `skin_tone` (CharField)

#### [MODIFY] [serializers.py](file:///d:/Project/FIREBASE/skinscan-backend/authentication/serializers.py)
- Update `UserSerializer` to include all new fields.

#### [MODIFY] [views.py](file:///d:/Project/FIREBASE/skinscan-backend/authentication/views.py)
- Update `ProfileView` to handle updates for all new fields.
- Email remains read-only.

### Frontend (`d:/Project/FIREBASE`)

#### [NEW] [profile_demo.html](file:///d:/Project/FIREBASE/profile_demo.html)
- **Header**: Clone of `index.html` navbar with Round Avatar.
- **Profile Form Layout**:
    -   **Personal Details**:
        -   First Name (Editable)
        -   Last Name (Editable)
        -   Email (Locked)
        -   Phone Number (Editable)
        -   Date of Birth (Date Picker)
        -   Gender (Dropdown)
    -   **Location**:
        -   Country (Editable)
        -   Address (Editable)
    -   **Medical Profile** (Skin Type/Tone).
    -   **Security** (Change Password).

#### [NEW] [profile.css](file:///d:/Project/FIREBASE/profile.css)
- Styling for the expanded form layout (likely 2-column grid for better use of space).
- Glassmorphism effects.

#### [NEW] [profile_demo.js](file:///d:/Project/FIREBASE/profile_demo.js)
- Logic to load and save the expanded dataset.

## Verification Plan

### Manual Verification
1.  **Open Demo**: `http://localhost:5500/profile_demo.html`
2.  **Verify Fields**: Check that First Name, Last Name, Country, Address, etc. are present.
3.  **Edit & Save**: Fill in all fields, save, reload, and verify persistence.
4.  **Database Check**: Inspect the `users` table to ensure new columns are populated.
