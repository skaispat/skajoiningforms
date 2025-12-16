import { create } from 'zustand';
import { supabase } from '../supabaseClient';

const useAuthStore = create((set) => ({
    user: null,
    loading: true,

    // Initialize auth state
    initializeAuth: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // In a real app, you would fetch the employee profile here
                // For now, we will mock the profile data to allow the form to work
                // We'll mimic an HR user so all actions are available
                const mockProfile = {
                    ...user,
                    emp_id: 'EMP001',
                    full_name: 'Admin User',
                    role: 'hr', // Mocking HR role
                    is_hod: true // Mocking HOD status
                };
                set({ user: mockProfile, loading: false });
            } else {
                set({ user: null, loading: false });
            }

            // Listen for changes
            supabase.auth.onAuthStateChange(async (event, session) => {
                if (session?.user) {
                    const mockProfile = {
                        ...session.user,
                        emp_id: 'EMP001',
                        full_name: 'Admin User',
                        role: 'hr',
                        is_hod: true
                    };
                    set({ user: mockProfile, loading: false });
                } else {
                    set({ user: null, loading: false });
                }
            });

        } catch (error) {
            console.error('Auth initialization error:', error);
            set({ user: null, loading: false });
        }
    },

    login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
    },

    logout: async () => {
        await supabase.auth.signOut();
        set({ user: null });
    }
}));

export default useAuthStore;
