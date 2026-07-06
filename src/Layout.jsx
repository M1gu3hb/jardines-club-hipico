/**
 * Layout — contenedor de las páginas públicas.
 * Los estilos globales (Inter, tokens skeu, scrollbar) viven en
 * src/styles/theme.css (importado en main.jsx) para que TAMBIÉN
 * apliquen al portal del evento, al admin secreto y a /acceso,
 * que no pasan por este Layout.
 */
export default function Layout({ children }) {
  return <div className="min-h-screen bg-[#0a0a0a]">{children}</div>;
}
