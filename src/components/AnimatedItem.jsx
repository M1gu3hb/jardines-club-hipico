import { useRef } from "react";
import { motion, useInView } from "framer-motion";

/**
 * AnimatedItem — patrón de reveal de React Bits (AnimatedList) adaptado:
 * cada ítem entra con scale + opacity al aparecer en vista. Se usa para revelar
 * las cards de Servicios/Amenidades al expandir ("Ver más"). Depende de framer-motion.
 */
export default function AnimatedItem({ children, delay = 0 }) {
  const ref = useRef(null);
  // once: true → una vez revelada, la card NUNCA vuelve a ocultarse (más robusto
  // si el navegador pausa frames en pestañas de fondo o dispositivos lentos).
  const inView = useInView(ref, { amount: 0.15, once: true });
  return (
    <motion.div
      ref={ref}
      layout
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
