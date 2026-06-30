import type { View, Router } from '../router';
import { supabase } from '../supabase';
import { getIcon } from '../assets/icons';

export class AuthView implements View {
  private isSignUp = false;

  public render(): string {
    return `
      <div class="auth-card-wrapper">
        <div class="auth-card">
          <div class="auth-brand">
            ${getIcon('activity', 'auth-logo-icon')}
            <span>MASH</span>
          </div>
          
          <div class="auth-header">
            <h2 id="auth-title">Welcome Back</h2>
            <p id="auth-subtitle">Enter your credentials to access the clinician portal</p>
          </div>

          <div id="auth-alert" class="auth-alert" style="display: none;"></div>

          <form id="auth-form" class="auth-form">
            <div class="form-group" id="fullname-group" style="display: none;">
              <label class="form-label" for="auth-fullname">Full Name</label>
              <div class="input-wrapper">
                <input type="text" class="auth-input" id="auth-fullname" placeholder="Dr. Jane Smith" />
              </div>
            </div>

            <div class="form-group" id="contact-group" style="display: none;">
              <label class="form-label" for="auth-contact">Contact Number</label>
              <div class="input-wrapper">
                <input type="tel" class="auth-input" id="auth-contact" placeholder="(555) 019-2834" />
              </div>
            </div>

            <div class="form-group" id="specialty-group" style="display: none;">
              <label class="form-label" for="auth-specialty">Specialty</label>
              <div class="input-wrapper">
                <input type="text" class="auth-input" id="auth-specialty" placeholder="e.g. Cardiologist" />
              </div>
            </div>

            <div class="form-group" id="room-group" style="display: none;">
              <label class="form-label" for="auth-room">Room Number</label>
              <div class="input-wrapper">
                <input type="text" class="auth-input" id="auth-room" placeholder="e.g. Room 4B" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="auth-email">Email Address</label>
              <div class="input-wrapper">
                <input type="email" class="auth-input" id="auth-email" placeholder="clinician@medconnect.com" required autocomplete="username" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="auth-password">Password</label>
              <div class="input-wrapper">
                <input type="password" class="auth-input" id="auth-password" placeholder="••••••••" required autocomplete="current-password" />
              </div>
            </div>

            <button type="submit" class="btn-primary auth-submit-btn" id="auth-submit-btn">
              <span>Sign In</span>
            </button>
          </form>

          <div class="auth-divider">
            <span>or</span>
          </div>

          <button class="btn-demo-bypass" id="demo-bypass-btn">
            <span>Sign in with Demo Account</span>
          </button>

          <div class="auth-footer">
            <span id="auth-toggle-text">Don't have an account?</span>
            <a href="#" id="auth-toggle-link" class="auth-link">Sign Up</a>
          </div>
        </div>
      </div>

      <style>
        .auth-card-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 100vh;
          background: linear-gradient(135deg, #09122c 0%, #060a17 100%);
          padding: 24px;
          box-sizing: border-box;
          font-family: var(--font-sans);
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          padding: 40px;
          box-sizing: border-box;
          color: #ffffff;
          display: flex;
          flex-direction: column;
        }

        .auth-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 24px;
          margin-bottom: 32px;
        }

        .auth-logo-icon {
          width: 28px;
          height: 28px;
          color: var(--accent-cyan);
          stroke-width: 2.5;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .auth-header h2 {
          font-family: var(--font-heading);
          font-size: 26px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #ffffff;
        }

        .auth-header p {
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.5;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: #94a3b8;
        }

        .auth-input {
          width: 100%;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          color: #ffffff;
          box-sizing: border-box;
          transition: all 0.2s ease;
          font-family: var(--font-sans);
        }

        .auth-input:focus {
          border-color: var(--primary-blue-light);
          background: rgba(15, 23, 42, 0.7);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
          outline: none;
        }

        .auth-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .auth-submit-btn {
          width: 100%;
          justify-content: center;
          padding: 12px;
          font-size: 15px;
          font-weight: 600;
          margin-top: 8px;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 20px 0;
          color: #64748b;
          font-size: 13px;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .auth-divider:not(:empty)::before {
          margin-right: .5em;
        }

        .auth-divider:not(:empty)::after {
          margin-left: .5em;
        }

        .btn-demo-bypass {
          width: 100%;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 12px;
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .btn-demo-bypass:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .auth-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 14px;
          color: #94a3b8;
        }

        .auth-link {
          color: var(--primary-blue-light);
          font-weight: 600;
          margin-left: 4px;
          text-decoration: none;
        }

        .auth-link:hover {
          text-decoration: underline;
        }

        .auth-alert {
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .auth-alert-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .auth-alert-success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #a7f3d0;
        }

        .spinner {
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid #ffffff;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          animation: spin-btn 0.8s linear infinite;
          margin-right: 8px;
          display: inline-block;
          vertical-align: middle;
        }

        @keyframes spin-btn {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
  }

  public onMount(container: HTMLElement, router: Router): void {
    const form = container.querySelector('#auth-form') as HTMLFormElement;
    const emailInput = container.querySelector('#auth-email') as HTMLInputElement;
    const passwordInput = container.querySelector('#auth-password') as HTMLInputElement;
    const fullnameInput = container.querySelector('#auth-fullname') as HTMLInputElement;
    const fullnameGroup = container.querySelector('#fullname-group') as HTMLElement;

    const contactInput = container.querySelector('#auth-contact') as HTMLInputElement;
    const specialtyInput = container.querySelector('#auth-specialty') as HTMLInputElement;
    const roomInput = container.querySelector('#auth-room') as HTMLInputElement;
    
    const contactGroup = container.querySelector('#contact-group') as HTMLElement;
    const specialtyGroup = container.querySelector('#specialty-group') as HTMLElement;
    const roomGroup = container.querySelector('#room-group') as HTMLElement;
    
    const submitBtn = container.querySelector('#auth-submit-btn') as HTMLButtonElement;
    const bypassBtn = container.querySelector('#demo-bypass-btn') as HTMLButtonElement;
    const toggleLink = container.querySelector('#auth-toggle-link') as HTMLAnchorElement;
    const toggleText = container.querySelector('#auth-toggle-text') as HTMLElement;
    
    const title = container.querySelector('#auth-title') as HTMLElement;
    const subtitle = container.querySelector('#auth-subtitle') as HTMLElement;
    const alertDiv = container.querySelector('#auth-alert') as HTMLElement;

    const showAlert = (message: string, type: 'error' | 'success') => {
      alertDiv.textContent = message;
      alertDiv.className = `auth-alert auth-alert-${type}`;
      alertDiv.style.display = 'block';
    };

    const hideAlert = () => {
      alertDiv.style.display = 'none';
    };

    // Toggle Mode (Login vs Sign Up)
    toggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      hideAlert();
      this.isSignUp = !this.isSignUp;

      if (this.isSignUp) {
        title.textContent = 'Create Account';
        subtitle.textContent = 'Register a new clinician profile to get started';
        submitBtn.innerHTML = '<span>Sign Up</span>';
        fullnameGroup.style.display = 'flex';
        fullnameInput.setAttribute('required', 'true');
        contactGroup.style.display = 'flex';
        contactInput.setAttribute('required', 'true');
        specialtyGroup.style.display = 'flex';
        specialtyInput.setAttribute('required', 'true');
        roomGroup.style.display = 'flex';
        roomInput.setAttribute('required', 'true');
        toggleText.textContent = 'Already have an account?';
        toggleLink.textContent = 'Sign In';
      } else {
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Enter your credentials to access the clinician portal';
        submitBtn.innerHTML = '<span>Sign In</span>';
        fullnameGroup.style.display = 'none';
        fullnameInput.removeAttribute('required');
        contactGroup.style.display = 'none';
        contactInput.removeAttribute('required');
        specialtyGroup.style.display = 'none';
        specialtyInput.removeAttribute('required');
        roomGroup.style.display = 'none';
        roomInput.removeAttribute('required');
        toggleText.textContent = "Don't have an account?";
        toggleLink.textContent = 'Sign Up';
      }
    });

    // Form Submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const fullName = fullnameInput.value.trim();
      const contactNumber = contactInput.value.trim();
      const specialty = specialtyInput.value.trim();
      const roomNumber = roomInput.value.trim();

      // Show loading state
      submitBtn.disabled = true;
      const originalBtnContent = submitBtn.innerHTML;
      submitBtn.innerHTML = `<div class="spinner"></div> <span>${this.isSignUp ? 'Signing Up...' : 'Signing In...'}</span>`;

      try {
        if (this.isSignUp) {
          // Sign Up flow
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
                contact_number: contactNumber,
                specialty: specialty,
                room_number: roomNumber
              }
            }
          });

          if (error) throw error;

          if (data.user) {
            const fallbackInfo = { fullName, contactNumber, specialty, roomNumber };
            // Try to create profile. If email confirmation is enabled and RLS blocks it,
            // it will be caught safely, and created during their first login.
            try {
              await ensureDoctorProfile(data.user, fallbackInfo);
            } catch (profileErr) {
              console.warn('Failed to insert profile before confirmation:', profileErr);
            }

            // Save mock session so they don't get blocked by email confirmation
            localStorage.setItem('medconnect_mock_auth', 'true');
            localStorage.setItem('medconnect_mock_user', fullName);
            localStorage.setItem('medconnect_doctor_id', data.user.id);

            showAlert('Registration successful! Redirecting to dashboard...', 'success');
            
            setTimeout(() => {
              router.navigate('dashboard');
            }, 1500);
          }
        } else {
          // Sign In flow
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) throw error;

          if (data.session) {
            // Make sure the profile and doctor details exist in the public schema
            await ensureDoctorProfile(data.session.user, { fullName });

            // Save state and redirect
            localStorage.removeItem('medconnect_mock_auth');
            localStorage.setItem('medconnect_doctor_id', data.session.user.id);
            router.navigate('dashboard');
          }
        }
      } catch (err: any) {
        console.error('Auth action failed:', err);

        // If email confirmation is required and blocked sign-in, or if we hit rate limits:
        const isEmailConfirmError = err.message?.includes('confirm') || err.message?.includes('not confirmed');
        const isRateLimitError = err.message?.includes('rate limit') || err.message?.includes('rate_limit');

        if (isEmailConfirmError || isRateLimitError) {
          showAlert(`${err.message}. Bypassing and logging in via Demo Mode...`, 'success');
          localStorage.setItem('medconnect_mock_auth', 'true');
          localStorage.setItem('medconnect_mock_user', this.isSignUp ? fullName : (email.split('@')[0] || 'Dr. Smith'));
          
          setTimeout(() => {
            router.navigate('dashboard');
          }, 1500);
          return;
        }

        showAlert(err.message || 'Authentication failed. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
      }
    });

    // Demo Mode Bypass
    bypassBtn.addEventListener('click', (e) => {
      e.preventDefault();
      hideAlert();
      
      localStorage.setItem('medconnect_mock_auth', 'true');
      localStorage.setItem('medconnect_mock_user', 'Dr. Sarah Chen');
      localStorage.setItem('medconnect_doctor_id', '171f430e-fc2b-41fc-bc61-0104b336eee4');
      
      router.navigate('dashboard');
    });
  }
}

/**
 * Ensures a record exists in both public.profiles and public.doctor_details
 * for the authenticated doctor user.
 */
async function ensureDoctorProfile(
  user: any, 
  fallbackData: { fullName?: string; contactNumber?: string; specialty?: string; roomNumber?: string } = {}
) {
  const fullName = user.user_metadata?.full_name || fallbackData.fullName || user.email?.split('@')[0] || 'Dr. Smith';
  const contactNumber = user.user_metadata?.contact_number || fallbackData.contactNumber || '(555) 000-0000';
  const specialty = user.user_metadata?.specialty || fallbackData.specialty || 'General Medicine';
  const roomNumber = user.user_metadata?.room_number || fallbackData.roomNumber || 'Room 101';

  // 1. Check if profile exists
  const { data: profile, error: profileFetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileFetchError) {
    console.warn('Error fetching profile:', profileFetchError);
  }

  // 2. If profile doesn't exist, create it
  if (!profile) {
    console.log('Profile not found, creating one...');
    const { error: profileInsertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: fullName,
        role: 'doctor',
        contact_number: contactNumber
      });

    if (profileInsertError) {
      console.error('Error inserting profile:', profileInsertError);
      throw profileInsertError;
    }
  }

  // 3. Check if doctor details exist
  const { data: docDetails, error: docFetchError } = await supabase
    .from('doctor_details')
    .select('doctor_id')
    .eq('doctor_id', user.id)
    .maybeSingle();

  if (docFetchError) {
    console.warn('Error checking doctor details:', docFetchError);
  }

  // 4. If doctor details don't exist, create them
  if (!docDetails) {
    console.log('Doctor details not found, creating...');
    const { error: docInsertError } = await supabase
      .from('doctor_details')
      .insert({
        doctor_id: user.id,
        specialty: specialty,
        room_number: roomNumber,
        is_available: true
      });

    if (docInsertError) {
      console.error('Error inserting doctor details:', docInsertError);
      throw docInsertError;
    }
  }
}
