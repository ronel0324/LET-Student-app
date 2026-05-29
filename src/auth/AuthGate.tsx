import React, { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import LoginView from './Login';
import RegisterView from './Register';


type Role = 'Teacher' | 'Student' | string;

type Props = {
  children: React.ReactNode;
};


const AuthGate: React.FC<Props> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      setRole(null);
      if (!u) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const snap = await getDoc(doc(db, 'users', u.uid));
        const data = snap.data() as any;
        const remoteRole: Role = (data?.role ?? 'Student') as Role;
        setRole(remoteRole);
      } catch {
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const title = useMemo(() => {
    if (!firebaseUser) return 'LET Review';
    if (loading) return 'Checking account...';
    if (role === 'Teacher') return 'Access denied';
    return 'Welcome';
  }, [firebaseUser, loading, role]);

  if (!firebaseUser) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20, gap: 12, maxWidth: 420, margin: '0 auto', background: '#EBE9E1' }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 20, color: '#2d2d2d' }}>{title}</div>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#aaa', marginTop: 4 }}>
            Login to continue
          </div>
        </div>

        {mode === 'login' ? (
          <LoginView onSwitchToRegister={() => setMode('register')} />
        ) : (
          <RegisterView onSwitchToLogin={() => setMode('login')} />
        )}
      </div>
    );
  }


  if (loading || role === null) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20, maxWidth: 420, margin: '0 auto' }}>
        <div style={{ fontWeight: 900, color: '#2d2d2d', fontSize: 18, textAlign: 'center' }}>Checking account...</div>
        <div style={{ marginTop: 10, color: '#999', fontWeight: 700, textAlign: 'center', fontSize: 12 }}>Please wait.</div>
      </div>
    );
  }

  if (role === 'Teacher') {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20, gap: 12, maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#E25A53' }}>{title}</div>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#999', marginTop: 6, lineHeight: 1.5 }}>
            Your account is a Teacher role and cannot be used in the mobile student app.
          </div>
        </div>
        <button
          onClick={() => signOut(auth)}
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            border: 'none',
            background: '#EBE9E1',
            color: '#777',
            fontWeight: 900,
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGate;

