import { type View, Router } from '../router';
import {
  fetchProfiles,
  fetchProfileById,
  fetchMedicalRecords,
  fetchPrescriptions,
  fetchPrescriptionItems,
  fetchMedicineInventory,
  fetchDoctorDetails,
  fetchAppointments,
  getPatientPhotoUrl
} from '../api';
import type { Profile } from '../types';
import { getIcon } from '../assets/icons';

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export class PatientProfileView implements View {
  public async render(params?: { patientId: string }): Promise<string> {
    let allProfiles: Profile[] = [];
    try {
      allProfiles = await fetchProfiles();
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
    }
    const patients = allProfiles.filter(p => p.role === 'patient');

    if (patients.length === 0) {
      return `
        <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #64748b; font-family: var(--font-sans); padding: 40px; box-sizing: border-box; height: 100%;">
          <h3 style="font-family: var(--font-heading); font-size: 24px; font-weight: 600; color: #0f172a; margin: 0;">no patients</h3>
        </div>
      `;
    }

    let patientId = params?.patientId || '550e8400-e29b-41d4-a716-446655440000';
    if (!patients.some(p => p.id === patientId)) {
      patientId = patients[0].id;
    }

    let patient: Profile;
    try {
      patient = await fetchProfileById(patientId);
    } catch (err) {
      return `
        <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #64748b; font-family: var(--font-sans); padding: 40px; box-sizing: border-box; height: 100%;">
          <h3 style="font-family: var(--font-heading); font-size: 24px; font-weight: 600; color: #0f172a; margin: 0;">Patient not found.</h3>
        </div>
      `;
    }

    const initials = getInitials(patient.full_name);

    // Fetch database tables asynchronously
    const allRecords = await fetchMedicalRecords();
    const allPrescriptions = await fetchPrescriptions();
    const allPrescriptionItems = await fetchPrescriptionItems();
    const allInventory = await fetchMedicineInventory();
    const allDoctorDetails = await fetchDoctorDetails();
    const allAppointments = await fetchAppointments();

    // Get medical records for this patient
    const records = allRecords.filter(r => r.patient_id === patientId);
    const conditions = records.filter(r => r.record_type === 'chronic_condition');
    const allergies = records.filter(r => r.record_type === 'allergy');
    const vitals = records.filter(r => r.record_type === 'vitals');
    const tests = records.filter(r => r.record_type === 'test_result');
    const surgeries = records.filter(r => r.record_type === 'surgical_history');
    const aiSummaries = records.filter(r => r.record_type === 'ai_summary');
    const latestAiSummary = aiSummaries.length > 0 ? aiSummaries[aiSummaries.length - 1] : null;

    const demoRec = records.find(r => r.record_type === 'demographics');
    let gender = 'Not Specified';
    if (demoRec) {
      try {
        const demo = JSON.parse(demoRec.description);
        gender = demo.gender || 'Not Specified';
      } catch (e) { }
    }

    let aiSummaryCardHTML = '';
    if (latestAiSummary) {
      aiSummaryCardHTML = `
      <!-- AI Clinical Summary Glass Card -->
      <section class="ai-summary-glass-card">
        <div class="ai-summary-header">
          <span class="ai-summary-icon">${getIcon('activity', 'nav-icon')}</span>
          <div class="ai-summary-title">
            <span>AI Clinical Summary</span>
            <span class="ai-summary-badge">M.A.S.H Automated</span>
          </div>
        </div>
        <div class="ai-summary-body">${latestAiSummary.description}</div>
      </section>
      `;
    }

    // Care team list generator
    const careTeamIds = new Set(records.map(r => r.doctor_id));
    if (careTeamIds.size === 0) careTeamIds.add('dr-smith'); // fallback
    const careTeamHTML = Array.from(careTeamIds).map(doctorId => {
      const doctor = allProfiles.find(p => p.id === doctorId);
      const details = allDoctorDetails.find(d => d.doctor_id === doctorId);
      if (!doctor) return '';
      return `
        <div class="care-team-badge active">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--surface-200); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 8px;">
            ${getInitials(doctor.full_name)}
          </div>
          <div class="care-team-text">
            <div class="care-team-name">${doctor.full_name}</div>
            <div class="care-team-role">${details?.specialty || 'Doctor'}</div>
          </div>
        </div>
      `;
    }).join('');

    const conditionsHTML = conditions
      .map(cond => `<li>${cond.description}</li>`)
      .join('');

    const allergiesHTML = allergies
      .map(allergy => {
        let parsed = { allergen: allergy.description, severity: 'Unknown severity' };
        try { parsed = JSON.parse(allergy.description); } catch(e) {}
        return `
          <li class="allergy-item">
            ${parsed.allergen} <span class="allergy-severity">(${parsed.severity})</span>
          </li>
        `;
      }).join('');

    // Active prescriptions
    const activePrescriptions = allPrescriptions.filter(p => p.patient_id === patientId && p.status === 'active');
    const activeItems = allPrescriptionItems.filter(i => activePrescriptions.some(p => p.id === i.prescription_id));

    const medicationsHTML = activeItems
      .map(item => {
        const med = allInventory.find(m => m.id === item.medicine_id);
        return `
          <div class="medication-item">
            <div class="medication-info">
              <span class="medication-name">${med?.medicine_name || 'Unknown'}</span>
              <span class="medication-dosage">${item.dosage}</span>
            </div>
            <div class="medication-check-circle">
              ${getIcon('check-circle', 'nav-icon')}
            </div>
          </div>
        `;
      }).join('');

    // Past tests rows
    const testsHTML = tests
      .map(test => {
        let parsed = { testName: test.description, result: 'Recorded' };
        try { parsed = JSON.parse(test.description); } catch(e) {}
        return `
        <tr>
          <td>${new Date(test.record_date).toLocaleDateString()}</td>
          <td><strong>${parsed.testName}</strong></td>
          <td><span class="test-result-pill normal">${parsed.result}</span></td>
          <td>
            <a href="#" class="view-test-link" data-test="${parsed.testName}">
              View ${getIcon('eye', 'test-action-icon')}
            </a>
          </td>
        </tr>
      `}).join('');

    // Surgical history timeline
    const surgicalHTML = surgeries
      .map(surg => {
        let parsed = { procedure: surg.description };
        try { parsed = JSON.parse(surg.description); } catch(e) {}
        return `
        <div class="timeline-item">
          <div class="timeline-marker-column">
            <div class="timeline-dot checked">
              ${getIcon('check-circle', 'nav-icon')}
            </div>
            <div class="timeline-connector"></div>
          </div>
          <div class="timeline-content-card">
            <div class="timeline-header">
              <span class="timeline-title">${parsed.procedure}</span>
              <span class="timeline-date">${new Date(surg.record_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      `}).join('');

    // Get latest vitals
    let latestVitals = null;
    if (vitals.length > 0) {
      try { latestVitals = JSON.parse(vitals[vitals.length - 1].description); } catch(e) {}
    }

    return `
      <!-- Top banner backdrop (Deep dark gradient containing patient portrait) -->
      <section class="profile-top-banner">
        
        <!-- Navigation bar inside banner -->
        <div class="profile-banner-nav">
          <button class="back-link-btn" id="back-to-patients-list">
            ${getIcon('chevron-left', 'nav-icon')}
            <span>Back to list</span>
          </button>
          
          <div class="profile-actions">
            <button class="btn-secondary" id="write-prescription-action" data-patient-id="${patient.id}">Write Prescription</button>
            <button class="btn-primary" id="book-appointment-action">
              ${getIcon('plus', 'nav-icon')}
              <span>New Appointment</span>
            </button>
          </div>
        </div>

        <!-- Care Team Badge row inside banner -->
        <div class="care-team-section">
          <span class="care-team-label">Care Team</span>
          <div class="care-team-list">
            ${careTeamHTML}
          </div>
        </div>

        <!-- Centered Glowing Patient Photo inside banner -->
        <div class="patient-hero-content">
          <div class="patient-glowing-aura"></div>
          <div class="patient-hero-avatar-large" style="background: #0ea5e9; display: flex; align-items: center; justify-content: center; color: white; font-size: 48px; font-weight: bold; border-radius: 50%; width: 120px; height: 120px; border: 4px solid white; position: relative; overflow: hidden;">
            <img src="${getPatientPhotoUrl(patient.full_name, gender)}" alt="${patient.full_name}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';" />
            <span>${initials}</span>
          </div>
        </div>

      </section>

      <!-- Floating Patient Demographics Glass Card -->
      <section class="patient-floating-card">
        <div class="floating-patient-info">
          <div class="floating-avatar-circle" style="background: #0ea5e9; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; position: relative; overflow: hidden;">
            <img src="${getPatientPhotoUrl(patient.full_name, gender)}" alt="${patient.full_name}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';" />
            <span>${initials}</span>
          </div>
          <div class="floating-details-block">
            <h2 class="floating-patient-name">${patient.full_name}</h2>
            <div class="floating-demographics">
              Patient
            </div>
            
            ${(() => {
        const patientAppointments = allAppointments.filter(a => a.patient_id === patientId);
        const latestAppt = patientAppointments
          .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime())[0];

        if (latestAppt) {
          const apptDate = new Date(latestAppt.scheduled_time);
          const formattedDate = apptDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC'
          });
          let hours = apptDate.getUTCHours();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          const minutes = apptDate.getUTCMinutes().toString().padStart(2, '0');
          const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
          const statusLabel = latestAppt.status.toUpperCase().replace('_', ' ');

          return `
                  <div class="floating-contacts-row" style="margin-bottom: 8px;">
                    <div class="floating-contact-item" style="background: rgba(59, 130, 246, 0.1); padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2); font-weight: 500;">
                      ${getIcon('calendar', 'floating-contact-icon')}
                      <span style="color: var(--primary-blue);">Appointment (${statusLabel}): <strong>${formattedDate} at ${formattedTime}</strong></span>
                    </div>
                  </div>
                `;
        }
        return '';
      })()}

            <div class="floating-contacts-row">
              <div class="floating-contact-item">
                ${getIcon('phone', 'floating-contact-icon')}
                <span>${patient.contact_number || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="floating-actions-right">
          <button class="btn-secondary-dark" id="view-history-btn">View History</button>
          <button class="btn-secondary-dark" id="write-prescription-floating" data-patient-id="${patient.id}">Write Prescription</button>
          <button class="btn-teal" id="book-appt-floating">Book Appointment</button>
        </div>
      </section>

      ${aiSummaryCardHTML}

      <!-- Profile Grid Details -->
      <div class="profile-content-layout">
        
        <!-- Left Column: Medical History & Medications -->
        <div class="profile-column">
          
          <!-- Medical History -->
          <div class="dashboard-card medical-history-card">
            <div class="section-title">
              ${getIcon('activity', 'nav-icon')}
              <span>Medical History</span>
            </div>
            
            <div class="history-subsection">
              <div class="history-subsection-label">Chronic Conditions</div>
              <ul class="history-list">
                ${conditionsHTML || '<li>No documented chronic conditions.</li>'}
              </ul>
            </div>

            <div class="history-subsection" style="margin-top: 24px;">
              <div class="history-subsection-label">Allergies</div>
              <ul class="history-list allergies">
                ${allergiesHTML || '<li>No known drug or environmental allergies.</li>'}
              </ul>
            </div>
          </div>

          <!-- Current Medications -->
          <div class="dashboard-card medications-card">
            <div class="section-title" style="display: flex; align-items: center; gap: 10px; font-family: var(--font-heading); font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">
              ${getIcon('pill', 'nav-icon')}
              <span>Current Medications</span>
            </div>
            <div class="medications-list">
              ${medicationsHTML || '<p style="font-size: 13px; color: #64748b;">No active medications.</p>'}
            </div>
          </div>

        </div>

        <!-- Right Column: Vitals, Tests & Timeline -->
        <div class="profile-column">
          
          <!-- Vital Signs -->
          <div class="dashboard-card vital-signs-section-card">
            <div class="section-title" style="display: flex; align-items: center; gap: 10px; font-family: var(--font-heading); font-size: 18px; font-weight: 600; color: #0f172a;">
              ${getIcon('activity', 'nav-icon')}
              <span>Vital Signs</span>
            </div>
            <div class="vital-signs-grid">
              <div class="vital-sign-card">
                <span class="vital-sign-label">Blood Pressure</span>
                <span class="vital-sign-value">${latestVitals?.bloodPressure || 'N/A'}</span>
                <span class="vital-sign-status">Normal</span>
              </div>
              <div class="vital-sign-card" style="background: linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(20, 184, 166, 0.05) 100%);">
                <span class="vital-sign-label">Heart Rate</span>
                <span class="vital-sign-value">${latestVitals?.heartRate || 'N/A'}</span>
                <span class="vital-sign-status resting">Resting</span>
              </div>
              <div class="vital-sign-card" style="background: linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(30, 58, 138, 0.05) 100%);">
                <span class="vital-sign-label">Weight</span>
                <span class="vital-sign-value">${latestVitals?.weight || 'N/A'}</span>
                <span class="vital-sign-status stable">Stable</span>
              </div>
            </div>
          </div>

          <!-- Past Tests -->
          <div class="dashboard-card past-tests-card">
            <div class="card-header" style="padding: 0 0 16px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
              <div class="section-title" style="display: flex; align-items: center; gap: 10px; font-family: var(--font-heading); font-size: 18px; font-weight: 600; color: #0f172a; margin: 0;">
                ${getIcon('flask', 'nav-icon')}
                <span>Past Tests</span>
              </div>
              <a href="#" class="card-header-link" id="view-all-tests-btn">View All</a>
            </div>
            <table class="tests-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Test Name</th>
                  <th>Result</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${testsHTML || '<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 12px 0;">No test reports recorded.</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Surgical History -->
          <div class="dashboard-card surgical-history-card">
            <div class="section-title" style="display: flex; align-items: center; gap: 10px; font-family: var(--font-heading); font-size: 18px; font-weight: 600; color: #0f172a;">
              ${getIcon('activity', 'nav-icon')}
              <span>Surgical History</span>
            </div>
            
            <div class="timeline-container">
              ${surgicalHTML || '<p style="font-size: 13px; color: #64748b;">No surgical history documented.</p>'}
            </div>
          </div>

        </div>

      </div>
    `;
  }

  public onMount(container: HTMLElement, router: Router): void {
    const backBtn = container.querySelector('#back-to-patients-list');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        router.navigate('patients');
      });
    }

    const buttons = [
      '#book-appointment-action',
      '#view-history-btn',
      '#book-appt-floating',
      '#view-all-tests-btn'
    ];

    buttons.forEach(selector => {
      const btn = container.querySelector(selector);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const actionText = btn.textContent?.trim() || 'action';
          alert(`Triggering "${actionText}" operation...`);
        });
      }
    });

    const writeRxBtn = container.querySelector('#write-prescription-action') as HTMLElement;
    if (writeRxBtn) {
      writeRxBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const pId = writeRxBtn.getAttribute('data-patient-id');
        router.navigate('prescriptions', { patientId: pId });
      });
    }

    const writeRxFloatingBtn = container.querySelector('#write-prescription-floating') as HTMLElement;
    if (writeRxFloatingBtn) {
      writeRxFloatingBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const pId = writeRxFloatingBtn.getAttribute('data-patient-id');
        router.navigate('prescriptions', { patientId: pId });
      });
    }

    const testLinks = container.querySelectorAll('.view-test-link');
    testLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const testName = link.getAttribute('data-test');
        alert(`Opening diagnostic panel for: ${testName}`);
      });
    });
  }
}
