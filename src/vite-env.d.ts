/// <reference types="vite/client" />

// Sin esto, `import.meta.env` no existe para TypeScript y cada lectura de una variable
// `VITE_*` cuenta como error. Eran cuatro en la linea base, y la FASE 4 iba a sumar una
// quinta al leer `VITE_URL_PORTAL` desde el menu.
//
// Declararlo es mejor que esquivarlo: convierte el typecheck en algo que de verdad revisa
// las variables de entorno del front, en vez de rendirse ante ellas.
