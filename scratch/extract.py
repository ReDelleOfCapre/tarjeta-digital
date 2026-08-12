import re
from collections import Counter

css_file = r'C:\Users\gpprz\.gemini\antigravity\scratch\tarjeta-digital\public\css\styles.css'

with open(css_file, 'r', encoding='utf-8') as f:
    content = f.read()

hex_colors = re.findall(r'#[0-9a-fA-F]{3,6}\b', content)
rgba_colors = re.findall(r'rgba?\([^)]+\)', content)

print("Hex Colors:")
for c, count in Counter(hex_colors).most_common():
    print(f"{c}: {count}")

print("\nRGBA Colors:")
for c, count in Counter(rgba_colors).most_common():
    print(f"{c}: {count}")
