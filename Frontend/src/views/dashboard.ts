import { type View, Router } from '../router';
import { 
  fetchAppointments, 
  fetchProfiles, 
  fetchMetrics, 
  createAppointment, 
  createProfile,
  fetchPrescriptions,
  fetchPrescriptionItems,
  fetchMedicineInventory,
  getPatientPhotoUrl,
  fetchDoctorDetails
} from '../api';
import type { Appointment, Profile, DashboardMetrics } from '../types';
import { getIcon } from '../assets/icons';
import { supabase } from '../supabase';

// Internal state
let queueAppointments: Appointment[] = [];
let profiles: Profile[] = [];
let metrics: DashboardMetrics = {
  todayAppointmentsCount: 0,
  remainingAppointmentsCount: 0,
  pendingAlternativeMedCount: 0,
  notificationsCount: 0,
  stockAlertsCount: 0
};

const now = new Date();
let selectedDate: Date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
let displayDate: Date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  let hours = date.getUTCHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

function formatTime24(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export class DashboardView implements View {
  public async render(): Promise<string> {
    // Resolve logged-in doctor's ID and name dynamically
    let doctorId: string | null = null;
    let loggedInName = 'Doctor';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        doctorId = user.id;
        loggedInName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Doctor';
      } else if (localStorage.getItem('medconnect_mock_auth') === 'true') {
        loggedInName = localStorage.getItem('medconnect_mock_user') || 'Doctor';
        doctorId = localStorage.getItem('medconnect_doctor_id');
      }
    } catch (e) {
      if (localStorage.getItem('medconnect_mock_auth') === 'true') {
        loggedInName = localStorage.getItem('medconnect_mock_user') || 'Doctor';
        doctorId = localStorage.getItem('medconnect_doctor_id');
      }
    }

    const activeDoctorId = doctorId || 'a6bb7c5b-ef00-4ea7-8b01-b66b8df815bd';

    queueAppointments = await fetchAppointments({ doctor_id: activeDoctorId });
    profiles = await fetchProfiles();
    metrics = await fetchMetrics(activeDoctorId);
    const allPrescriptions = await fetchPrescriptions();
    const allPrescriptionItems = await fetchPrescriptionItems();
    const allInventory = await fetchMedicineInventory();
    const allDoctorDetails = await fetchDoctorDetails();
    const doctorDetails = allDoctorDetails.find(d => d.doctor_id === activeDoctorId);

    // Find all prescriptions with status 'alternative_requested' for the active doctor
    const shortageRx = allPrescriptions.filter(rx => rx.status === 'alternative_requested' && rx.doctor_id === activeDoctorId);
    
    let alertsHTML = '';
    if (shortageRx.length > 0) {
      const alertCards = shortageRx.map(rx => {
        const patient = profiles.find(p => p.id === rx.patient_id);
        const patientName = patient ? patient.full_name : 'Unknown Patient';
        
        const rxItems = allPrescriptionItems.filter(item => item.prescription_id === rx.id);
        const medNames = rxItems.map(item => {
          const med = allInventory.find(m => m.id === item.medicine_id);
          return med ? med.medicine_name : 'Medication';
        }).join(', ');

        const comments = rx.doctor_comments || 'Please check for alternatives due to stock constraints.';

        return `
          <div class="shortage-alert-card" style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; gap: 16px; box-shadow: var(--shadow-sm); border: 1px solid #fef3c7; border-left-width: 4px; margin-bottom: 12px;">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
              <span style="font-size: 20px; margin-top: 2px;">⚠️</span>
              <div style="text-align: left;">
                <h4 style="margin: 0 0 4px 0; font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: #78350f;">Prescription Shortage Alert</h4>
                <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.4;">
                  Pharmacy reported a shortage of <strong>${medNames}</strong> for <strong>${patientName}</strong>.<br/>
                  <span style="font-style: italic; color: #b45309; font-size: 12px;">Pharmacist Notes: "${comments}"</span>
                </p>
              </div>
            </div>
            <button class="btn-resolve-alert" data-patient-id="${rx.patient_id}" style="background: #d97706; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.2); font-size: 12px; padding: 8px 16px; flex-shrink: 0; border: none; cursor: pointer; border-radius: 8px; font-weight: 600; color: white;">
              Provide Alternative
            </button>
          </div>
        `;
      }).join('');

      alertsHTML = `
        <div class="shortage-alerts-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 12px;">
          ${alertCards}
        </div>
      `;
    }

    // Filter queue by selected date (timezone-safe UTC date comparison)
    const selectedDateString = `${selectedDate.getUTCFullYear()}-${(selectedDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getUTCDate().toString().padStart(2, '0')}`;
    const filteredAppts = queueAppointments.filter(appt => {
      const apptDate = new Date(appt.scheduled_time);
      const apptDateString = `${apptDate.getUTCFullYear()}-${(apptDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${apptDate.getUTCDate().toString().padStart(2, '0')}`;
      return apptDateString === selectedDateString;
    });

    const todayAppointmentsCount = filteredAppts.length;
    const remainingAppointmentsCount = filteredAppts.filter(appt => appt.status === 'scheduled').length;

    // Generate queue rows
    const tableRows = filteredAppts.map(appt => {
      const patient = profiles.find(p => p.id === appt.patient_id);
      if (!patient) return '';

      let statusClass = 'waiting';
      if (appt.status === 'in_progress') statusClass = 'in-progress';
      else if (appt.status === 'completed') statusClass = 'done';

      const initials = getInitials(patient.full_name);
      const avatarClass = `avatar-${initials.toLowerCase()}`;
      const timeStr = formatTime(appt.scheduled_time);

      return `
        <tr class="patient-row-btn" data-patient-id="${patient.id}">
          <td>
            <div class="patient-cell">
              <div class="patient-initials-avatar ${avatarClass}" style="position: relative; overflow: hidden;">
                <img src="${getPatientPhotoUrl(patient.full_name)}" alt="${patient.full_name}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';" />
                <span>${initials}</span>
              </div>
              <span class="patient-name-bold">${patient.full_name}</span>
            </div>
          </td>
          <td>${timeStr}</td>
          <td>
            <span class="status-pill ${statusClass}">${appt.status.replace('_', ' ')}</span>
          </td>
          <td>
            <button class="action-info-btn" data-patient-id="${patient.id}">
              ${getIcon('info', 'nav-icon')}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const formattedHeaderDate = selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });

    // Calendar widget dynamic construction
    const displayYear = displayDate.getUTCFullYear();
    const displayMonth = displayDate.getUTCMonth();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const firstDayOfMonth = new Date(Date.UTC(displayYear, displayMonth, 1));
    const startDayOfWeek = firstDayOfMonth.getUTCDay();
    const daysInMonth = new Date(Date.UTC(displayYear, displayMonth + 1, 0)).getUTCDate();
    const prevMonthDays = new Date(Date.UTC(displayYear, displayMonth, 0)).getUTCDate();

    const calendarCells: string[] = [];

    // Padding prev month (timezone-safe date strings)
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(Date.UTC(displayYear, displayMonth - 1, dayNum));
      const prevYear = prevDate.getUTCFullYear();
      const prevMonth = prevDate.getUTCMonth();
      const cellDateStr = `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      const hasEvent = queueAppointments.some(appt => {
        const apptDate = new Date(appt.scheduled_time);
        const apptDateStr = `${apptDate.getUTCFullYear()}-${(apptDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${apptDate.getUTCDate().toString().padStart(2, '0')}`;
        return apptDateStr === cellDateStr;
      });
      calendarCells.push(`
        <div class="calendar-day prev-month ${hasEvent ? 'has-event' : ''}" data-date="${cellDateStr}">${dayNum}</div>
      `);
    }

    // Current month days (timezone-safe date strings)
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const cellDateStr = `${displayYear}-${(displayMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      const isSelected = selectedDate.getUTCDate() === dayNum && selectedDate.getUTCMonth() === displayMonth && selectedDate.getUTCFullYear() === displayYear;
      const hasEvent = queueAppointments.some(appt => {
        const apptDate = new Date(appt.scheduled_time);
        const apptDateStr = `${apptDate.getUTCFullYear()}-${(apptDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${apptDate.getUTCDate().toString().padStart(2, '0')}`;
        return apptDateStr === cellDateStr;
      });
      calendarCells.push(`
        <div class="calendar-day current-month ${isSelected ? 'active' : ''} ${hasEvent ? 'has-event' : ''}" data-date="${cellDateStr}">${dayNum}</div>
      `);
    }

    // Next month padding (timezone-safe date strings)
    const totalCells = calendarCells.length;
    const nextMonthPadding = 42 - totalCells;
    for (let dayNum = 1; dayNum <= nextMonthPadding; dayNum++) {
      const nextDate = new Date(Date.UTC(displayYear, displayMonth + 1, dayNum));
      const nextYear = nextDate.getUTCFullYear();
      const nextMonth = nextDate.getUTCMonth();
      const cellDateStr = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      const hasEvent = queueAppointments.some(appt => {
        const apptDate = new Date(appt.scheduled_time);
        const apptDateStr = `${apptDate.getUTCFullYear()}-${(apptDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${apptDate.getUTCDate().toString().padStart(2, '0')}`;
        return apptDateStr === cellDateStr;
      });
      calendarCells.push(`
        <div class="calendar-day next-month ${hasEvent ? 'has-event' : ''}" data-date="${cellDateStr}">${dayNum}</div>
      `);
    }

    const calendarDaysHTML = calendarCells.join('');

    // Sort active appointments for events list
    const sortedFilteredAppts = [...filteredAppts].sort((a, b) => {
      return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
    });

    let upcomingEventsHTML = '';
    if (sortedFilteredAppts.length > 0) {
      upcomingEventsHTML = sortedFilteredAppts.map((appt, idx) => {
        const patient = profiles.find(p => p.id === appt.patient_id);
        const patientName = patient ? patient.full_name : 'Unknown Patient';
        const timeStr = formatTime24(appt.scheduled_time);
        
        let location = 'Telehealth';
        if (doctorDetails && doctorDetails.room_number) {
          location = `Room ${doctorDetails.room_number}`;
        }
        
        if (appt.status === 'in_progress') {
          location = 'In Progress';
        } else if (appt.status === 'completed') {
          location = 'Completed';
        }

        const borderStyle = idx % 2 === 1 ? 'style="border-left-color: var(--accent-cyan);"' : '';
        return `
          <div class="upcoming-event-item" ${borderStyle}>
            <div class="event-time">${timeStr}</div>
            <div class="event-details">
              <span class="event-title">Consultation - ${patientName}</span>
              <span class="event-location">${location}</span>
            </div>
          </div>
        `;
      }).join('');
    } else {
      upcomingEventsHTML = `
        <div style="padding: 16px 20px; color: #64748b; font-size: 13px; text-align: center;">
          No events scheduled for this day.
        </div>
      `;
    }



    return `
      <!-- Header -->
      <header class="main-header">
        <div class="header-title-section">
          <h1 class="header-title">Good morning, ${loggedInName}</h1>
          <span class="header-subtitle">${formattedHeaderDate}</span>
        </div>
        <div class="header-actions">
          <button class="btn-primary" id="open-appointment-btn">
            ${getIcon('plus', 'nav-icon')}
            <span>New Appointment</span>
          </button>
          <div class="header-utility-icons">
            <button class="header-icon-btn">
              ${getIcon('bell', 'nav-icon')}
              <div class="badge-dot"></div>
            </button>
            <div class="user-quick-profile">
              <span class="user-name">${loggedInName}</span>
              <img src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150" alt="${loggedInName}" class="user-avatar" />
            </div>
          </div>
        </div>
      </header>

      <!-- Main Dashboard Grid -->
      <div class="page-content">
        <!-- Metrics Cards -->
        <section class="metrics-grid">
          <div class="metric-card metric-appointments">
            <div class="metric-card-content">
              <span class="metric-label">Today's Appointments</span>
              <div class="metric-number-row">
                <span class="metric-value">${todayAppointmentsCount}</span>
                <span class="metric-badge green">${remainingAppointmentsCount} Remaining</span>
              </div>
            </div>
            <div class="metric-icon-wrapper">
              ${getIcon('calendar', 'nav-icon')}
            </div>
          </div>

          <div class="metric-card metric-alternative-meds">
            <div class="metric-card-content">
              <span class="metric-label">Pending Alt Med Requests</span>
              <div class="metric-number-row">
                <span class="metric-value">${metrics.pendingAlternativeMedCount}</span>
              </div>
            </div>
            <div class="metric-icon-wrapper">
              ${getIcon('pill', 'nav-icon')}
            </div>
          </div>

          <div class="metric-card metric-notifications">
            <div class="metric-card-content">
              <span class="metric-label">Notifications</span>
              <div class="metric-number-row">
                <span class="metric-value">${metrics.notificationsCount}</span>
                <span class="metric-badge green">New alerts</span>
              </div>
            </div>
            <div class="metric-icon-wrapper">
              ${getIcon('bell', 'nav-icon')}
            </div>
          </div>

          <div class="metric-card metric-stock">
            <div class="metric-card-content">
              <span class="metric-label">Stock Alerts</span>
              <div class="metric-number-row">
                <span class="metric-value">${metrics.stockAlertsCount}</span>
                <span class="metric-badge red">Low Stock</span>
              </div>
            </div>
            <div class="metric-icon-wrapper">
              ${getIcon('box', 'nav-icon')}
            </div>
          </div>
        </section>

        ${alertsHTML}

        <!-- Main Cards Grid Layout -->
        <div class="dashboard-grid">
          
          <section class="dashboard-card">
            <div class="card-header">
              <h2 class="card-title">Today's Patient Queue</h2>
              <a href="#" class="card-header-link" id="view-all-patients">View All</a>
            </div>
            <div class="queue-table-container">
              <table class="queue-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="queue-table-body">
                  ${tableRows || `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 40px 0;">No appointments scheduled for this day.</td></tr>`}
                </tbody>
              </table>
            </div>
          </section>

          <aside class="dashboard-sidebar-column">
            
            <div class="dashboard-card calendar-card">
              <div class="card-header">
                <h2 class="card-title">${monthNames[displayMonth]} ${displayYear}</h2>
                <div class="calendar-navigation">
                  <button class="calendar-arrow-btn">${getIcon('chevron-left', 'nav-icon')}</button>
                  <button class="calendar-arrow-btn">${getIcon('chevron-right', 'nav-icon')}</button>
                </div>
              </div>
              <div class="calendar-body">
                <div class="calendar-days-header">
                  <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                </div>
                <div class="calendar-days-grid">
                  ${calendarDaysHTML}
                </div>
              </div>
            </div>

            <div class="dashboard-card upcoming-patient-card">
              <h2 class="card-title" style="margin-bottom: 12px;">Upcoming Today</h2>
              <div class="upcoming-events-list">
                ${upcomingEventsHTML}
              </div>
            </div>

          </aside>
        </div>
      </div>

      <!-- Add Appointment Modal -->
      <div class="modal-backdrop" id="appointment-modal">
        <div class="modal-card">
          <header class="modal-header">
            <h3 class="modal-title">New Appointment</h3>
            <button class="modal-close-btn" id="close-modal-btn">✕</button>
          </header>
          <form id="new-appointment-form">
            <div class="modal-body">
              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label" style="margin-bottom: 0;">Patient</label>
                  <button type="button" id="toggle-patient-mode-btn" style="background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; font-weight: 600; padding: 0;">+ Create New Patient</button>
                </div>
                <div id="select-patient-wrapper">
                  <select class="form-select" id="patient-select" required>
                    <option value="">Select Patient...</option>
                    ${profiles.filter(p => p.role === 'patient').map(p => `<option value="${p.id}">${p.full_name}</option>`).join('')}
                  </select>
                </div>
                <div id="create-patient-wrapper" style="display: none; border: 1px dashed #cbd5e1; padding: 12px; border-radius: 8px; margin-top: 4px; background: #f8fafc; gap: 8px; flex-direction: column;">
                  <div class="form-group" style="margin-bottom: 8px;">
                    <label class="form-label" for="new-patient-name" style="font-size: 11px; margin-bottom: 4px;">Patient Full Name *</label>
                    <input type="text" class="form-input" id="new-patient-name" placeholder="Enter full name" />
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" for="new-patient-phone" style="font-size: 11px; margin-bottom: 4px;">Contact Number</label>
                    <input type="text" class="form-input" id="new-patient-phone" placeholder="e.g. (555) 000-0000" />
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="appointment-time">Time</label>
                <input type="time" class="form-input" id="appointment-time" required value="09:30"/>
              </div>
              <div class="form-group">
                <label class="form-label" for="appointment-status">Status</label>
                <select class="form-select" id="appointment-status" required>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <footer class="modal-footer">
              <button type="button" class="btn-secondary-dark" id="cancel-modal-btn">Cancel</button>
              <button type="submit" class="btn-primary">Add Appointment</button>
            </footer>
          </form>
        </div>
      </div>
    `;
  }

  public onMount(container: HTMLElement, router: Router): void {
    const rows = container.querySelectorAll('.patient-row-btn');
    rows.forEach(row => {
      row.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.action-info-btn')) return;
        const patientId = row.getAttribute('data-patient-id');
        if (patientId) router.navigate('patient-profile', { patientId });
      });
    });

    const infoBtns = container.querySelectorAll('.action-info-btn');
    infoBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const patientId = btn.getAttribute('data-patient-id');
        if (patientId) router.navigate('patient-profile', { patientId });
      });
    });

    const viewAllLink = container.querySelector('#view-all-patients');
    if (viewAllLink) {
      viewAllLink.addEventListener('click', (e) => {
        e.preventDefault();
        router.navigate('patients');
      });
    }


    // Calendar month navigation
    const prevMonthBtn = container.querySelector('.calendar-arrow-btn:first-child');
    const nextMonthBtn = container.querySelector('.calendar-arrow-btn:last-child');
    if (prevMonthBtn) {
      prevMonthBtn.addEventListener('click', () => {
        displayDate.setUTCMonth(displayDate.getUTCMonth() - 1);
        router.navigate('dashboard');
      });
    }
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener('click', () => {
        displayDate.setUTCMonth(displayDate.getUTCMonth() + 1);
        router.navigate('dashboard');
      });
    }

    // Calendar day selection
    const dayElements = container.querySelectorAll('.calendar-day');
    dayElements.forEach(dayEl => {
      dayEl.addEventListener('click', () => {
        const dateStr = dayEl.getAttribute('data-date');
        if (dateStr) {
          const parts = dateStr.split('-');
          const yr = parseInt(parts[0], 10);
          const mo = parseInt(parts[1], 10) - 1;
          const dy = parseInt(parts[2], 10);
          selectedDate = new Date(Date.UTC(yr, mo, dy));
          displayDate = new Date(selectedDate);
          router.navigate('dashboard');
        }
      });
    });

    const appointmentModal = container.querySelector('#appointment-modal') as HTMLElement;
    const openModalBtn = container.querySelector('#open-appointment-btn') as HTMLElement;
    const closeModalBtn = container.querySelector('#close-modal-btn') as HTMLElement;
    const cancelModalBtn = container.querySelector('#cancel-modal-btn') as HTMLElement;
    const appointmentForm = container.querySelector('#new-appointment-form') as HTMLFormElement;

    let isCreatingPatient = false;
    const toggleBtn = container.querySelector('#toggle-patient-mode-btn') as HTMLButtonElement;
    const selectWrapper = container.querySelector('#select-patient-wrapper') as HTMLElement;
    const createWrapper = container.querySelector('#create-patient-wrapper') as HTMLElement;
    const patientIdSelect = container.querySelector('#patient-select') as HTMLSelectElement;
    const newPatientNameInput = container.querySelector('#new-patient-name') as HTMLInputElement;
    const newPatientPhoneInput = container.querySelector('#new-patient-phone') as HTMLInputElement;

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        isCreatingPatient = !isCreatingPatient;
        if (isCreatingPatient) {
          selectWrapper.style.display = 'none';
          createWrapper.style.display = 'flex';
          patientIdSelect.removeAttribute('required');
          newPatientNameInput.setAttribute('required', 'true');
          toggleBtn.textContent = 'Select Existing Patient';
        } else {
          selectWrapper.style.display = 'block';
          createWrapper.style.display = 'none';
          patientIdSelect.setAttribute('required', 'true');
          newPatientNameInput.removeAttribute('required');
          toggleBtn.textContent = '+ Create New Patient';
        }
      });
    }

    const openModal = () => appointmentModal.classList.add('open');
    const closeModal = () => {
      appointmentModal.classList.remove('open');
      appointmentForm.reset();
      isCreatingPatient = false;
      selectWrapper.style.display = 'block';
      createWrapper.style.display = 'none';
      patientIdSelect.setAttribute('required', 'true');
      newPatientNameInput.removeAttribute('required');
      if (toggleBtn) toggleBtn.textContent = '+ Create New Patient';
    };

    if (openModalBtn) openModalBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

    if (appointmentForm) {
      appointmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const timeInput = container.querySelector('#appointment-time') as HTMLInputElement;
        const statusSelect = container.querySelector('#appointment-status') as HTMLSelectElement;
        const timeVal = timeInput.value;
        const statusVal = statusSelect.value;

        const date = new Date(selectedDate);
        const [hours, mins] = timeVal.split(':');
        date.setUTCHours(parseInt(hours, 10));
        date.setUTCMinutes(parseInt(mins, 10));
        date.setUTCSeconds(0);
        date.setUTCMilliseconds(0);

        let targetPatientId = '';

        try {
          if (isCreatingPatient) {
            const nameVal = newPatientNameInput.value.trim();
            const phoneVal = newPatientPhoneInput.value.trim();
            if (!nameVal) return;

            // 1. Create the new patient profile in the DB
            const newProfile = await createProfile({ full_name: nameVal, contact_number: phoneVal });
            targetPatientId = newProfile.id;
          } else {
            targetPatientId = patientIdSelect.value;
          }

          if (!targetPatientId) {
            closeModal();
            return;
          }

          // 2. Resolve a valid doctor UUID from the database profiles list to prevent constraint errors
          const docProfile = profiles.find(p => p.role === 'doctor');
          const doctorId = docProfile ? docProfile.id : 'a6bb7c5b-ef00-4ea7-8b01-b66b8df815bd';

          await createAppointment({
            patient_id: targetPatientId,
            doctor_id: doctorId,
            scheduled_time: date.toISOString(),
            status: statusVal
          });

          closeModal();
          router.navigate('dashboard');
        } catch (err) {
          console.error(err);
          alert('Failed to save appointment or create patient in the database.');
          closeModal();
        }
      });
    }

    // Shortage alert resolve handlers
    const resolveBtns = container.querySelectorAll('.btn-resolve-alert');
    resolveBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const patientId = btn.getAttribute('data-patient-id');
        if (patientId) {
          router.navigate('prescriptions', { patientId, forceReload: true });
        }
      });
    });
  }
}
