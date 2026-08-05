import { Component } from "react";

/**
 * EL ÚNICO ERROR BOUNDARY DEL PROYECTO. No había ninguno.
 *
 * En React, una excepción durante el render **desmonta el árbol entero**. Sin un boundary, un
 * `undefined.map` en cualquiera de los 189 archivos deja al visitante mirando `<div id="root">`
 * vacío: un rectángulo negro, sin un mensaje, sin un botón, sin forma de saber si es su conexión
 * o el sitio. Y en un salón de eventos eso pasa el día que más importa —alguien abre la invitación
 * desde el móvil, en la puerta— y no hay nadie que abra la consola del navegador.
 *
 * Esto no arregla el fallo: lo hace visible y recuperable. Es deliberadamente tonto —sin estado
 * compartido, sin red, sin dependencias— porque un boundary que se cae con lo que envuelve no
 * sirve de nada.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { fallo: null };
  }

  static getDerivedStateFromError(error) {
    return { fallo: error };
  }

  componentDidCatch(error, info) {
    // A la consola, que es donde se puede diagnosticar. NO se le enseña al visitante el mensaje
    // crudo: puede llevar nombres de columnas o de tablas.
    console.error("[boundary]", error, info?.componentStack);
  }

  render() {
    if (!this.state.fallo) return this.props.children;

    return (
      <div
        role="alert"
        className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6 text-center"
      >
        <div className="max-w-lg">
          <p className="text-[#C9A84C] text-lg mb-2">Algo se rompió en esta pantalla.</p>
          <p className="text-white/50 text-sm leading-relaxed mb-7">
            No es tu conexión. Vuelve a cargar; si sigue igual, escríbenos y lo revisamos.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border border-[#C9A84C]/40 text-[#C9A84C] px-6 py-2.5 text-xs tracking-[0.2em] uppercase hover:bg-[#C9A84C]/10 transition-colors"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }
}
