import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

type Props = {
  onSwitchToLogin: () => void;
};

const RegisterView: React.FC<Props> = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      // Student-only registration (A): role is forced to Student
      await setDoc(doc(db, 'users', uid), {
        name: name.trim(),
        email: email.trim(),
        role: 'Student',
        createdAt: serverTimestamp(),
      });

      // AuthGate will automatically load role and show the app.
    } catch (e: any) {
      setError(e?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 16, border: '1px solid rgba(255,255,255,0.8)' }}>
        <div style={{ fontWeight: 900, color: '#2d2d2d', fontSize: 14, marginBottom: 12 }}>Create account</div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 14,
            border: '1px solid #eee',
            background: '#fafaf8',
            fontWeight: 700,
            outline: 'none',
            marginBottom: 10,
          }}
        />

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 14,
            border: '1px solid #eee',
            background: '#fafaf8',
            fontWeight: 700,
            outline: 'none',
            marginBottom: 10,
          }}
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 14,
            border: '1px solid #eee',
            background: '#fafaf8',
            fontWeight: 700,
            outline: 'none',
            marginBottom: 10,
          }}
        />

        {error && (
          <div style={{ color: '#E25A53', fontWeight: 900, fontSize: 12, marginBottom: 10 }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading || !name.trim() || !email.trim() || !password}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 14,
            border: 'none',
            background: loading || !name.trim() || !email.trim() || !password ? '#C9C2A8' : '#E25A53',
            color: '#fff',
            fontWeight: 900,
            cursor: loading || !name.trim() || !email.trim() || !password ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Creating...' : 'Register as Student'}
        </button>
      </div>

      <button
        onClick={onSwitchToLogin}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#4F62E5',
          fontWeight: 900,
          cursor: 'pointer',
          padding: 6,
        }}
      >
        Back to login
      </button>
    </div>
  );
};

export default RegisterView;

