import { getIcon } from './assets/icons';
import { supabase } from './supabase';

export interface View {
  render(params?: any): string | Promise<string>;
  onMount?(container: HTMLElement, router: Router): void;
}

export class Router {
  public currentRoute: string = 'dashboard';
  public isSidebarCollapsed: boolean = localStorage.getItem('medconnect_sidebar_collapsed') === 'true';
  private currentParams: any = {};
  private views: Record<string, View> = {};
  private appContainer: HTMLElement;

  constructor(appContainerId: string) {
    const container = document.getElementById(appContainerId);
    if (!container) {
      throw new Error(`Container with ID #${appContainerId} not found`);
    }
    this.appContainer = container;

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      this.routeFromHash();
    });
  }

  public routeFromHash() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    if (hash === 'auth') {
      this.navigate('auth');
    } else if (hash === 'pharmacy') {
      this.navigate('pharmacy');
    } else if (hash.startsWith('patient-profile/')) {
      const patientId = hash.split('/')[1];
      this.navigate('patient-profile', { patientId });
    } else if (hash.startsWith('prescriptions/')) {
      const patientId = hash.split('/')[1];
      this.navigate('prescriptions', { patientId });
    } else if (hash === 'patients') {
      this.navigate('patients');
    } else if (hash === 'prescriptions') {
      this.navigate('prescriptions');
    } else if (hash === 'schedule') {
      this.navigate('schedule');
    } else if (hash === 'telemetry') {
      this.navigate('telemetry');
    } else {
      this.navigate('dashboard');
    }
  }

  public registerView(name: string, view: View) {
    this.views[name] = view;
  }

  private async checkAuth(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return true;
    } catch (e) {
      console.warn('Supabase getSession failed:', e);
    }
    return localStorage.getItem('medconnect_mock_auth') === 'true';
  }

  public async navigate(routeName: string, params: any = {}) {
    const isAuthenticated = await this.checkAuth();
    
    if (!isAuthenticated && routeName !== 'auth') {
      routeName = 'auth';
    } else if (isAuthenticated && routeName === 'auth') {
      routeName = 'dashboard';
    }

    this.currentRoute = routeName;
    this.currentParams = params;
    
    // Sync hash with navigation state
    let targetHash = routeName;
    if (routeName === 'patient-profile' && params.patientId) {
      targetHash = `patient-profile/${params.patientId}`;
    } else if (routeName === 'prescriptions' && params.patientId) {
      targetHash = `prescriptions/${params.patientId}`;
    }
    
    if (window.location.hash.replace('#', '') !== targetHash) {
      window.location.hash = targetHash;
    }

    await this.renderCurrentView();
  }

  private async renderCurrentView() {
    const existingLowStockOverlay = document.getElementById('low-stock-warning-overlay');
    if (existingLowStockOverlay) {
      existingLowStockOverlay.remove();
    }

    const view = this.views[this.currentRoute];
    if (!view) {
      console.error(`View ${this.currentRoute} not registered`);
      return;
    }

    // SPECIAL CASE: Auth Page - Separate Layout (no sidebar)
    if (this.currentRoute === 'auth') {
      this.appContainer.className = 'app-container auth-portal-container';
      this.appContainer.innerHTML = `
        <main class="auth-viewport" id="viewport-container" style="width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: var(--bg-main);"></main>
      `;

      const viewport = this.appContainer.querySelector('#viewport-container') as HTMLElement;
      viewport.innerHTML = this.getSkeletonHTML('auth');

      try {
        const htmlContent = await view.render(this.currentParams);
        viewport.innerHTML = htmlContent;

        if (view.onMount) {
          view.onMount(viewport, this);
        }
      } catch (err) {
        console.error('Render error:', err);
        viewport.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: #ef4444; font-family: var(--font-sans); text-align: center; padding: 20px;">
            <span style="font-size: 40px; margin-bottom: 16px;">⚠️</span>
            <h3 style="margin-bottom: 8px;">Failed to load authentication page</h3>
          </div>
        `;
      }

      window.dispatchEvent(new CustomEvent('page-route-changed', { detail: { route: this.currentRoute, params: this.currentParams } }));
      return;
    }

    // SPECIAL CASE: Pharmacy Page - Separate Dashboard Layout
    if (this.currentRoute === 'pharmacy') {
      this.appContainer.className = 'app-container pharmacy-portal-container';
      this.appContainer.innerHTML = `
        <main class="pharmacy-viewport" id="viewport-container" style="width: 100%; min-height: 100vh; background: #f8fafc;"></main>
      `;

      const viewport = this.appContainer.querySelector('#viewport-container') as HTMLElement;
      viewport.innerHTML = this.getSkeletonHTML('pharmacy');

      try {
        const htmlContent = await view.render(this.currentParams);
        viewport.innerHTML = htmlContent;

        if (view.onMount) {
          view.onMount(viewport, this);
        }
      } catch (err) {
        console.error('Render error:', err);
        viewport.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: #ef4444; font-family: var(--font-sans); text-align: center; padding: 20px;">
            <span style="font-size: 40px; margin-bottom: 16px;">⚠️</span>
            <h3 style="margin-bottom: 8px;">Failed to load pharmacy data</h3>
            <p style="color: #64748b; max-width: 400px; font-size: 14px;">Please check that your backend server is running and connected to Supabase.</p>
          </div>
        `;
      }

      window.dispatchEvent(new CustomEvent('page-route-changed', { detail: { route: this.currentRoute, params: this.currentParams } }));
      return;
    }

    // Sidebar theme selection
    const isDarkSidebar = ['dashboard', 'patients', 'prescriptions', 'schedule', 'telemetry'].includes(this.currentRoute);
    const sidebarThemeClass = isDarkSidebar ? 'theme-dark' : 'theme-light';

    let userName = 'Dr. Smith';
    let userSubText = 'Cardiologist';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Dr. Smith';
        userSubText = user.email || 'Cardiologist';
      } else if (localStorage.getItem('medconnect_mock_auth') === 'true') {
        userName = localStorage.getItem('medconnect_mock_user') || 'Dr. Alex Smith';
        userSubText = 'Mock Clinician';
      }
    } catch (e) {
      if (localStorage.getItem('medconnect_mock_auth') === 'true') {
        userName = localStorage.getItem('medconnect_mock_user') || 'Dr. Alex Smith';
        userSubText = 'Mock Clinician';
      }
    }

    const existingSidebar = this.appContainer.querySelector('.sidebar');
    const existingViewport = this.appContainer.querySelector('#viewport-container') as HTMLElement;

    if (existingSidebar && existingViewport && this.currentRoute !== 'auth' && this.currentRoute !== 'pharmacy') {
      // 1. Sidebar already exists, just update the active states and classes
      existingSidebar.className = `sidebar ${sidebarThemeClass}`;

      const navItems = existingSidebar.querySelectorAll('.nav-item');
      navItems.forEach(item => {
        const route = item.getAttribute('data-route');
        if (route === this.currentRoute || (this.currentRoute === 'patient-profile' && route === 'patients')) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      if (this.currentRoute === 'patient-profile') {
        existingViewport.className = 'main-viewport profile-main-viewport';
      } else {
        existingViewport.className = 'main-viewport';
      }

      existingViewport.innerHTML = this.getSkeletonHTML(this.currentRoute);

      try {
        const htmlContent = await view.render(this.currentParams);
        existingViewport.innerHTML = htmlContent;

        if (view.onMount) {
          view.onMount(existingViewport, this);
        }
      } catch (err) {
        console.error('Render error:', err);
        existingViewport.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 400px; color: #ef4444; font-family: var(--font-sans); text-align: center; padding: 20px;">
            <span style="font-size: 40px; margin-bottom: 16px;">⚠️</span>
            <h3 style="margin-bottom: 8px;">Failed to load data</h3>
            <p style="color: #64748b; max-width: 400px; font-size: 14px;">Please check that your backend server is running and connected to Supabase.</p>
          </div>
        `;
      }

      this.bindLayoutEvents();
      window.dispatchEvent(new CustomEvent('page-route-changed', { detail: { route: this.currentRoute, params: this.currentParams } }));
      return;
    }

    // Set wrapper container layout
    this.appContainer.className = this.isSidebarCollapsed ? 'app-container sidebar-collapsed' : 'app-container';
    this.appContainer.innerHTML = `
      <!-- Sidebar Navigation -->
      <aside class="sidebar ${sidebarThemeClass}">
        <div class="sidebar-top">
          <div class="sidebar-header-row">
            <div class="sidebar-logo">
              ${getIcon('activity', 'nav-icon')}
              <span>MASH</span>
            </div>
            <button class="sidebar-toggle-btn" id="sidebar-toggle-trigger" title="Toggle Sidebar">
              ${getIcon(this.isSidebarCollapsed ? 'chevron-right' : 'menu', 'toggle-icon')}
            </button>
          </div>

          <!-- Doctor profile info card -->
          <div class="doctor-profile-badge">
            <div class="doctor-avatar-container">
              <img src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150" alt="${userName}" class="doctor-avatar" />
            </div>
            <div class="doctor-info-text">
              <span class="doctor-name">${userName}</span>
              <span class="doctor-specialty">${userSubText}</span>
            </div>
          </div>

          <!-- Main Nav List -->
          <nav class="sidebar-nav">
            <a href="#" class="nav-item ${this.currentRoute === 'dashboard' ? 'active' : ''}" data-route="dashboard">
              ${getIcon('grid', 'nav-icon')}
              <span>Dashboard</span>
            </a>
            <a href="#" class="nav-item ${this.currentRoute === 'patients' || this.currentRoute === 'patient-profile' ? 'active' : ''}" data-route="patients">
              ${getIcon('users', 'nav-icon')}
              <span>Patients</span>
            </a>
            <a href="#" class="nav-item ${this.currentRoute === 'prescriptions' ? 'active' : ''}" data-route="prescriptions">
              ${getIcon('pill', 'nav-icon')}
              <span>Prescriptions</span>
            </a>
            <a href="#" class="nav-item ${this.currentRoute === 'schedule' ? 'active' : ''}" data-route="schedule">
              ${getIcon('calendar', 'nav-icon')}
              <span>Schedule</span>
            </a>
            <a href="#" class="nav-item ${this.currentRoute === 'telemetry' ? 'active' : ''}" data-route="telemetry">
              ${getIcon('activity', 'nav-icon')}
              <span>Telemetry</span>
            </a>
            <a href="#" class="nav-item ${this.currentRoute === 'pharmacy' ? 'active' : ''}" data-route="pharmacy">
              ${getIcon('box', 'nav-icon')}
              <span>Pharmacy</span>
            </a>
          </nav>
        </div>

        <!-- Logout Button -->
        <button class="logout-btn">
          ${getIcon('log-out', 'nav-icon')}
          <span>Logout</span>
        </button>
      </aside>

      <!-- Main Page Content Viewport -->
      <main class="main-viewport" id="viewport-container"></main>
    `;

    const viewport = this.appContainer.querySelector('#viewport-container') as HTMLElement;
    
    // Add page-specific backgrounds
    if (this.currentRoute === 'patient-profile') {
      viewport.className = 'main-viewport profile-main-viewport';
    } else {
      viewport.className = 'main-viewport';
    }

    viewport.innerHTML = this.getSkeletonHTML(this.currentRoute);

    try {
      const htmlContent = await view.render(this.currentParams);
      viewport.innerHTML = htmlContent;

      if (view.onMount) {
        view.onMount(viewport, this);
      }
    } catch (err) {
      console.error('Render error:', err);
      viewport.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 400px; color: #ef4444; font-family: var(--font-sans); text-align: center; padding: 20px;">
          <span style="font-size: 40px; margin-bottom: 16px;">⚠️</span>
          <h3 style="margin-bottom: 8px;">Failed to load data</h3>
          <p style="color: #64748b; max-width: 400px; font-size: 14px;">Please check that your backend server is running and connected to Supabase.</p>
        </div>
      `;
    }
    
    this.bindLayoutEvents();
    window.dispatchEvent(new CustomEvent('page-route-changed', { detail: { route: this.currentRoute, params: this.currentParams } }));
  }

  private getSkeletonHTML(route: string): string {
    if (route === 'dashboard') {
      return `
        <div class="skeleton-page dashboard-skeleton">
          <header class="skeleton-header">
            <div class="skeleton-title-block">
              <div class="skeleton-line" style="width: 220px; height: 28px; background: #e2e8f0; margin-bottom: 8px;"></div>
              <div class="skeleton-line" style="width: 160px; height: 14px; background: #cbd5e1;"></div>
            </div>
            <div style="display: flex; gap: 12px; align-items: center;">
              <div class="skeleton-line" style="width: 100px; height: 16px; background: #e2e8f0;"></div>
              <div class="skeleton-circle" style="width: 40px; height: 40px; border-radius: 50%; background: #e2e8f0;"></div>
            </div>
          </header>
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; padding: 0 40px 40px 40px; flex-grow: 1; box-sizing: border-box;">
            <div style="display: flex; flex-direction: column; gap: 24px;">
              <div style="display: flex; gap: 16px;">
                <div class="skeleton-card" style="flex: 1; height: 110px; border-radius: 16px; background: #ffffff;"></div>
                <div class="skeleton-card" style="flex: 1; height: 110px; border-radius: 16px; background: #ffffff;"></div>
                <div class="skeleton-card" style="flex: 1; height: 110px; border-radius: 16px; background: #ffffff;"></div>
              </div>
              <div class="skeleton-card" style="flex-grow: 1; min-height: 300px; border-radius: 20px; background: #ffffff;"></div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 24px;">
              <div class="skeleton-card" style="height: 320px; border-radius: 20px; background: #ffffff;"></div>
              <div class="skeleton-card" style="flex-grow: 1; min-height: 120px; border-radius: 20px; background: #ffffff;"></div>
            </div>
          </div>
        </div>
      `;
    }
    
    if (route === 'patients') {
      return `
        <div class="skeleton-page patients-skeleton">
          <header class="skeleton-header">
            <div class="skeleton-title-block">
              <div class="skeleton-line" style="width: 180px; height: 28px; background: #e2e8f0; margin-bottom: 8px;"></div>
              <div class="skeleton-line" style="width: 200px; height: 14px; background: #cbd5e1;"></div>
            </div>
            <div style="display: flex; gap: 16px; align-items: center;">
              <div class="skeleton-search-bar" style="width: 260px; height: 36px; border-radius: 10px; background: #e2e8f0;"></div>
              <div class="skeleton-circle" style="width: 40px; height: 40px; border-radius: 50%; background: #e2e8f0;"></div>
            </div>
          </header>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; padding: 0 40px 40px 40px; overflow-y: auto; flex-grow: 1; box-sizing: border-box;">
            ${Array(4).fill(0).map(() => `
              <div class="skeleton-card" style="height: 290px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; padding: 24px; background: #ffffff; box-sizing: border-box;">
                <div class="skeleton-circle" style="width: 72px; height: 72px; border-radius: 50%; margin-bottom: 16px; background: #e2e8f0;"></div>
                <div class="skeleton-line" style="width: 140px; height: 18px; margin-bottom: 8px; background: #e2e8f0;"></div>
                <div class="skeleton-line" style="width: 60px; height: 12px; margin-bottom: 24px; background: #cbd5e1;"></div>
                <div class="skeleton-line" style="width: 80%; height: 10px; margin-bottom: 8px; background: #f1f5f9;"></div>
                <div class="skeleton-line" style="width: 60%; height: 10px; margin-bottom: 24px; background: #f1f5f9;"></div>
                <div class="skeleton-button" style="width: 100%; height: 36px; border-radius: 8px; background: #e2e8f0;"></div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    if (route === 'patient-profile') {
      return `
        <div class="skeleton-page profile-skeleton" style="background: #f8fafc; flex-grow: 1;">
          <div class="skeleton-hero-banner" style="height: 240px; background: #0f172a; padding: 32px 40px; display: flex; flex-direction: column; justify-content: space-between; position: relative; box-sizing: border-box;">
            <div class="skeleton-line" style="width: 100px; height: 24px; background: rgba(255,255,255,0.15); border-radius: 6px;"></div>
            <div style="display: flex; justify-content: center; width: 100%;">
              <div class="skeleton-circle" style="width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,0.2); border: 4px solid rgba(255,255,255,0.3);"></div>
            </div>
          </div>
          <div class="skeleton-floating-bar" style="margin: -45px auto 0 auto; width: 90%; height: 90px; border-radius: 16px; background: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.05); display: flex; align-items: center; padding: 0 24px; gap: 16px; box-sizing: border-box; position: relative; z-index: 10;">
            <div class="skeleton-circle" style="width: 48px; height: 48px; border-radius: 50%; background: #e2e8f0;"></div>
            <div style="flex: 1;">
              <div class="skeleton-line" style="width: 160px; height: 16px; margin-bottom: 6px; background: #e2e8f0;"></div>
              <div class="skeleton-line" style="width: 100px; height: 12px; background: #cbd5e1;"></div>
            </div>
            <div class="skeleton-button" style="width: 110px; height: 36px; border-radius: 8px; background: #e2e8f0;"></div>
            <div class="skeleton-button" style="width: 110px; height: 36px; border-radius: 8px; background: #e2e8f0;"></div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 40px; box-sizing: border-box;">
            <div style="display: flex; flex-direction: column; gap: 24px;">
              <div class="skeleton-card" style="height: 280px; border-radius: 16px; background: #ffffff;"></div>
              <div class="skeleton-card" style="height: 200px; border-radius: 16px; background: #ffffff;"></div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 24px;">
              <div class="skeleton-card" style="height: 180px; border-radius: 16px; background: #ffffff;"></div>
              <div class="skeleton-card" style="height: 300px; border-radius: 16px; background: #ffffff;"></div>
            </div>
          </div>
        </div>
      `;
    }
    
    if (route === 'prescriptions') {
      return `
        <div class="skeleton-page prescriptions-skeleton">
          <header class="skeleton-header">
            <div class="skeleton-title-block">
              <div class="skeleton-line" style="width: 200px; height: 28px; background: #e2e8f0; margin-bottom: 8px;"></div>
              <div class="skeleton-line" style="width: 150px; height: 14px; background: #cbd5e1;"></div>
            </div>
          </header>
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px; padding: 0 40px 40px 40px; flex-grow: 1; box-sizing: border-box;">
            <div class="skeleton-card" style="height: 500px; border-radius: 16px; background: #ffffff;"></div>
            <div class="skeleton-card" style="height: 500px; border-radius: 16px; background: #ffffff;"></div>
          </div>
        </div>
      `;
    }
    
    if (route === 'schedule') {
      return `
        <div class="skeleton-page schedule-skeleton">
          <header class="skeleton-header">
            <div class="skeleton-title-block">
              <div class="skeleton-line" style="width: 160px; height: 28px; background: #e2e8f0; margin-bottom: 8px;"></div>
              <div class="skeleton-line" style="width: 180px; height: 14px; background: #cbd5e1;"></div>
            </div>
          </header>
          <div style="padding: 0 40px 40px 40px; flex-grow: 1; display: flex; flex-direction: column; box-sizing: border-box;">
            <div class="skeleton-card" style="flex-grow: 1; border-radius: 16px; padding: 24px; background: #ffffff; min-height: 400px; box-sizing: border-box;">
              <div class="skeleton-line" style="width: 130px; height: 20px; margin-bottom: 32px; background: #e2e8f0;"></div>
              <div style="display: flex; flex-direction: column; gap: 20px;">
                ${Array(4).fill(0).map(() => `
                  <div style="display: flex; align-items: center; gap: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; box-sizing: border-box;">
                    <div class="skeleton-circle" style="width: 36px; height: 36px; border-radius: 50%; background: #e2e8f0;"></div>
                    <div class="skeleton-line" style="width: 150px; height: 16px; background: #e2e8f0;"></div>
                    <div class="skeleton-line" style="width: 100px; height: 14px; background: #cbd5e1;"></div>
                    <div class="skeleton-line" style="width: 80px; height: 14px; background: #cbd5e1; margin-left: auto;"></div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    if (route === 'pharmacy') {
      return `
        <div class="skeleton-page pharmacy-skeleton" style="padding: 40px; box-sizing: border-box; flex-grow: 1; display: flex; flex-direction: column; background: #f8fafc;">
          <div class="skeleton-line" style="width: 220px; height: 30px; margin-bottom: 8px; background: #cbd5e1;"></div>
          <div class="skeleton-line" style="width: 160px; height: 14px; margin-bottom: 32px; background: #e2e8f0;"></div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; flex-grow: 1;">
            <div class="skeleton-card" style="border-radius: 16px; background: #ffffff; min-height: 380px;"></div>
            <div class="skeleton-card" style="border-radius: 16px; background: #ffffff; min-height: 380px;"></div>
          </div>
        </div>
      `;
    }
    
    if (route === 'auth') {
      return `
        <div class="skeleton-page auth-skeleton" style="display: flex; justify-content: center; align-items: center; height: 100vh; width: 100%; background: #f8fafc; box-sizing: border-box;">
          <div class="skeleton-card" style="width: 420px; height: 500px; border-radius: 24px; padding: 40px; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; background: #ffffff;">
            <div class="skeleton-circle" style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 24px; background: #e2e8f0;"></div>
            <div class="skeleton-line" style="width: 160px; height: 24px; margin-bottom: 8px; background: #cbd5e1;"></div>
            <div class="skeleton-line" style="width: 200px; height: 14px; margin-bottom: 40px; background: #cbd5e1;"></div>
            <div class="skeleton-line" style="width: 100%; height: 44px; border-radius: 12px; margin-bottom: 16px; background: #f1f5f9;"></div>
            <div class="skeleton-line" style="width: 100%; height: 44px; border-radius: 12px; margin-bottom: 24px; background: #f1f5f9;"></div>
            <div class="skeleton-button" style="width: 100%; height: 44px; border-radius: 12px; background: #e2e8f0;"></div>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="skeleton-page generic-skeleton" style="padding: 40px; flex-grow: 1; box-sizing: border-box;">
        <div class="skeleton-line" style="width: 200px; height: 28px; margin-bottom: 24px; background: #cbd5e1;"></div>
        <div class="skeleton-card" style="width: 100%; height: 400px; border-radius: 16px; background: #ffffff;"></div>
      </div>
    `;
  }

  private bindLayoutEvents() {
    // Nav links binding
    const navItems = this.appContainer.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const route = item.getAttribute('data-route');
        if (route) {
          this.navigate(route);
        }
      });
    });

    // Logout button binding
    const logoutBtn = this.appContainer.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.warn('Supabase signOut failed:', e);
        }
        localStorage.removeItem('medconnect_mock_auth');
        localStorage.removeItem('medconnect_mock_user');
        this.navigate('auth');
      });
    }

    // Sidebar toggle button binding
    const toggleBtn = this.appContainer.querySelector('#sidebar-toggle-trigger');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
        localStorage.setItem('medconnect_sidebar_collapsed', String(this.isSidebarCollapsed));
        if (this.isSidebarCollapsed) {
          this.appContainer.classList.add('sidebar-collapsed');
          toggleBtn.innerHTML = getIcon('chevron-right', 'toggle-icon');
        } else {
          this.appContainer.classList.remove('sidebar-collapsed');
          toggleBtn.innerHTML = getIcon('menu', 'toggle-icon');
        }
      });
    }
  }
}
