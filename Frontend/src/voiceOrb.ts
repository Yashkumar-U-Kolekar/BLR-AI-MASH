import { Router } from './router';
import { fetchProfiles, askDoctorAssistant, askPharmacistAssistant } from './api';
import type { Profile } from './types';

declare global {
  interface Window {
    __voiceOrbInstance?: VoiceOrb;
  }
}

export class VoiceOrb {
  private container: HTMLElement | null = null;
  private transcriptBubble: HTMLElement | null = null;
  private confirmBubble: HTMLElement | null = null;
  private orb: HTMLElement | null = null;
  private suggestionChips: HTMLElement | null = null;
  private textBubble: HTMLElement | null = null;
  private textInput: HTMLInputElement | null = null;
  private textSubmit: HTMLElement | null = null;

  private router: Router;
  private recognition: any = null;
  private isListening = false;
  private isProcessing = false;
  private currentRoute = 'dashboard';
  private profilesCache: Profile[] = [];
  private ttsEnabled = true;
  private chatHistory: { role: 'user' | 'model'; text: string }[] = [];
  private destroyed = false;

  // WebGL Shader variables
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private targetHover = 0;
  private currentHover = 0;
  private currentRot = 0;
  private lastTime = 0;
  private targetHue = 0;
  private currentHue = 0;
  private timeScale = 1.0;
  private uniforms: any = {};
  private silenceTimeoutId: any = null;

  constructor(router: Router) {
    // Fix 1 — Singleton guard at module level
    if (window.__voiceOrbInstance) {
      try {
        window.__voiceOrbInstance.destroy();
      } catch (e) {
        console.error('Error destroying previous VoiceOrb instance:', e);
      }
    }
    window.__voiceOrbInstance = this;

    this.router = router;
    this.currentRoute = router.currentRoute;

    // Fix 3 — Bind all event handlers in constructor
    this.handleRouteChange = this.handleRouteChange.bind(this);
    this.handleOrbClick = this.handleOrbClick.bind(this);
    this.handleOrbKeyDown = this.handleOrbKeyDown.bind(this);
    this.handleOrbMouseEnter = this.handleOrbMouseEnter.bind(this);
    this.handleOrbMouseLeave = this.handleOrbMouseLeave.bind(this);
    this.handleTextSubmitClick = this.handleTextSubmitClick.bind(this);
    this.handleTextInputKeyDown = this.handleTextInputKeyDown.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleContainerClick = this.handleContainerClick.bind(this);
    this.handleGlobalKeyDown = this.handleGlobalKeyDown.bind(this);

    this.initElements();
    if (!this.container) return;

    this.initSpeechRecognition();
    this.bindEvents();
    this.loadProfiles();
    this.initWebGL();

    // Listen to route changes
    window.addEventListener('page-route-changed', this.handleRouteChange);

    // Initial suggestion chips render
    this.updateSuggestionChips(this.currentRoute);
    const shouldHide = this.currentRoute === 'telemetry' || this.currentRoute === 'auth';
    if (this.container && shouldHide) {
      this.container.style.display = 'none';
    }
  }

  // Fix 2 — Add a destroy() method
  public destroy() {
    this.destroyed = true;
    this.isListening = false;
    this.isProcessing = false;
    this.clearSilenceTimeout();
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) { }
      this.recognition = null;
    }

    window.removeEventListener('page-route-changed', this.handleRouteChange);
    window.removeEventListener('keydown', this.handleGlobalKeyDown);
    document.removeEventListener('click', this.handleDocumentClick);

    if (this.orb) {
      this.orb.removeEventListener('click', this.handleOrbClick);
      this.orb.removeEventListener('keydown', this.handleOrbKeyDown);
      this.orb.removeEventListener('mouseenter', this.handleOrbMouseEnter);
      this.orb.removeEventListener('mouseleave', this.handleOrbMouseLeave);
    }

    if (this.textSubmit) {
      this.textSubmit.removeEventListener('click', this.handleTextSubmitClick);
    }
    if (this.textInput) {
      this.textInput.removeEventListener('keydown', this.handleTextInputKeyDown);
    }

    if (this.container) {
      this.container.removeEventListener('click', this.handleContainerClick);
    }
  }

  private handleRouteChange(e: any) {
    this.currentRoute = e.detail.route;
    this.loadProfiles();
    this.hideBubbles();
    this.updateSuggestionChips(this.currentRoute);
    
    const shouldHide = this.currentRoute === 'telemetry' || this.currentRoute === 'auth';
    if (this.container) {
      this.container.style.display = shouldHide ? 'none' : '';
    }

    if (shouldHide) {
      // Stop any active or background listening when transitioning to a hidden route
      this.isListening = false;
      this.clearSilenceTimeout();
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (e) { }
        this.recognition = null;
      }
    } else {
      // Restart background listening if transitioning back to a visible route
      if (!this.isListening && !this.isProcessing) {
        this.startBackgroundListening();
      }
    }
  }

  private handleOrbClick(e: MouseEvent) {
    e.stopPropagation();
    if (this.isListening) {
      this.stopActiveListening();
    } else {
      this.startActiveListening();
    }
  }

  private handleOrbKeyDown(e: KeyboardEvent) {
    if (e.repeat) return; // Prevent autorepeat toggling
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (this.isListening) {
        this.stopActiveListening();
      } else {
        this.startActiveListening();
      }
    }
  }

  private handleOrbMouseEnter() {
    this.targetHover = 1.0;
  }

  private handleOrbMouseLeave() {
    this.targetHover = 0.0;
  }

  private handleTextSubmitClick() {
    const cmd = this.textInput?.value.trim();
    if (cmd) {
      this.hideTextBubble();
      this.processCommand(cmd);
    }
  }

  private handleTextInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const cmd = this.textInput?.value.trim();
      if (cmd) {
        this.hideTextBubble();
        this.processCommand(cmd);
      }
    }
  }

  private handleDocumentClick() {
    if (!this.isListening && !this.isProcessing) {
      this.hideTextBubble();
    }
  }

  private handleContainerClick(e: MouseEvent) {
    e.stopPropagation();
  }

  private handleGlobalKeyDown(e: KeyboardEvent) {
    if (e.repeat) return; // Prevent autorepeat toggling
    if (e.code === 'Space') {
      // Ignore if user is typing in an input, textarea, or contenteditable element
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.hasAttribute('contenteditable')
      )) {
        return;
      }

      e.preventDefault();
      if (this.isListening) {
        this.stopActiveListening();
      } else {
        this.startActiveListening();
      }
    }
  }

  private initElements() {
    this.container = document.getElementById('mash-voice-agent');
    if (!this.container) return;

    this.transcriptBubble = this.container.querySelector('.transcript-bubble');
    this.confirmBubble = this.container.querySelector('.confirm-bubble');
    this.orb = this.container.querySelector('.mash-voice-orb');
    this.suggestionChips = document.getElementById('mash-suggestion-chips');
    this.textBubble = document.getElementById('mash-text-bubble');
    this.textInput = document.getElementById('mash-text-input') as HTMLInputElement;
    this.textSubmit = document.getElementById('mash-text-submit');
  }

  private async loadProfiles() {
    try {
      this.profilesCache = await fetchProfiles();
    } catch (e) {
      console.warn('Failed to fetch profiles in VoiceOrb:', e);
    }
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser. Falling back to text command input.');
      return;
    }
  }

  private resetSilenceTimeout() {
    this.clearSilenceTimeout();
    this.silenceTimeoutId = setTimeout(() => {
      if (this.isListening && !this.isProcessing) {
        this.stopActiveListening();
      }
    }, 6000); // 6 seconds timeout
  }

  private clearSilenceTimeout() {
    if (this.silenceTimeoutId) {
      clearTimeout(this.silenceTimeoutId);
      this.silenceTimeoutId = null;
    }
  }

  private startBackgroundListening() {
    // Disabled wake-word background listening completely as per user request
    return;
  }

  // Fix 5 — startActiveListening is now async
  private async startActiveListening() {
    console.log('startActiveListening called, currently: isListening =', this.isListening, 'isProcessing =', this.isProcessing);
    if (this.isListening || this.isProcessing) return;
    if (this.currentRoute === 'telemetry' || this.currentRoute === 'auth') return;

    this.isListening = true;
    this.setState('listening');
    this.updateTranscript('...');
    this.hideTextBubble();
    this.resetSilenceTimeout();

    // 1. Temporarily stop background listening (turn off wake word detection)
    if (this.recognition) {
      try {
        // Fix 4 — Replace stop() with abort() in startActiveListening
        this.recognition.abort();
      } catch (e) { }
      this.recognition = null;
    }

    // 2. Start a fresh active recognition instance with continuous = false
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false; // Stop automatically when the user pauses speaking
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          console.log('Active speech recognition started');
        };

        this.recognition.onresult = (event: any) => {
          this.resetSilenceTimeout();
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const textToShow = interimTranscript || finalTranscript;
          console.log('Active transcript:', textToShow);
          this.updateTranscript(textToShow);

          if (finalTranscript) {
            this.clearSilenceTimeout(); // Stop timeout during processing
            this.processCommand(finalTranscript);
          }
        };

        this.recognition.onerror = (event: any) => {
          if (event.error === 'no-speech') {
            console.log('Active recognition ended with no speech');
            this.stopActiveListening();
            return;
          }
          if (event.error === 'aborted') {
            console.log('Active speech recognition aborted:', event.error);
            if (this.isListening) {
              // Reset state without calling recognition.stop() again, since it's already aborted
              console.log('Abnormal abort detected, resetting state to idle');
              this.isListening = false;
              this.setState('idle');
              this.hideTextBubble();
              this.clearSilenceTimeout();
              this.recognition = null;
              this.startBackgroundListening();
            }
            return;
          }
          console.error('Active speech recognition error:', event.error);
          this.stopActiveListening();
        };

        this.recognition.onend = () => {
          console.log('Active speech recognition ended');
          // If we stopped active listening but are not processing, restart background listening
          if (!this.isListening && !this.isProcessing) {
            this.startBackgroundListening();
          }
        };

        // Fix 5 — Add 150ms delay before recognition.start()
        await new Promise(resolve => setTimeout(resolve, 150));

        this.recognition.start();
      } catch (e) {
        console.error('Failed to start active speech recognition:', e);
        this.showTextBubble();
      }
    } else {
      this.showTextBubble();
    }
  }

  private stopActiveListening() {
    console.log('stopActiveListening called, currently: isListening =', this.isListening);
    this.isListening = false;
    this.setState('idle');
    this.hideTextBubble();
    this.clearSilenceTimeout();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) { }
      this.recognition = null;
    }

    this.startBackgroundListening();
  }

  private setState(state: 'idle' | 'listening' | 'processing' | 'confirmed') {
    if (!this.container) return;
    this.container.className = `mash-voice-agent-container state-${state}`;
  }

  private updateTranscript(text: string) {
    if (!this.transcriptBubble) return;
    const spokenTextEl = this.transcriptBubble.querySelector('.spoken-text');
    if (spokenTextEl) {
      spokenTextEl.textContent = text ? `"${text}"` : '';
    }
  }

  private async showConfirmation(text: string) {
    if (!this.confirmBubble) return;
    const confirmTextEl = this.confirmBubble.querySelector('.confirmed-text');
    if (confirmTextEl) {
      confirmTextEl.textContent = text;
    }

    // Trigger speaking TTS
    await this.speak(text);
  }

  private async speak(text: string) {
    if (!this.ttsEnabled) return;
    try {
      const { synthesizeSpeech } = await import('./api');
      const arrayBuffer = await synthesizeSpeech(text);

      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });

      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
      await new Promise(resolve => setTimeout(resolve, Math.max(2000, text.length * 60)));
    }
  }

  private showTextBubble() {
    if (this.textBubble) {
      this.textBubble.classList.add('visible');
      if (this.textInput) {
        this.textInput.value = '';
        this.textInput.focus();
      }
    }
  }

  private hideTextBubble() {
    if (this.textBubble) {
      this.textBubble.classList.remove('visible');
    }
  }

  private hideBubbles() {
    this.hideTextBubble();
    this.updateTranscript('');
  }

  private updateSuggestionChips(route: string) {
    if (!this.suggestionChips) return;

    let chips: string[] = [];
    if (route === 'dashboard') {
      chips = ['New Appointment', 'Go to Prescriptions', 'Go to Patients'];
    } else if (route === 'patients') {
      chips = ['Search Ayush', 'Go to Dashboard', 'New Appointment'];
    } else if (route === 'prescriptions') {
      chips = ['Send to Pharmacy', 'Go to Dashboard', 'Go to Patients'];
    } else if (route === 'patient-profile') {
      chips = ['Book Appointment', 'Go to Dashboard', 'Go to Prescriptions'];
    } else if (route === 'pharmacy') {
      chips = ['Check Inventory', 'Pending Orders', 'Switch to Doctor Portal'];
    } else {
      chips = ['Go to Dashboard', 'Go to Patients', 'Go to Prescriptions'];
    }

    this.suggestionChips.innerHTML = chips.map(chip => {
      let cmd = chip.toLowerCase();
      if (chip === 'Book Appointment' || chip === 'New Appointment') cmd = 'new appointment';
      if (chip === 'Check Inventory') cmd = 'what medicines are low on stock';
      if (chip === 'Pending Orders') cmd = 'show pending prescriptions';
      if (chip === 'Switch to Doctor Portal') cmd = 'switch to doctor portal';
      return `<button class="mash-chip" data-cmd="${cmd}">${chip}</button>`;
    }).join('');

    // Rebind events for the new chips
    const chipBtns = this.suggestionChips.querySelectorAll('.mash-chip');
    chipBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cmd = btn.getAttribute('data-cmd');
        if (cmd) {
          this.processCommand(cmd);
        }
      });
    });
  }

  private bindEvents() {
    if (this.orb) {
      this.orb.addEventListener('click', this.handleOrbClick);
      this.orb.addEventListener('keydown', this.handleOrbKeyDown);
    }

    if (this.textSubmit) {
      this.textSubmit.addEventListener('click', this.handleTextSubmitClick);
    }
    if (this.textInput) {
      this.textInput.addEventListener('keydown', this.handleTextInputKeyDown);
    }

    document.addEventListener('click', this.handleDocumentClick);

    if (this.container) {
      this.container.addEventListener('click', this.handleContainerClick);
    }

    window.addEventListener('keydown', this.handleGlobalKeyDown);
  }

  private async processCommand(command: string) {
    const cleanCmd = command.trim().toLowerCase();
    console.log('Processing command:', cleanCmd);

    this.isListening = false;
    this.isProcessing = true;
    this.setState('processing');
    this.updateTranscript(command);

    // Add a tiny artificial delay to show processing state and feel realistic
    await new Promise(resolve => setTimeout(resolve, 800));

    let actionExecuted = false;
    let confirmMessage = "";
    let action: any = null;

    // 1. First, send the voice command to the correct Python Agent based on current route
    try {
      const askAgent = this.currentRoute === 'pharmacy' ? askPharmacistAssistant : askDoctorAssistant;
      const response = await askAgent(command, this.chatHistory);
      confirmMessage = response.reply;
      action = response.action;

      if (action) {
        if (action.type === 'navigate' && action.route) {
          if (action.route === 'patient-profile' && action.patientId) {
            this.router.navigate('patient-profile', { patientId: action.patientId });
            actionExecuted = true;
          } else if (action.route === 'new-appointment') {
            const openBtn = document.getElementById('open-appointment-btn') || document.getElementById('book-appointment-action') || document.getElementById('book-appt-floating');
            if (openBtn) {
              this.flashElement(openBtn as HTMLElement);
              openBtn.click();
              actionExecuted = true;
            } else {
              // fallback: navigate to dashboard first, then click
              await this.router.navigate('dashboard');
              await new Promise(r => setTimeout(r, 600));
              const dashboardBtn = document.getElementById('open-appointment-btn');
              if (dashboardBtn) {
                this.flashElement(dashboardBtn);
                dashboardBtn.click();
              }
              actionExecuted = true;
            }
          } else {
            const params: any = {};
            if (action.patientId) params.patientId = action.patientId;
            this.router.navigate(action.route, params);
            actionExecuted = true;
          }
        } else if (action.type === 'resolve_shortage' && action.patientId) {
          let btnToClick = document.querySelector(`.btn-resolve-alert[data-patient-id="${action.patientId}"]`) as HTMLElement;
          if (!btnToClick && this.currentRoute !== 'dashboard') {
            // If we are not on dashboard, navigate to dashboard first
            await this.router.navigate('dashboard');
            await new Promise(r => setTimeout(r, 600));
            btnToClick = document.querySelector(`.btn-resolve-alert[data-patient-id="${action.patientId}"]`) as HTMLElement;
          }
          if (!btnToClick) {
            btnToClick = document.querySelector('.btn-resolve-alert') as HTMLElement; // fallback to first resolve button
          }
          if (btnToClick) {
            this.flashElement(btnToClick);
            btnToClick.click();
            actionExecuted = true;
          }
        } else if (action.type === 'refresh_pharmacy') {
          // Pharmacist agent requested a UI refresh after an action (fulfill, restock, etc.)
          setTimeout(() => {
            this.router.navigate('pharmacy');
          }, 800);
          actionExecuted = true;
        }
      }

      this.chatHistory.push({ role: 'user', text: command });
      this.chatHistory.push({ role: 'model', text: confirmMessage });
      if (this.chatHistory.length > 30) {
        this.chatHistory = this.chatHistory.slice(-30);
      }

      // If the agent successfully returned a reply, count it as handled
      if (confirmMessage) {
        actionExecuted = true;

        // Auto-refresh the current view if we mutated appointments or prescriptions
        const lowerMsg = confirmMessage.toLowerCase();
        if (lowerMsg.includes('booked') || lowerMsg.includes('scheduled') || lowerMsg.includes('rescheduled') || lowerMsg.includes('prescription')) {
          setTimeout(() => {
            this.router.navigate(this.currentRoute);
          }, 800);
        }
      }
    } catch (err) {
      console.error('Agent query failed or was unreachable:', err);
      // We will fall back to local routing logic below
      confirmMessage = "";
    }

    // 2. LOCAL FALLBACK: If agent is offline, fails, or didn't execute an action, fall back to local parsing/routing
    if (!actionExecuted) {
      confirmMessage = "I couldn't match that command. Try 'go to prescriptions' or 'new appointment'.";

      // 2.1 ROUTING COMMANDS
      if (cleanCmd.includes('dashboard') || cleanCmd.includes('home') || cleanCmd.includes('main page')) {
        confirmMessage = 'Navigating to Dashboard';
        this.router.navigate('dashboard');
        actionExecuted = true;
      } else if (cleanCmd.includes('prescription') || cleanCmd.includes('medication')) {
        const patientName = this.extractPatientName(cleanCmd);
        if (patientName) {
          const patient = this.findCachedPatientByName(patientName);
          if (patient) {
            confirmMessage = `Opening prescription writer for ${patient.full_name}`;
            this.router.navigate('prescriptions', { patientId: patient.id });
            actionExecuted = true;
          } else {
            confirmMessage = `I couldn't find a patient named ${patientName}`;
          }
        } else {
          confirmMessage = 'Navigating to Prescription Writer';
          this.router.navigate('prescriptions');
          actionExecuted = true;
        }
      } else if (cleanCmd.includes('schedule') || cleanCmd.includes('calendar') || cleanCmd.includes('appointments')) {
        confirmMessage = 'Navigating to Schedule';
        this.router.navigate('schedule');
        actionExecuted = true;
      } else if (cleanCmd.includes('patients list') || cleanCmd.includes('patients directory') || (cleanCmd.includes('patients') && !cleanCmd.includes('profile'))) {
        confirmMessage = 'Navigating to Patients Directory';
        this.router.navigate('patients');
        actionExecuted = true;
      } else if (cleanCmd.includes('pharmacy') || cleanCmd.includes('stock')) {
        confirmMessage = 'Navigating to Pharmacy Portal';
        this.router.navigate('pharmacy');
        actionExecuted = true;
      } else if (cleanCmd.includes('patient') && (cleanCmd.includes('profile') || cleanCmd.includes('go to') || cleanCmd.includes('open') || cleanCmd.includes('show'))) {
        // Find patient profile by name
        const patientName = this.extractPatientName(cleanCmd);
        if (patientName) {
          const patient = this.findCachedPatientByName(patientName);
          if (patient) {
            confirmMessage = `Opening profile for ${patient.full_name}`;
            this.router.navigate('patient-profile', { patientId: patient.id });
            actionExecuted = true;
          } else {
            confirmMessage = `I couldn't find a patient named ${patientName}`;
          }
        } else {
          confirmMessage = 'Please specify a patient name, for example: open patient Ayush.';
        }
      }
      // 2.2 DASHBOARD SHORTAGE ALERT RESOLUTION
      else if (this.currentRoute === 'dashboard' && (cleanCmd.includes('provide alternative') || cleanCmd.includes('resolve shortage') || cleanCmd.includes('alternative for'))) {
        const patientName = this.extractPatientName(cleanCmd);
        let btnToClick: HTMLElement | null = null;

        if (patientName) {
          const patient = this.findCachedPatientByName(patientName);
          if (patient) {
            btnToClick = document.querySelector(`.btn-resolve-alert[data-patient-id="${patient.id}"]`);
          }
        } else {
          // Click the first shortage alert resolve button
          btnToClick = document.querySelector('.btn-resolve-alert');
        }

        if (btnToClick) {
          confirmMessage = 'Resolving shortage alert...';
          this.flashElement(btnToClick);
          btnToClick.click();
          actionExecuted = true;
        } else {
          confirmMessage = 'No matching shortage alert found on the dashboard.';
        }
      }
      // 2.3 SEARCH ON CORRESPONDING PAGES
      else if (cleanCmd.includes('search') || cleanCmd.includes('find')) {
        const searchTerm = cleanCmd.replace('search for', '').replace('search', '').replace('find', '').trim();
        if (searchTerm) {
          // Check if on Patients list page
          if (this.currentRoute === 'patients') {
            const searchInput = document.getElementById('patient-search-input') as HTMLInputElement;
            if (searchInput) {
              confirmMessage = `Searching patients for '${searchTerm}'`;
              searchInput.value = searchTerm;
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
              this.flashElement(searchInput);
              actionExecuted = true;
            }
          }
          // Check if on Pharmacy page
          else if (this.currentRoute === 'pharmacy') {
            const searchInput = document.getElementById('pharmacy-search-input') as HTMLInputElement;
            if (searchInput) {
              confirmMessage = `Searching medicine inventory for '${searchTerm}'`;
              searchInput.value = searchTerm;
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
              this.flashElement(searchInput);
              actionExecuted = true;
            }
          }
        }
      }

      // 2.4 PAGE DYNAMIC CONTEXT CLICK
      if (!actionExecuted) {
        const targetEl = this.scanInteractiveElements(cleanCmd);
        if (targetEl) {
          const text = targetEl.innerText || targetEl.getAttribute('aria-label') || targetEl.id || 'button';
          confirmMessage = `Clicking '${text.trim().substring(0, 20)}'`;
          this.flashElement(targetEl);
          targetEl.click();
          actionExecuted = true;
        }
      }

      // 2.5 ACTION SPECIFIC FALLBACKS
      if (!actionExecuted && (cleanCmd.includes('new appointment') || cleanCmd.includes('create appointment') || cleanCmd.includes('book appointment'))) {
        const openBtn = document.getElementById('open-appointment-btn') || document.getElementById('book-appointment-action') || document.getElementById('book-appt-floating');
        if (openBtn) {
          confirmMessage = 'Opening appointment scheduler';
          this.flashElement(openBtn as HTMLElement);
          openBtn.click();
          actionExecuted = true;
        } else {
          confirmMessage = 'Navigating to Dashboard to open appointment scheduler';
          await this.router.navigate('dashboard');
          await new Promise(r => setTimeout(r, 600)); // Wait for render
          const dashboardBtn = document.getElementById('open-appointment-btn');
          if (dashboardBtn) {
            this.flashElement(dashboardBtn);
            dashboardBtn.click();
          }
          actionExecuted = true;
        }
      }

      // 2.6 If still not handled, try direct chat assistant fallback
      if (!actionExecuted && confirmMessage.startsWith("I couldn't match")) {
        try {
          const askAgent = this.currentRoute === 'pharmacy' ? askPharmacistAssistant : askDoctorAssistant;
          const response = await askAgent(command, this.chatHistory);
          confirmMessage = response.reply;
          this.chatHistory.push({ role: 'user', text: command });
          this.chatHistory.push({ role: 'model', text: confirmMessage });
          if (this.chatHistory.length > 30) {
            this.chatHistory = this.chatHistory.slice(-30);
          }
        } catch (err) {
          console.error('Assistant chatbot query failed:', err);
          confirmMessage = this.currentRoute === 'pharmacy'
            ? "I'm having trouble connecting to the pharmacy assistant. Try checking inventory or orders."
            : "I'm having trouble connecting to the clinical assistant. Try checking inventory or appointments.";
        }
      }
    }

    // Set state to confirmed and show bubble
    this.isProcessing = false;
    this.setState('confirmed');
    await this.showConfirmation(confirmMessage);

    if (!this.isListening && !this.isProcessing) {
      this.setState('idle');
      this.stopActiveListening();
    }
  }

  private extractPatientName(cmd: string): string | null {
    // Strip known command prefixes/suffixes to isolate the patient name
    const prefixes = [
      /^(?:go\s+to\s+)?(?:patient\s+)?(?:profile\s+(?:of|for)\s+)?/i,
      /^(?:open|show|view|navigate\s+to)\s+(?:patient\s+)?(?:profile\s+(?:of|for)\s+)?/i,
      /^(?:provide\s+alternative\s+for|resolve\s+shortage\s+for)\s+/i,
      /^(?:write|create|send)\s+(?:a\s+)?prescription\s+(?:to|for)\s+(?:my\s+)?(?:patient\s+)?/i,
      /^prescribe\s+(?:.+?)\s+(?:to|for)\s+(?:my\s+)?(?:patient\s+)?/i,
      /^prescription\s+(?:to|for)\s+(?:my\s+)?(?:patient\s+)?/i,
    ];
    const suffixes = [
      /(?:'s)?\s*profile$/i,
      /(?:'s)?\s*page$/i,
      /(?:'s)?\s*record$/i,
    ];

    let clean = cmd.trim();
    for (const prefix of prefixes) {
      const stripped = clean.replace(prefix, '');
      if (stripped !== clean && stripped.length > 0) {
        clean = stripped;
        break;
      }
    }
    for (const suffix of suffixes) {
      clean = clean.replace(suffix, '');
    }
    clean = clean.trim();
    return clean.length > 1 ? clean : null;
  }

  private findCachedPatientByName(name: string): Profile | null {
    const search = name.toLowerCase().trim();
    if (!search) return null;

    // Tier 1: Exact full name match
    const exact = this.profilesCache.find(p => p.full_name.toLowerCase() === search);
    if (exact) return exact;

    // Tier 2: Score-based matching — pick the best candidate
    const searchWords = search.split(/\s+/).filter(w => w.length > 1);
    let bestMatch: Profile | null = null;
    let bestScore = 0;

    for (const p of this.profilesCache) {
      const fullName = p.full_name.toLowerCase();
      const nameWords = fullName.split(/\s+/);
      let score = 0;

      // Full name contains search string
      if (fullName.includes(search)) score += 10;

      // Each search word that matches a name word (exact word match)
      for (const sw of searchWords) {
        if (nameWords.some(nw => nw === sw)) score += 5;
        else if (nameWords.some(nw => nw.startsWith(sw))) score += 3;
        else if (fullName.includes(sw)) score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = p;
      }
    }

    // Require a minimum score to avoid false positives
    return bestScore >= 3 ? bestMatch : null;
  }

  private scanInteractiveElements(cmd: string): HTMLElement | null {
    // Select all potentially interactive elements on page
    const elements = Array.from(document.querySelectorAll<HTMLElement>(
      'button, a, input[type="button"], input[type="submit"], [role="button"], .nav-item, .patient-row-btn, tr.patient-row-btn'
    ));

    let bestMatch: HTMLElement | null = null;
    let bestScore = 0;

    for (const el of elements) {
      // Get text content
      const text = (el.innerText || el.getAttribute('aria-label') || el.id || '').toLowerCase().trim();
      if (!text) continue;

      // Check for exact matching or high substring inclusion
      if (text === cmd) {
        return el;
      }

      // Fuzzy matching score based on word matching
      let score = 0;
      const cmdWords = cmd.split(/\s+/);

      for (const cw of cmdWords) {
        if (cw.length > 2 && text.includes(cw)) {
          score += 1;
        }
      }

      // Special tags match
      if (cmd.includes('new') && text.includes('new') && text.includes('appointment')) score += 5;
      if (cmd.includes('send') && text.includes('send') && text.includes('pharmacy')) score += 5;
      if (cmd.includes('submit') && text.includes('send') && text.includes('pharmacy')) score += 5;
      if (cmd.includes('resolve') && text.includes('alternative')) score += 5;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = el;
      }
    }

    return bestScore >= 1 ? bestMatch : null;
  }

  private flashElement(el: HTMLElement) {
    el.classList.add('voice-target-highlight');
    setTimeout(() => {
      el.classList.remove('voice-target-highlight');
    }, 2000);
  }

  private initWebGL() {
    this.canvas = document.getElementById('mash-orb-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;

    const gl = (this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      console.warn('WebGL is not supported in this browser.');
      return;
    }
    this.gl = gl;

    const vs = `
      precision highp float;
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      uniform float iTime;
      uniform vec3 iResolution;
      uniform float hue;
      uniform float hover;
      uniform float rot;
      uniform float hoverIntensity;
      uniform vec3 backgroundColor;
      varying vec2 vUv;

      vec3 rgb2yiq(vec3 c) {
        float y = dot(c, vec3(0.299, 0.587, 0.114));
        float i = dot(c, vec3(0.596, -0.274, -0.322));
        float q = dot(c, vec3(0.211, -0.523, 0.312));
        return vec3(y, i, q);
      }
      
      vec3 yiq2rgb(vec3 c) {
        float r = c.x + 0.956 * c.y + 0.621 * c.z;
        float g = c.x - 0.272 * c.y - 0.647 * c.z;
        float b = c.x - 1.106 * c.y + 1.703 * c.z;
        return vec3(r, g, b);
      }
      
      vec3 adjustHue(vec3 color, float hueDeg) {
        float hueRad = hueDeg * 3.14159265 / 180.0;
        vec3 yiq = rgb2yiq(color);
        float cosA = cos(hueRad);
        float sinA = sin(hueRad);
        float i = yiq.y * cosA - yiq.z * sinA;
        float q = yiq.y * sinA + yiq.z * cosA;
        yiq.y = i;
        yiq.z = q;
        return yiq2rgb(yiq);
      }
      
      vec3 hash33(vec3 p3) {
        p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
        p3 += dot(p3, p3.yxz + 19.19);
        return -1.0 + 2.0 * fract(vec3(
          p3.x + p3.y,
          p3.x + p3.z,
          p3.y + p3.z
        ) * p3.zyx);
      }
      
      float snoise3(vec3 p) {
        const float K1 = 0.333333333;
        const float K2 = 0.166666667;
        vec3 i = floor(p + (p.x + p.y + p.z) * K1);
        vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
        vec3 e = step(vec3(0.0), d0 - d0.yzx);
        vec3 i1 = e * (1.0 - e.zxy);
        vec3 i2 = 1.0 - e.zxy * (1.0 - e);
        vec3 d1 = d0 - (i1 - K2);
        vec3 d2 = d0 - (i2 - K1);
        vec3 d3 = d0 - 0.5;
        vec4 h = max(0.6 - vec4(
          dot(d0, d0),
          dot(d1, d1),
          dot(d2, d2),
          dot(d3, d3)
        ), 0.0);
        vec4 n = h * h * h * h * vec4(
          dot(d0, hash33(i)),
          dot(d1, hash33(i + i1)),
          dot(d2, hash33(i + i2)),
          dot(d3, hash33(i + 1.0))
        );
        return dot(vec4(31.316), n);
      }
      
      vec4 extractAlpha(vec3 colorIn) {
        float a = max(max(colorIn.r, colorIn.g), colorIn.b);
        return vec4(colorIn.rgb / (a + 1e-5), a);
      }
      
      // Base colors (blue fade)
      const vec3 baseColor1 = vec3(0.0, 0.45, 1.0);
      const vec3 baseColor2 = vec3(0.0, 0.85, 0.95);
      const vec3 baseColor3 = vec3(0.02, 0.04, 0.2);
      const float innerRadius = 0.6;
      const float noiseScale = 0.65;
      
      float light1(float intensity, float attenuation, float dist) {
        return intensity / (1.0 + dist * attenuation);
      }
      
      float light2(float intensity, float attenuation, float dist) {
        return intensity / (1.0 + dist * dist * attenuation);
      }
      
      vec4 draw(vec2 uv) {
        vec3 color1 = adjustHue(baseColor1, hue);
        vec3 color2 = adjustHue(baseColor2, hue);
        vec3 color3 = adjustHue(baseColor3, hue);
        
        float ang = atan(uv.y, uv.x);
        float len = length(uv);
        float invLen = len > 0.0 ? 1.0 / len : 0.0;
        
        float bgLuminance = dot(backgroundColor, vec3(0.299, 0.587, 0.114));
        
        float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
        float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
        float d0 = distance(uv, (r0 * invLen) * uv);
        float v0 = light1(1.0, 10.0, d0);

        v0 *= smoothstep(r0 * 1.05, r0, len);
        float innerFade = smoothstep(r0 * 0.8, r0 * 0.95, len);
        v0 *= mix(innerFade, 1.0, bgLuminance * 0.7);
        float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;
        
        float a = iTime * -1.0;
        vec2 pos = vec2(cos(a), sin(a)) * r0;
        float d = distance(uv, pos);
        float v1 = light2(1.5, 5.0, d);
        v1 *= light1(1.0, 50.0, d0);
        
        float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
        float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);
        
        vec3 colBase = mix(color1, color2, cl);
        float fadeAmount = mix(1.0, 0.1, bgLuminance);
        
        vec3 darkCol = mix(color3, colBase, v0);
        darkCol = (darkCol + v1) * v2 * v3;
        darkCol = clamp(darkCol, 0.0, 1.0);
        
        vec3 lightCol = (colBase + v1) * mix(1.0, v2 * v3, fadeAmount);
        lightCol = mix(backgroundColor, lightCol, v0);
        lightCol = clamp(lightCol, 0.0, 1.0);
        
        vec3 finalCol = mix(darkCol, lightCol, bgLuminance);
        
        return extractAlpha(finalCol);
      }
      
      vec4 mainImage(vec2 fragCoord) {
        vec2 center = iResolution.xy * 0.5;
        float size = min(iResolution.x, iResolution.y);
        vec2 uv = (fragCoord - center) / size * 2.0;
        
        float angle = rot;
        float s = sin(angle);
        float c = cos(angle);
        uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
        
        uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
        uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);
        
        return draw(uv);
      }
      
      void main() {
        vec2 fragCoord = vUv * iResolution.xy;
        vec4 col = mainImage(fragCoord);
        gl_FragColor = vec4(col.rgb * col.a, col.a);
      }
    `;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(s));
      }
      return s;
    };

    const vsShader = compile(gl.VERTEX_SHADER, vs);
    const fsShader = compile(gl.FRAGMENT_SHADER, fs);
    if (!vsShader || !fsShader) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vsShader);
    gl.attachShader(prog, fsShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // vertices quad
    const vertices = new Float32Array([
      -1.0, -1.0, 0.0, 0.0,
      1.0, -1.0, 1.0, 0.0,
      -1.0, 1.0, 0.0, 1.0,
      1.0, 1.0, 1.0, 1.0
    ]);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const FSIZE = vertices.BYTES_PER_ELEMENT;
    const pos = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, FSIZE * 4, 0);

    const uvLoc = gl.getAttribLocation(prog, 'uv');
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);

    this.uniforms = {
      iTime: gl.getUniformLocation(prog, 'iTime'),
      iResolution: gl.getUniformLocation(prog, 'iResolution'),
      hue: gl.getUniformLocation(prog, 'hue'),
      hover: gl.getUniformLocation(prog, 'hover'),
      rot: gl.getUniformLocation(prog, 'rot'),
      hoverIntensity: gl.getUniformLocation(prog, 'hoverIntensity'),
      backgroundColor: gl.getUniformLocation(prog, 'backgroundColor')
    };

    this.syncCanvasSize();

    if (this.orb) {
      this.orb.addEventListener('mouseenter', this.handleOrbMouseEnter);
      this.orb.addEventListener('mouseleave', this.handleOrbMouseLeave);
    }

    const renderLoop = (t: number) => {
      if (this.destroyed) return;
      requestAnimationFrame(renderLoop);
      this.renderWebGL(t);
    };
    requestAnimationFrame(renderLoop);
  }

  private syncCanvasSize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || 60;
    const h = this.canvas.clientHeight || 60;
    if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
    }
  }

  private renderWebGL(t: number) {
    const gl = this.gl;
    if (!gl || !this.canvas) return;

    this.syncCanvasSize();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const dt = (t - this.lastTime) * 0.001;
    this.lastTime = t;

    let state = 'idle';
    if (this.isListening) state = 'listening';
    else if (this.isProcessing) state = 'processing';
    else if (this.container?.classList.contains('state-confirmed')) state = 'confirmed';

    if (state === 'idle') {
      this.targetHue = 0.0;
      this.timeScale += (0.5 - this.timeScale) * 0.1;
    } else if (state === 'listening') {
      this.targetHue = -15.0;
      this.timeScale += (2.0 - this.timeScale) * 0.1;
    } else if (state === 'processing') {
      this.targetHue = 20.0;
      this.timeScale += (1.2 - this.timeScale) * 0.1;
      this.currentRot += dt * 0.8;
    } else if (state === 'confirmed') {
      this.targetHue = -100.0;
      this.timeScale += (1.0 - this.timeScale) * 0.1;
    }

    this.currentHue += (this.targetHue - this.currentHue) * 0.1;
    this.currentHover += (this.targetHover - this.currentHover) * 0.1;

    if (this.targetHover > 0.5) {
      this.currentRot += dt * 0.3;
    }

    gl.uniform1f(this.uniforms.iTime, t * 0.001 * this.timeScale);
    gl.uniform3f(this.uniforms.iResolution, this.canvas.width, this.canvas.height, this.canvas.width / this.canvas.height);
    gl.uniform1f(this.uniforms.hue, this.currentHue);
    gl.uniform1f(this.uniforms.hover, this.currentHover);
    gl.uniform1f(this.uniforms.rot, this.currentRot);
    gl.uniform1f(this.uniforms.hoverIntensity, 0.3);
    gl.uniform3f(this.uniforms.backgroundColor, 0.0, 0.0, 0.0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (window.__voiceOrbInstance) {
      window.__voiceOrbInstance.destroy();
      window.__voiceOrbInstance = undefined;
    }
  });
}
