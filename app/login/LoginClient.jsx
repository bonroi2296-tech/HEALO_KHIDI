"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useToast } from '@/components/Toast';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/i18n/LangContext';

const supabase = createSupabaseBrowserClient();

export const LoginPage = ({ setView }) => {
    const toast = useToast();
    const router = useRouter();
    const langCode = useLang();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [oauthLoading, setOauthLoading] = useState(false);

    const handleLogin = async (e) => {
        if(e) e.preventDefault();
        
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            toast.error(t("login.error", langCode));
            setLoading(false);
        } else {
            console.log("Logged in:", data.user.email);
            toast.success(t("login.successPrefix", langCode) + data.user.email + "!");
            
            try {
                const { data: sessionData } = await supabase.auth.getSession();
                const accessToken = sessionData?.session?.access_token;
                const authHeaders = { 'Content-Type': 'application/json' };
                if (accessToken) authHeaders['Authorization'] = `Bearer ${accessToken}`;

                await new Promise(resolve => setTimeout(resolve, 300));

                const [adminRes, partnerRes] = await Promise.all([
                    fetch('/api/admin/whoami', { credentials: 'include', headers: authHeaders }).catch(() => null),
                    fetch('/api/partner/whoami', { credentials: 'include', headers: authHeaders }).catch(() => null),
                ]);

                const adminData = adminRes?.ok ? await adminRes.json() : null;
                const partnerData = partnerRes?.ok ? await partnerRes.json() : null;

                if (adminData?.isAdmin) {
                    router.push('/admin');
                } else if (partnerData?.isHospitalUser) {
                    router.push('/hospital');
                } else {
                    router.push('/');
                }
            } catch (checkError) {
                console.error('[LoginPage] Role check error:', checkError);
                router.push('/');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] min-h-screen-safe flex items-center justify-center bg-white px-4 py-8 pb-safe-area animate-in fade-in slide-in-from-bottom-4">
            <div className="max-w-sm w-full">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-extrabold text-gray-900 break-keep">{t("login.welcome", langCode)}</h2>
                    <p className="text-gray-500 mt-2">{t("login.subtitle", langCode)}</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="login-email" className="block text-sm font-bold text-gray-700 mb-1">{t("login.email", langCode)}</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 text-gray-400" size={20}/>
                            <input
                                id="login-email"
                                type="email"
                                required
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all bg-gray-50"
                                placeholder={t("login.emailPlaceholder", langCode)}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="login-password" className="block text-sm font-bold text-gray-700">{t("login.password", langCode)}</label>
                            <Link href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"} className="text-xs font-bold text-teal-700 hover:underline">{t("login.forgot", langCode)}</Link>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 text-gray-400" size={20}/>
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                required
                                className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all bg-gray-50"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-800 transition-colors shadow-lg shadow-teal-600/20 disabled:bg-gray-400"
                    >
                        {loading ? t("login.loggingIn", langCode) : t("auth.login", langCode)}
                    </button>
                </form>

                <div className="mt-8">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">{t("login.orContinueWith", langCode)}</span></div>
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={async () => {
                                console.log('[LoginPage] 🔵 Google button clicked!');
                                console.log('[LoginPage] window.location.origin:', window.location.origin);
                                
                                setOauthLoading(true);
                                try {
                                    const redirectUrl = `${window.location.origin}/auth/callback`;
                                    console.log('[LoginPage] redirectTo:', redirectUrl);
                                    
                                    console.log('[LoginPage] Calling signInWithOAuth...');
                                    const { data, error } = await supabase.auth.signInWithOAuth({
                                        provider: 'google',
                                        options: {
                                            redirectTo: redirectUrl,
                                        },
                                    });
                                    
                                    console.log('[LoginPage] signInWithOAuth result:', { data, error });
                                    
                                    if (error) {
                                        console.error('[LoginPage] ❌ OAuth error:', error);
                                        toast.error(t("login.googleError", langCode));
                                        setOauthLoading(false);
                                    } else {
                                        console.log('[LoginPage] ✅ OAuth initiated, redirecting to Google...');
                                    }
                                } catch (err) {
                                    console.error('[LoginPage] ❌ Google OAuth exception:', err);
                                    toast.error(t("login.errorOccurred", langCode));
                                    setOauthLoading(false);
                                }
                            }}
                            disabled={loading || oauthLoading}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            
                            <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                                {oauthLoading ? t("login.googleConnecting", langCode) : t("login.googleContinue", langCode)}
                            </span>
                        </button>
                    </div>
                </div>

                <p className="mt-8 text-center text-gray-500">
                    {t("login.noAccount", langCode)}{' '}
                    <button onClick={() => setView('signup')} className="text-teal-700 font-bold hover:underline">
                        {t("auth.signup", langCode)}
                    </button>
                </p>
            </div>
        </div>
    );
};
