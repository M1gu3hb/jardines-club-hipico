import { useLocation } from 'react-router-dom';

export default function PageNotFound() {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0a]">
            <div className="max-w-md w-full">
                <div className="text-center space-y-6">
                    {/* Código 404 */}
                    <div className="space-y-2">
                        <h1 className="text-7xl font-light text-[#C9A84C]/40">404</h1>
                        <div className="h-0.5 w-16 bg-[#C9A84C]/30 mx-auto"></div>
                    </div>

                    {/* Mensaje principal */}
                    <div className="space-y-3">
                        <h2 className="text-2xl font-light text-white">
                            Página no encontrada
                        </h2>
                        <p className="text-white/50 leading-relaxed">
                            La página <span className="font-medium text-white/70">&quot;{pageName}&quot;</span> no existe en este sitio.
                        </p>
                    </div>

                    {/* Botón de acción */}
                    <div className="pt-6">
                        <button
                            onClick={() => window.location.href = '/'}
                            className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-[#0a0a0a] bg-[#C9A84C] rounded-full hover:bg-[#d4b558] transition-colors duration-200"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Ir al inicio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
