import { defineStore } from "pinia";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  initializing: boolean;
  error: string | null;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    session: null,
    user: null,
    initializing: true,
    error: null,
  }),
  getters: {
    accessToken: (state) => state.session?.access_token ?? null,
    isAuthenticated: (state) => !!state.user,
  },
  actions: {
    async initialize() {
      if (!this.initializing) return;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          this.error = error.message;
        } else {
          this.session = data.session;
          this.user = data.session?.user ?? null;
          if (this.user) {
            await this.syncProfile(this.user);
          }
        }
      } finally {
        this.initializing = false;
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        this.session = session;
        this.user = session?.user ?? null;
        if (this.user) {
          await this.syncProfile(this.user);
        }
      });
    },
    async signInWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        throw error;
      }
    },
    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      this.session = null;
      this.user = null;
    },
    async syncProfile(user: User) {
      try {
        const email = user.email ?? `${user.id}@polychat.local`;
        await supabase
          .from("users")
          .upsert(
            {
              id: user.id,
              email,
            },
            { onConflict: "id" },
          )
          .select("id")
          .single();
      } catch {
        // Swallow RLS/connection issues to avoid blocking auth flow.
      }
    },
  },
});
