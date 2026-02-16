'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { useUserProfile } from '@/lib/auth'; // to check if already logged in
import { User, Lock } from 'lucide-react';


export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const { user } = useUserProfile();

    useEffect(() => {
        if (user) {
            router.push('/dashboard');
        }
    }, [user, router]);

    if (user) {
        return null;
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
        } else {
            // User state will update via AuthProvider listener -> redirect
            router.push('/dashboard');
        }
    };

    return (
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center bg-red-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-transparant">
                {/* The design shows a red card or just red background? 
                    Actually the provided image shows a RED CARD centered on a maybe white or red background?
                    Let's assume the whole page is red, and the form is a contained block. 
                    Wait, the image `Login.png` shows a Red Container with White Text, and White Inputs.
                    It looks like a Card itself is Red.
                */}
                <div className="bg-red-800 p-8 rounded-xl shadow-2xl border border-red-700 relative overflow-hidden">
                    {/* Decorative top glow */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>

                    <div className="flex flex-col items-center mb-8">
                        <div className="mb-4">
                            {/* Logo - No Frame, 150px */}
                            <Image
                                src="/bfp-logo.svg"
                                alt="BFP Logo"
                                width={150}
                                height={150}
                                className="object-contain"
                            />
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Login</h2>
                        <p className="mt-2 text-red-100 text-sm">Sign in to your account</p>
                    </div>

                    {error && (
                        <div className="bg-white/10 border border-red-200 text-red-100 p-3 rounded mb-6 text-sm flex items-center gap-2">
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="sr-only">Email</label>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md rounded-b-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm bg-gray-100"
                                    placeholder="Username / Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <label className="sr-only">Password</label>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md rounded-b-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm bg-gray-100"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end">
                            <div className="text-sm">
                                <a href="#" className="font-medium text-red-200 hover:text-white hover:underline">
                                    Forgot password?
                                </a>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-md text-red-800 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-800 focus:ring-white transition shadow-lg disabled:opacity-70 disabled:cursor-not-allowed uppercase"
                            >
                                {loading ? 'Signing In...' : 'Login'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="text-center text-red-800/60 text-xs">
                    &copy; 2026 Bureau of Fire Protection. All rights reserved.
                </div>
            </div>
        </div>
    );
}
