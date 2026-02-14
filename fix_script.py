
import re
import os

file_path = r'd:\Project\FIREBASE\script.js'

try:
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    print(f"Read {len(content)} bytes.")

    # 1. Fix Syntax Error in populateProfileForm
    # Look for the broken sequence where function doesn't close before next function starts
    # Pattern matches: reportAvatar.src = avatarSrc; [whitespace] } [whitespace] async function saveUserProfile
    
    # We want to insert two closing braces before async function
    
    # Regex to find the spot
    pattern_syntax = re.compile(r"(reportAvatar\.src\s*=\s*avatarSrc;\s*})(\s*)(async\s+function\s+saveUserProfile)", re.MULTILINE)
    
    if pattern_syntax.search(content):
        print("Found syntax error pattern. Fixing...")
        content = pattern_syntax.sub(r"\1\n    }\n}\n\n\3", content)
    else:
        print("Syntax error pattern not found (might be already fixed or slightly different).")

    # 2. Fix End of File and Appending switchTab
    
    # Remove weird "End of script" artifacts if any (spaced out or normal)
    content = re.sub(r"//\s*E\s*n\s*d\s*o\s*f\s*s\s*c\s*r\s*i\s*p\s*t.*", "", content, flags=re.IGNORECASE)
    content = content.replace("// End of script", "")
    
    # Check if switchTab exists
    if "function switchTab" not in content:
        print("Appending switchTab function...")
        switch_tab_code = """
// ============================================
// GLOBAL NAVIGATION HELPER (Appended)
// ============================================
function switchTab(tabId) {
    // 1. Home / Upload -> Index Page
    if (tabId === 'home' || tabId === 'upload') {
        const indexUrl = 'index.html';
        const currentPath = window.location.pathname;
        if (currentPath.endsWith(indexUrl) || currentPath === '/' || currentPath.endsWith('/')) {
             window.location.hash = tabId;
        } else {
            window.location.href = `index.html#${tabId}`;
        }
    } else if (['profile', 'security', 'appearance', 'ai-models', 'danger-zone'].includes(tabId)) {
        window.location.href = `settings.html?tab=${tabId}`;
    }
}
"""
        content = content.strip() + "\n\n" + switch_tab_code
    else:
        print("switchTab already exists.")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Successfully wrote updated script.js")

except Exception as e:
    print(f"Error: {e}")
