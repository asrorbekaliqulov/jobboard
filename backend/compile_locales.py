import os
import sys

try:
    from babel.messages.frontend import compile_catalog
    from babel.core import Locale
except ImportError as e:
    print(f"ImportError: {e}")
    print("Babel not found. Please install Babel: pip install Babel")
    sys.exit(1)

def compile_translations():
    # Base directory for locales (relative to /app in container)
    base_dir = "app/locales"
    
    # Iterate over directories in locales
    if not os.path.exists(base_dir):
        print(f"Directory {base_dir} not found.")
        return

    for lang in os.listdir(base_dir):
        lang_dir = os.path.join(base_dir, lang)
        if not os.path.isdir(lang_dir):
            continue
            
        po_file = os.path.join(lang_dir, "LC_MESSAGES", "messages.po")
        mo_file = os.path.join(lang_dir, "LC_MESSAGES", "messages.mo")
        
        if os.path.exists(po_file):
            print(f"Compiling {po_file} -> {mo_file}")
            result = os.system(f"pybabel compile -i {po_file} -o {mo_file}")
            if result != 0:
                print(f"Failed to compile {lang}")
            else:
                print(f"Successfully compiled {lang}")

if __name__ == "__main__":
    compile_translations()
