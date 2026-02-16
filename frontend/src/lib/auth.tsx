'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from './supabaseClient';
import { useRouter } from 'next/navigation';

interface UserProfile {
    user: User | null;
    role: 'ENCODER' | 'VALIDATOR' | 'ANALYST' | 'ADMIN' | 'SYSTEM_ADMIN' | null;
    assignedRegionId: number | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<UserProfile | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserProfile['role']>(null);
    const [assignedRegionId, setAssignedRegionId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchProfile = async (currentUser: User) => {
            console.log("fetchProfile: Starting for user", currentUser.id);
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('role, assigned_region_id')
                    .eq('user_id', currentUser.id)
                    .single();

                if (error) {
                    console.error("fetchProfile: Supabase error:", error);
                }

                if (data) {
                    console.log("fetchProfile: API Data found:", data);
                    setRole(data.role);
                    setAssignedRegionId(data.assigned_region_id);
                } else {
                    console.warn("fetchProfile: No profile found for user in wims.users table.");
                    setRole(null);
                    setAssignedRegionId(null);
                }
            } catch (err) {
                console.error("fetchProfile: Unexpected error:", err);
            }
        };

        const initAuth = async () => {
            console.log("initAuth: Starting session check...");
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) console.error("initAuth: getSession error:", error);

                if (session?.user) {
                    console.log("initAuth: Session found for", session.user.email);
                    setUser(session.user);
                    await fetchProfile(session.user);
                } else {
                    console.log("initAuth: No session found.");
                }
            } catch (err) {
                console.error("initAuth: Initialization failed:", err);
            } finally {
                console.log("initAuth: Finished, setting loading=false");
                setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log(`onAuthStateChange: Event=${event}`);
                if (session?.user) {
                    setUser(session.user);
                    // Only fetch if we don't have role yet or user changed? 
                    // For safety, just fetch.
                    await fetchProfile(session.user);
                } else {
                    setUser(null);
                    setRole(null);
                    setAssignedRegionId(null);
                }
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <AuthContext.Provider
            value={{ user, role, assignedRegionId, loading, signOut }
            }>
            {children}
        </AuthContext.Provider>
    );
}

export const useUserProfile = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useUserProfile must be used within an AuthProvider');
    }
    return context;
};
