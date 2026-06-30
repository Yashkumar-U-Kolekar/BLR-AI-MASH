import type { View, Router } from '../router';
import { getIcon } from '../assets/icons';
import { supabase } from '../supabase';
import { fetchAppointments, fetchProfiles, updateAppointment, getPatientPhotoUrl } from '../api';
import type { Appointment, Profile } from '../types';

export class ScheduleView implements View {
  private appointments: Appointment[] = [];
  private profiles: Profile[] = [];
  private filteredAppointments: Appointment[] = [];
  private activeDoctorId = 'a6bb7c5b-ef00-4ea7-8b01-b66b8df815bd'; // fallback
  private activeTab = 'all';
  private searchQuery = '';
  private hasAnyAppointments = false;

  public async render(): Promise<string> {
    // 1. Fetch doctor session
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.activeDoctorId = user.id;
      } else if (localStorage.getItem('medconnect_mock_auth') === 'true') {
        const cachedId = localStorage.getItem('medconnect_doctor_id');
        if (cachedId) this.activeDoctorId = cachedId;
      }
    } catch (e) {
      if (localStorage.getItem('medconnect_mock_auth') === 'true') {
        const cachedId = localStorage.getItem('medconnect_doctor_id');
        if (cachedId) this.activeDoctorId = cachedId;
      }
    }

    // 2. Fetch data filtered by doctor_id
    try {
      this.appointments = await fetchAppointments({ doctor_id: this.activeDoctorId });
      this.profiles = await fetchProfiles();
    } catch (err) {
      console.error('Failed to fetch schedule data:', err);
    }

    // 3. Keep appointments for this doctor
    const doctorAppointments = this.appointments;
    this.hasAnyAppointments = doctorAppointments.length > 0;

    // Sort by scheduled time ascending
    doctorAppointments.sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
    this.filteredAppointments = doctorAppointments;

    // Resolve logged-in user's name dynamically
    let loggedInName = 'Doctor';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        loggedInName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Doctor';
      } else if (localStorage.getItem('medconnect_mock_auth') === 'true') {
        loggedInName = localStorage.getItem('medconnect_mock_user') || 'Doctor';
      }
    } catch (e) {
      if (localStorage.getItem('medconnect_mock_auth') === 'true') {
        loggedInName = localStorage.getItem('medconnect_mock_user') || 'Doctor';
      }
    }

    // 4. Calculate metrics
    const totalSessions = doctorAppointments.length;
    const pendingSessions = doctorAppointments.filter(a => a.status === 'scheduled').length;
    const completedSessions = doctorAppointments.filter(a => a.status === 'completed').length;

    // 5. Generate list rows
    const rowsHtml = this.generateRowsHtml();

    return `
      <!-- Header -->
      <header class="main-header">
        <div class="header-title-section">
          <h1 class="header-title">Clinician Schedule</h1>
          <span class="header-subtitle">Manage availability and patient sessions</span>
        </div>
        <div class="header-actions">
          <button class="btn-primary" id="add-schedule-event">
            ${getIcon('plus', 'nav-icon')}
            <span>Add Block</span>
          </button>
          <div class="header-utility-icons">
            <button class="header-icon-btn">
              ${getIcon('bell', 'nav-icon')}
              <div class="badge-dot"></div>
            </button>
            <div class="user-quick-profile">
              <span class="user-name">${loggedInName}</span>
              <img src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150" alt="${loggedInName}" class="user-avatar" id="schedule-header-avatar" />
            </div>
          </div>
        </div>
      </header>

      <div class="page-content">
        <!-- Metrics Ribbon -->
        <section class="schedule-metrics-grid">
          <div class="sched-metric-card sched-total">
            <div class="sched-metric-info">
              <span class="sched-metric-label">Total Sessions</span>
              <span class="sched-metric-value" id="metric-total">${totalSessions}</span>
            </div>
            <div class="sched-metric-icon bg-blue">
              ${getIcon('calendar', 'sched-nav-icon')}
            </div>
          </div>

          <div class="sched-metric-card sched-pending">
            <div class="sched-metric-info">
              <span class="sched-metric-label">Scheduled / Pending</span>
              <span class="sched-metric-value" id="metric-pending">${pendingSessions}</span>
            </div>
            <div class="sched-metric-icon bg-yellow">
              ${getIcon('clock', 'sched-nav-icon')}
            </div>
          </div>

          <div class="sched-metric-card sched-completed">
            <div class="sched-metric-info">
              <span class="sched-metric-label">Completed Sessions</span>
              <span class="sched-metric-value" id="metric-completed">${completedSessions}</span>
            </div>
            <div class="sched-metric-icon bg-green">
              ${getIcon('check-circle', 'sched-nav-icon')}
            </div>
          </div>
        </section>

        <!-- Search & Filters Toolbar -->
        <div class="schedule-toolbar-card">
          <div class="schedule-tabs">
            <button class="tab-pill active" data-tab="all">All Sessions</button>
            <button class="tab-pill" data-tab="today">Today</button>
            <button class="tab-pill" data-tab="upcoming">Upcoming</button>
            <button class="tab-pill" data-tab="completed">Completed</button>
          </div>
          <div class="schedule-search-wrapper">
            <input type="text" class="search-input-field" id="schedule-search" placeholder="Search patients..." />
            <div class="search-icon-inside">
              ${getIcon('search', 'search-svg-icon')}
            </div>
          </div>
        </div>



        <!-- Appointments List -->
        <div class="dashboard-card schedule-list-card">
          <div class="queue-table-container">
            <table class="queue-table schedule-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Appointment Date & Time</th>
                  <th>Contact Number</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody id="schedule-table-body">
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Reschedule Modal -->
      <div class="modal-backdrop" id="reschedule-modal">
        <div class="modal-card">
          <header class="modal-header">
            <h3 class="modal-title">Reschedule Appointment</h3>
            <button class="modal-close-btn" id="close-reschedule-modal-btn">✕</button>
          </header>
          <form id="reschedule-form">
            <input type="hidden" id="reschedule-appt-id" />
            <div class="modal-body">
              <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label" style="font-weight: 600; color: #475569;">Patient Name</label>
                <div id="reschedule-patient-name" style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 4px;"></div>
              </div>
              <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label" for="reschedule-date">New Date</label>
                <input type="date" class="form-input" id="reschedule-date" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="reschedule-time">New Time</label>
                <input type="time" class="form-input" id="reschedule-time" required />
              </div>
            </div>
            <footer class="modal-footer">
              <button type="button" class="btn-secondary-dark" id="cancel-reschedule-btn">Cancel</button>
              <button type="submit" class="btn-primary">Confirm Reschedule</button>
            </footer>
          </form>
        </div>
      </div>

      <style>
        .schedule-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .sched-metric-card {
          background: #ffffff;
          border-radius: var(--card-radius);
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: var(--shadow-sm);
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.3s ease;
        }

        .sched-metric-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .sched-metric-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sched-metric-label {
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
        }

        .sched-metric-value {
          font-family: var(--font-heading);
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
        }

        .sched-metric-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sched-nav-icon {
          width: 24px;
          height: 24px;
        }

        .bg-blue {
          background-color: #e0f2fe;
          color: #0284c7;
        }

        .bg-yellow {
          background-color: #fef3c7;
          color: #d97706;
        }

        .bg-green {
          background-color: #d1fae5;
          color: #059669;
        }

        .schedule-toolbar-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: var(--shadow-sm);
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-top: -8px;
        }

        .schedule-tabs {
          display: flex;
          gap: 8px;
        }

        .tab-pill {
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }

        .tab-pill:hover {
          background-color: #f1f5f9;
          color: #0f172a;
        }

        .tab-pill.active {
          background: var(--primary-blue-light);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .schedule-search-wrapper {
          position: relative;
          width: 260px;
        }

        .search-input-field {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 8px 16px 8px 40px;
          font-size: 14px;
          outline: none;
          color: #0f172a;
          box-sizing: border-box;
          font-family: var(--font-sans);
          transition: all 0.2s ease;
        }

        .search-input-field:focus {
          border-color: var(--primary-blue-light);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-icon-inside {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          display: flex;
          align-items: center;
        }

        .search-svg-icon {
          width: 16px;
          height: 16px;
        }

        .fallback-banner {
          background-color: rgba(59, 130, 246, 0.08);
          border: 1px dashed rgba(59, 130, 246, 0.3);
          color: #1e40af;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
        }

        .schedule-table th {
          padding: 16px 24px;
        }

        .schedule-table td {
          padding: 16px 24px;
        }

        .btn-reschedule {
          padding: 6px 14px;
          background: #f1f5f9;
          color: #334155;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .btn-reschedule:hover {
          background: var(--primary-blue-light);
          color: #ffffff;
          transform: translateY(-1px);
        }

        .form-input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
          color: #0f172a;
          box-sizing: border-box;
          font-family: var(--font-sans);
        }

        .form-input:focus {
          border-color: var(--primary-blue-light);
        }

        .modal-body .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
      </style>
    `;
  }

  private generateRowsHtml(): string {
    if (this.filteredAppointments.length === 0) {
      if (!this.hasAnyAppointments) {
        return `
          <tr>
            <td colspan="5" style="text-align: center; padding: 48px; color: #94a3b8; font-size: 14px;">
              No appointments are currently assigned to your account.
            </td>
          </tr>
        `;
      }
      return `
        <tr>
          <td colspan="5" style="text-align: center; padding: 48px; color: #94a3b8; font-size: 14px;">
            No appointments match the selected filter or search criteria.
          </td>
        </tr>
      `;
    }

    return this.filteredAppointments.map(appt => {
      const patient = this.profiles.find(p => p.id === appt.patient_id);
      const patientName = patient ? patient.full_name : 'Unknown Patient';
      const contactNum = patient?.contact_number || '-';

      const initials = patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const avatarClass = `avatar-${initials.toLowerCase()}`;

      let statusClass = 'waiting';
      if (appt.status === 'in_progress') statusClass = 'in-progress';
      else if (appt.status === 'completed') statusClass = 'done';
      else if (appt.status === 'cancelled') statusClass = 'done';

      const timeFormatted = this.formatDateTime(appt.scheduled_time);

      return `
        <tr class="schedule-row" data-patient-name="${patientName.toLowerCase()}" data-status="${appt.status}" data-date="${appt.scheduled_time}">
          <td>
            <div class="patient-cell">
              <div class="patient-initials-avatar ${avatarClass}" style="position: relative; overflow: hidden;">
                <img src="${getPatientPhotoUrl(patientName)}" alt="${patientName}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';" />
                <span>${initials}</span>
              </div>
              <span class="patient-name-bold">${patientName}</span>
            </div>
          </td>
          <td style="font-weight: 500; color: #334155;">${timeFormatted}</td>
          <td style="color: #475569;">${contactNum}</td>
          <td>
            <span class="status-pill ${statusClass}">${appt.status.replace('_', ' ')}</span>
          </td>
          <td style="text-align: right;">
            <button class="btn-reschedule trigger-reschedule-btn" data-appt-id="${appt.id}" data-patient-name="${patientName}" data-time="${appt.scheduled_time}">
              Reschedule
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  private formatDateTime(isoStr: string): string {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${dateStr} at ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    } catch (e) {
      return isoStr;
    }
  }

  public onMount(container: HTMLElement, router: Router): void {
    // Dynamically update Doctor Profile in Header
    this.updateHeaderProfile(container);

    const searchInput = container.querySelector('#schedule-search') as HTMLInputElement;
    const tabs = container.querySelectorAll('.tab-pill');

    // Reschedule Modal elements
    const modal = container.querySelector('#reschedule-modal') as HTMLElement;
    const form = container.querySelector('#reschedule-form') as HTMLFormElement;
    const modalCloseBtn = container.querySelector('#close-reschedule-modal-btn') as HTMLElement;
    const modalCancelBtn = container.querySelector('#cancel-reschedule-btn') as HTMLElement;
    const inputApptId = container.querySelector('#reschedule-appt-id') as HTMLInputElement;
    const txtPatientName = container.querySelector('#reschedule-patient-name') as HTMLElement;
    const inputDate = container.querySelector('#reschedule-date') as HTMLInputElement;
    const inputTime = container.querySelector('#reschedule-time') as HTMLInputElement;

    const applyFilters = () => {
      const rows = container.querySelectorAll('.schedule-row');
      const todayStr = new Date().toDateString();

      rows.forEach(row => {
        const pName = row.getAttribute('data-patient-name') || '';
        const status = row.getAttribute('data-status') || '';
        const dateISO = row.getAttribute('data-date') || '';
        const apptDate = new Date(dateISO);

        const matchesSearch = pName.includes(this.searchQuery);
        let matchesTab = true;

        if (this.activeTab === 'today') {
          matchesTab = apptDate.toDateString() === todayStr;
        } else if (this.activeTab === 'upcoming') {
          matchesTab = apptDate.getTime() > Date.now() && status === 'scheduled';
        } else if (this.activeTab === 'completed') {
          matchesTab = status === 'completed';
        }

        if (matchesSearch && matchesTab) {
          (row as HTMLElement).style.display = 'table-row';
        } else {
          (row as HTMLElement).style.display = 'none';
        }
      });
    };

    // 1. Search Binding
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchQuery = searchInput.value.toLowerCase().trim();
        applyFilters();
      });
    }

    // 2. Tabs Selector
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTab = tab.getAttribute('data-tab') || 'all';
        applyFilters();
      });
    });

    // 3. Open Reschedule Modal
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('trigger-reschedule-btn')) {
        const apptId = target.getAttribute('data-appt-id') || '';
        const patientName = target.getAttribute('data-patient-name') || '';
        const timeStr = target.getAttribute('data-time') || '';

        inputApptId.value = apptId;
        txtPatientName.textContent = patientName;

        // Parse date and time to pre-fill
        if (timeStr) {
          const d = new Date(timeStr);
          const yyyy = d.getFullYear();
          const MM = (d.getMonth() + 1).toString().padStart(2, '0');
          const dd = d.getDate().toString().padStart(2, '0');
          inputDate.value = `${yyyy}-${MM}-${dd}`;

          const HH = d.getHours().toString().padStart(2, '0');
          const mm = d.getMinutes().toString().padStart(2, '0');
          inputTime.value = `${HH}:${mm}`;
        }

        modal.classList.add('open');
      }
    });

    // 4. Close Modal triggers
    const closeModal = () => {
      modal.classList.remove('open');
      form.reset();
    };

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);

    // 5. Submit Reschedule Form
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const apptId = inputApptId.value;
        const newDate = inputDate.value;
        const newTime = inputTime.value;

        if (!apptId || !newDate || !newTime) return;

        // Combine date and time into ISO
        const combinedString = `${newDate}T${newTime}:00`;
        const localDate = new Date(combinedString);
        
        const confirmBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        const originalText = confirmBtn.innerHTML;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = 'Rescheduling...';

        try {
          await updateAppointment(apptId, {
            scheduled_time: localDate.toISOString()
          });
          closeModal();
          // Reload the page view
          router.navigate('schedule');
        } catch (err) {
          console.error('Failed to reschedule:', err);
          alert('Failed to reschedule the appointment. Please check your backend connection.');
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = originalText;
        }
      });
    }

    // 6. Mock availability block trigger
    const addBlockBtn = container.querySelector('#add-schedule-event');
    if (addBlockBtn) {
      addBlockBtn.addEventListener('click', () => {
        alert('Availability manager: Open slots and configure clinician out-of-office blocks.');
      });
    }
  }

  private async updateHeaderProfile(container: HTMLElement) {
    const avatarEl = container.querySelector('#schedule-header-avatar') as HTMLImageElement;
    const nameEl = container.querySelector('.user-quick-profile .user-name') as HTMLElement;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Dr. Smith';
        if (nameEl) nameEl.textContent = name;
        if (avatarEl) avatarEl.alt = name;
      } else if (localStorage.getItem('medconnect_mock_auth') === 'true') {
        const name = localStorage.getItem('medconnect_mock_user') || 'Dr. Alex Smith';
        if (nameEl) nameEl.textContent = name;
        if (avatarEl) avatarEl.alt = name;
      }
    } catch (e) {
      // Keep seeded values
    }
  }
}
