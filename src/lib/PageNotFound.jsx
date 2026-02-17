import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';


export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0A0E13] relative overflow-hidden">
            {/* Ambient background effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div 
                    className="absolute top-[20%] right-[10%] w-[600px] h-[600px] opacity-20"
                    style={{ background: 'radial-gradient(circle at center, rgba(255, 107, 44, 0.2) 0%, transparent 70%)' }} 
                />
            </div>

            <div className="max-w-md w-full relative z-10">
                <div className="text-center space-y-6">
                    {/* 404 Error Code */}
                    <div className="space-y-3">
                        <h1 className="text-8xl font-light text-[#6B7280] tracking-wider">404</h1>
                        <div className="h-0.5 w-20 bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] mx-auto rounded-full"></div>
                    </div>
                    
                    {/* Main Message */}
                    <div className="space-y-3">
                        <h2 className="text-3xl font-semibold text-[#E5E7EB] tracking-tight">
                            Page Not Found
                        </h2>
                        <p className="text-[#9CA3AF] leading-relaxed">
                            The page <span className="font-medium text-[#FF9D42]">"{pageName}"</span> could not be found in this application.
                        </p>
                    </div>
                    
                    {/* Admin Note */}
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                        <div className="mt-8 p-4 bg-[#0F1419]/60 backdrop-blur-md rounded-xl border border-[rgba(255,157,66,0.2)]">
                            <div className="flex items-start space-x-3">
                                <div 
                                    className="flex-shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br from-[#FF6B2C] to-[#FF9D42] flex items-center justify-center mt-0.5"
                                    style={{ boxShadow: '0 0 12px rgba(255, 157, 66, 0.3)' }}
                                >
                                    <div className="w-2 h-2 rounded-full bg-[#0A0E13]"></div>
                                </div>
                                <div className="text-left space-y-1">
                                    <p className="text-sm font-semibold text-[#E5E7EB]">Admin Note</p>
                                    <p className="text-sm text-[#9CA3AF] leading-relaxed">
                                        This could mean that the AI hasn't implemented this page yet. Ask it to implement it in the chat.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Action Button */}
                    <div className="pt-6">
                        <button 
                            onClick={() => window.location.href = '/'} 
                            className="inline-flex items-center px-6 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] text-[#0A0E13] shadow-lg hover:shadow-[0_0_30px_rgba(255,157,66,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-250 focus:outline-none focus:ring-2 focus:ring-[#FF9D42] focus:ring-offset-2 focus:ring-offset-[#0A0E13]"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}