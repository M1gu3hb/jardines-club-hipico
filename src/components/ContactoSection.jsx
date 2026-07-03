import { motion } from "framer-motion";
import { Phone, Mail, MapPin } from "lucide-react";

export default function ContactoSection({ telefono, correo, ubicacionTexto, ubicacionLinkMapa, whatsappNumero }) {
  const tel = telefono || "+52 55 0000 0000";
  const whatsappNum = whatsappNumero || "525548663656";
  const ubicacion = ubicacionTexto || "Ciudad de México";
  const mapaUrl = ubicacionLinkMapa || "https://maps.google.com";

  const items = [
    { icon: Phone, label: "Teléfono", value: tel, action: `tel:${tel.replace(/\D/g, "")}`, actionLabel: "Llamar ahora" },
    { icon: Mail, label: "Correo", value: correo || "contacto@jardinesclubhipico.mx", action: `mailto:${correo || "contacto@jardinesclubhipico.mx"}`, actionLabel: "Enviar correo" },
    { icon: MapPin, label: "Ubicación", value: ubicacion, action: mapaUrl, actionLabel: "Ver mapa" },
  ];

  return (
    <section id="contacto" className="py-20 md:py-28 px-4 sm:px-6 bg-[#080808] w-full">
      <div className="max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
            <div className="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent to-[#C9A84C]/50" />
            <span className="text-[#C9A84C]/70 text-[10px] sm:text-xs tracking-[0.3em] sm:tracking-[0.35em] uppercase">Hablemos</span>
            <div className="h-px w-10 sm:w-16 bg-gradient-to-l from-transparent to-[#C9A84C]/50" />
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-thin text-white">Contacto</h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mb-12 md:mb-14">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="skeu-card skeu-card-hover p-6 sm:p-7 text-center group"
            >
              {/* Icono con relieve */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 relative z-10"
                style={{
                  background: "linear-gradient(180deg, #1a1408 0%, #060503 100%)",
                  border: "1px solid rgba(201,168,76,0.4)",
                  boxShadow:
                    "0 1px 0 rgba(255,220,140,0.15) inset, 0 -2px 4px rgba(0,0,0,0.7) inset, 0 4px 12px rgba(0,0,0,0.6), 0 0 18px -4px rgba(201,168,76,0.3)",
                }}
              >
                <item.icon size={22} className="text-[#C9A84C] group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-white/35 text-[10px] sm:text-xs tracking-widest uppercase mb-2 relative z-10">{item.label}</p>
              <p className="text-white/75 text-sm mb-5 break-words relative z-10">{item.value}</p>
              <a
                href={item.action}
                target={item.action.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#C9A84C]/70 hover:text-[#C9A84C] text-xs tracking-wider uppercase transition-colors relative z-10"
              >
                {item.actionLabel} →
              </a>
            </motion.div>
          ))}
        </div>

        {/* WhatsApp CTA con relieve */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-center"
        >
          <a
            href={`https://wa.me/${whatsappNum}?text=Hola,%20me%20gustar%C3%ADa%20cotizar%20un%20evento%20en%20Jardines%20Club%20H%C3%ADpico`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 text-white font-medium text-sm tracking-wide px-8 sm:px-10 py-4 rounded-full transition-all duration-300 hover:brightness-110"
            style={{
              background: "linear-gradient(180deg, #2ee06f 0%, #25D366 45%, #1a9d4a 100%)",
              border: "1px solid rgba(150,255,180,0.4)",
              boxShadow:
                "0 1px 0 rgba(200,255,220,0.5) inset, 0 -2px 4px rgba(20,80,40,0.5) inset, 0 10px 24px -6px rgba(37,211,102,0.45), 0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Escribir por WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  );
}