/**
 * pages.config.js — Páginas del SITIO PÚBLICO.
 *
 * Desde la FASE 6 aquí solo vive `Home`. El panel de administración se fue al repo
 * `JCH-CRM` y el portal del cliente a `JCH-portal-cliente`; este archivo llegó a importar
 * `./pages/Admin`, y esa línea era la que metía el panel entero en el bundle público.
 *
 * `mainPage` sigue siendo la única palanca editable: decide qué página se sirve en `/`.
 */
import Home from './pages/Home';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
