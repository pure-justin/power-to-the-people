import { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthChange,
  getUserProfile,
  signInWithEmail,
  signInWithGoogle,
  createAccount,
  logout as firebaseLogout,
  resetPassword,
  db,
  doc,
  setDoc,
} from "../services/firebase";

const AuthContext = createContext(null);

const ROLE_ROUTES = {
  admin: "/admin/overview",
  installer: "/dashboard",
  sales: "/sales",
  customer: "/portal",
};

const ROLE_PERMISSIONS = {
  admin: ["admin", "installer", "sales", "customer"],
  installer: ["installer"],
  sales: ["sales"],
  customer: ["customer"],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser && !firebaseUser.isAnonymous) {
        setUser(firebaseUser);
        try {
          const userProfile = await getUserProfile(firebaseUser.uid);
          if (userProfile) {
            setProfile(userProfile);
            setRole(userProfile.role || "customer");
          } else {
            setProfile({
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
            });
            setRole("customer");
          }
        } catch (err) {
          console.error("Failed to load user profile:", err);
          setRole("customer");
        }
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const firebaseUser = await signInWithEmail(email, password);
    return firebaseUser;
  };

  const loginWithGoogle = async () => {
    const firebaseUser = await signInWithGoogle();
    return firebaseUser;
  };

  const signup = async (
    email,
    password,
    displayName,
    selectedRole = "customer",
  ) => {
    const firebaseUser = await createAccount(email, password, displayName);
    // Save role to Firestore users collection
    await setDoc(
      doc(db, "users", firebaseUser.uid),
      {
        email,
        displayName,
        role: selectedRole,
        createdAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return firebaseUser;
  };

  const logout = async () => {
    await firebaseLogout();
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  const hasPermission = (requiredRole) => {
    if (!role) return false;
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(requiredRole) || role === "admin";
  };

  const getRedirectPath = () => {
    return ROLE_ROUTES[role] || "/portal";
  };

  const value = {
    user,
    profile,
    role,
    loading,
    login,
    loginWithGoogle,
    signup,
    logout,
    resetPassword,
    hasPermission,
    getRedirectPath,
    isAuthenticated: !!user && !user.isAnonymous,
    isAdmin: role === "admin",
    isInstaller: role === "installer",
    isSales: role === "sales",
    isCustomer: role === "customer",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { ROLE_ROUTES, ROLE_PERMISSIONS };
export default AuthContext;
