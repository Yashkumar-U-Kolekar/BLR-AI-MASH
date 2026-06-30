import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { supabase } from './lib/supabase';

function App() {
  const [userProfile, setUserProfile] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUserProfile(profile || { id: session.user.id, email: session.user.email, full_name: session.user.user_metadata?.full_name, role: 'patient' });
      }
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = ({ profile }) => {
    setUserProfile(profile);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
  };

  if (!sessionChecked) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="thinking-dots"><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {!userProfile ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard userProfile={userProfile} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
