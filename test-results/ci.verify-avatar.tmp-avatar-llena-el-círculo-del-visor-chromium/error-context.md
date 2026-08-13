# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ci.verify-avatar.tmp.spec.js >> avatar llena el círculo del visor
- Location: tests\ci.verify-avatar.tmp.spec.js:3:1

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 1
Received:    6
```

# Page snapshot

```yaml
- main [ref=e2]:
  - img "Portada" [ref=e4]
  - generic [ref=e5]:
    - img "Cristina Restaurante & Taquería" [ref=e8]
    - heading "Cristina Restaurante & Taquería" [level=1] [ref=e9]
    - generic [ref=e10]: Fuera de horario · Atendemos a partir de las 09:00
    - generic [ref=e13]: negocio
    - paragraph [ref=e15]: 👑 El auténtico sabor de Teziutlán. Tacos al pastor, desayunos buffet y platillos típicos en nuestros 3 establecimientos.
    - generic [ref=e16] [cursor=pointer]: Escuchar saludo de voz
  - button "Agendar Cita" [ref=e27] [cursor=pointer]
  - navigation [ref=e29]:
    - link "Menú & Bloques" [ref=e30] [cursor=pointer]:
      - /url: "#bloques"
    - link "Guardar Contacto" [ref=e38] [cursor=pointer]:
      - /url: http://localhost:3000/api/perfiles/cristina/vcard
  - generic [ref=e43]:
    - link "WhatsApp Atención e informes instantáneos ⚡ Responde rápido" [ref=e45] [cursor=pointer]:
      - /url: https://wa.me/522311556138
      - generic [ref=e48]:
        - generic [ref=e49]: WhatsApp
        - generic [ref=e50]: Atención e informes instantáneos
      - generic [ref=e51]: ⚡ Responde rápido
    - link "📖 Menú Digital & Carta Completa Tacos al pastor, desayunos buffet, cortes y antojitos típicos ↗ Enlace" [ref=e53] [cursor=pointer]:
      - /url: https://www.ubereats.com/mx/store/cristina-restaurante-%26-taqueria-suc-centro/Yd6UdKQ7WiSBAcOFDE-wOA
      - generic [ref=e55]:
        - generic [ref=e56]: 📖 Menú Digital & Carta Completa
        - generic [ref=e57]: Tacos al pastor, desayunos buffet, cortes y antojitos típicos
      - generic [ref=e58]: ↗ Enlace
    - generic [ref=e60]:
      - generic [ref=e61]: Redes Oficiales
      - generic [ref=e62]:
        - link "facebook" [ref=e63] [cursor=pointer]:
          - /url: https://www.facebook.com/CristinaRestauranteOficial/
        - link "instagram" [ref=e65] [cursor=pointer]:
          - /url: https://instagram.com/cristinarestaurante
    - generic [ref=e69]:
      - generic [ref=e70]: Encuéntranos
      - heading "¿Dónde te queda más cerca?" [level=3] [ref=e71]
      - paragraph [ref=e72]: Elige tu sede y explora el mapa interactivo en vivo con referencias reales y GPS.
      - button "Ver ubicaciones en vivo →" [ref=e73] [cursor=pointer]
    - link "🛵 Pedir a Domicilio por Uber Eats Entregas rápidas directo a tu casa u oficina ↗ Enlace" [ref=e75] [cursor=pointer]:
      - /url: https://www.ubereats.com/mx/store/cristina-restaurante-%26-taqueria-suc-centro/Yd6UdKQ7WiSBAcOFDE-wOA
      - generic [ref=e77]:
        - generic [ref=e78]: 🛵 Pedir a Domicilio por Uber Eats
        - generic [ref=e79]: Entregas rápidas directo a tu casa u oficina
      - generic [ref=e80]: ↗ Enlace
    - link "⭐ Reseñas & Calificación TripAdvisor Uno de los restaurantes más recomendados de Teziutlán ↗ Enlace" [ref=e82] [cursor=pointer]:
      - /url: https://www.tripadvisor.com/Search?q=Cristina+Restaurante+Teziutlan
      - generic [ref=e84]:
        - generic [ref=e85]: ⭐ Reseñas & Calificación TripAdvisor
        - generic [ref=e86]: Uno de los restaurantes más recomendados de Teziutlán
      - generic [ref=e87]: ↗ Enlace
  - generic [ref=e88]:
    - link "Guardar contacto (.vcf)" [ref=e89] [cursor=pointer]:
      - /url: http://localhost:3000/api/perfiles/cristina/vcard
    - generic [ref=e93]:
      - generic [ref=e94]: 26 visitas
      - link "Hecho con VYNK" [ref=e98] [cursor=pointer]:
        - /url: http://localhost:3000/
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test('avatar llena el círculo del visor', async ({ page }) => {
  4  |   await page.goto('http://localhost:3000/u/cristina');
  5  |   await page.waitForSelector('.avatar-wrapper img');
  6  |   const info = await page.evaluate(() => {
  7  |     const wrapper = document.querySelector('.avatar-wrapper');
  8  |     const img = wrapper.querySelector('img.avatar, .avatar img');
  9  |     if (!img) return null;
  10 |     const w = wrapper.getBoundingClientRect();
  11 |     const i = img.getBoundingClientRect();
  12 |     const computed = getComputedStyle(img);
  13 |     return {
  14 |       wrapperW: w.width, wrapperH: w.height,
  15 |       imgW: i.width, imgH: i.height,
  16 |       objectFit: computed.objectFit
  17 |     };
  18 |   });
  19 |   console.log('AVATAR_INFO', JSON.stringify(info));
  20 |   expect(info).not.toBeNull();
  21 |   // El img debe llenar exactamente el wrapper (tolerancia 1px)
> 22 |   expect(Math.abs(info.imgW - info.wrapperW)).toBeLessThanOrEqual(1);
     |                                               ^ Error: expect(received).toBeLessThanOrEqual(expected)
  23 |   expect(Math.abs(info.imgH - info.wrapperH)).toBeLessThanOrEqual(1);
  24 |   expect(info.objectFit).toBe('cover');
  25 | });
```