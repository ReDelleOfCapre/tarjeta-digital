import re
import os

css_file = r'C:\Users\gpprz\.gemini\antigravity\scratch\tarjeta-digital\public\css\styles.css'

with open(css_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Protect the first line
lines = content.split('\n')
if len(lines) > 0 and lines[0].startswith('@import'):
    first_line = lines[0]
    rest_content = '\n'.join(lines[1:])
else:
    first_line = ''
    rest_content = content

# Common replacements
replacements = {
    # Purples
    re.compile(r'#7C3AED', re.IGNORECASE): 'var(--purple)',
    re.compile(r'#6366F1', re.IGNORECASE): 'var(--purple)',
    re.compile(r'#5856D6', re.IGNORECASE): 'var(--purple)',
    re.compile(r'#BF8CF2', re.IGNORECASE): 'var(--purple)',
    
    # Cyans / Blues
    re.compile(r'#06B6D4', re.IGNORECASE): 'var(--info)',
    re.compile(r'#007AFF', re.IGNORECASE): 'var(--info)',
    re.compile(r'#3B82F6', re.IGNORECASE): 'var(--info)',
    re.compile(r'#64B5F6', re.IGNORECASE): 'var(--info)',
    
    # Reds
    re.compile(r'#FF6B6B', re.IGNORECASE): 'var(--error)',
    re.compile(r'#EF4444', re.IGNORECASE): 'var(--error)',
    re.compile(r'#FF453A', re.IGNORECASE): 'var(--error)',
    
    # Blacks
    re.compile(r'#0F0B1E', re.IGNORECASE): 'var(--vynk-black)',
    re.compile(r'#0A0A0F', re.IGNORECASE): 'var(--vynk-black)',
    re.compile(r'#020205', re.IGNORECASE): 'var(--vynk-black)',
    re.compile(r'#0B0A09', re.IGNORECASE): 'var(--vynk-black)',
    re.compile(r'#050505', re.IGNORECASE): 'var(--vynk-black)',
    re.compile(r'#0A0A0A', re.IGNORECASE): 'var(--vynk-black)',
    re.compile(r'#100F13', re.IGNORECASE): 'var(--vynk-black)',
    re.compile(r'#121214', re.IGNORECASE): 'var(--vynk-black)',
    
    # Whites
    re.compile(r'#fff\b', re.IGNORECASE): 'var(--paper)',
    re.compile(r'#ffffff\b', re.IGNORECASE): 'var(--paper)',
    
    # Greens
    re.compile(r'#10B981', re.IGNORECASE): 'var(--success)',
    re.compile(r'#25D366', re.IGNORECASE): 'var(--success)',
    re.compile(r'#30D158', re.IGNORECASE): 'var(--success)',
    re.compile(r'#00FF66', re.IGNORECASE): 'var(--success)',
    
    # Warnings (Yellow/Orange)
    re.compile(r'#FBBF24', re.IGNORECASE): 'var(--warning)',
    re.compile(r'#F59E0B', re.IGNORECASE): 'var(--warning)',
    re.compile(r'#FF9F0A', re.IGNORECASE): 'var(--warning)',
    re.compile(r'#E8A33D', re.IGNORECASE): 'var(--warning)',
    re.compile(r'#D97706', re.IGNORECASE): 'var(--warning)',
    re.compile(r'#FF4500', re.IGNORECASE): 'var(--warning)',
    
    # Backgrounds/Grays
    re.compile(r'#F5F5F7', re.IGNORECASE): 'var(--vynk-background)',
    re.compile(r'#1B1A1F', re.IGNORECASE): 'var(--bg-base)',
    re.compile(r'#1A1F26', re.IGNORECASE): 'var(--bg-surface)',
    re.compile(r'#2A313A', re.IGNORECASE): 'var(--border-subtle)',
    re.compile(r'#37343E', re.IGNORECASE): 'var(--border-subtle)',
    re.compile(r'#212730', re.IGNORECASE): 'var(--bg-elevated)',
    re.compile(r'#222831', re.IGNORECASE): 'var(--bg-elevated)',
    re.compile(r'#485362', re.IGNORECASE): 'var(--border-subtle)',
    re.compile(r'#888\b', re.IGNORECASE): 'var(--text-tertiary)',
    re.compile(r'#aaa\b', re.IGNORECASE): 'var(--text-tertiary)',
    re.compile(r'#9E98A6', re.IGNORECASE): 'var(--text-muted)',
    re.compile(r'#6E6976', re.IGNORECASE): 'var(--text-muted)',
    re.compile(r'#8C96A3', re.IGNORECASE): 'var(--text-muted)',
    re.compile(r'#F1EEEA', re.IGNORECASE): 'var(--text-primary)',
    re.compile(r'#EEEAE0', re.IGNORECASE): 'var(--text-primary)',
}

original_hex_count = len(re.findall(r'#[0-9a-fA-F]{3,6}\b', rest_content))

for pattern, replacement in replacements.items():
    rest_content = pattern.sub(replacement, rest_content)

# Regex to catch any remaining hex colors (approximate fallback)
def fallback_replace(match):
    val = match.group(0).lower()
    if val in ['#000', '#000000', '#111', '#111111', '#222', '#222222']:
        return 'var(--ink)'
    if val in ['#eee', '#eeeeee']:
        return 'var(--line)'
    return match.group(0)

rest_content = re.sub(r'#[0-9a-fA-F]{3,6}\b', fallback_replace, rest_content)

final_hex_count = len(re.findall(r'#[0-9a-fA-F]{3,6}\b', rest_content))

final_content = first_line + '\n' + rest_content

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(final_content)

print(f"Replaced {original_hex_count - final_hex_count} hex values.")
print(f"Remaining hex values: {final_hex_count}")
