/**
 * MedShift Mini - Frontend Logic
 * Implements LocalStorage persistence, Clipboard APIs, and dynamic DOM rendering.
 */

const MedShiftApp = (() => {
  // === State Management ===
  let patients = [];
  const STORAGE_KEY = 'medshift_patients';

  // UI styling maps for statuses matching our CSS variables
  const statusStyles = {
    'Stable': { badge: 'badge-stable', border: 'border-stable' },
    'Guarded': { badge: 'badge-guarded', border: 'border-guarded' },
    'Critical': { badge: 'badge-critical', border: 'border-critical' }
  };

  // === DOM Selectors ===
  const ui = {
    dashboard: document.getElementById('patient-dashboard'),
    modal: document.getElementById('handoverModal'),
    form: document.getElementById('handover-form'),
    formError: document.getElementById('form-error'),
    template: document.getElementById('patient-card-template'),
    toast: document.getElementById('toast'),
    toastMsg: document.getElementById('toast-message'),
    btnExportAll: document.getElementById('btn-export-all')
  };

  // === Initialization ===
  const init = () => {
    loadState();
    bindEvents();
    renderDashboard();
  };

  // === Event Listeners ===
  const bindEvents = () => {
    // Modal controls (Unified to the single header button)
    document.getElementById('btn-open-modal').addEventListener('click', () => ui.modal.showModal());
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);

    // Form submission
    ui.form.addEventListener('submit', handleFormSubmit);

    // Event Delegation for dynamically generated cards (Delete and Copy single)
    ui.dashboard.addEventListener('click', handleCardActions);

    // Bulk Export
    ui.btnExportAll.addEventListener('click', exportFullHandover);
  };

  // === Core Logic ===

  const loadState = () => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        patients = JSON.parse(cached);
      } catch (e) {
        console.error("Failed to parse LocalStorage data", e);
        patients = [];
      }
    }
  };

  const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  };

  const closeModal = () => {
    ui.modal.close();
    ui.form.reset();
    ui.formError.style.display = 'none'; // Hide error visually
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    // 1. Validate Form
    if (!ui.form.checkValidity()) {
      ui.formError.textContent = "Please fill out all required fields, including Priority Status.";
      ui.formError.style.display = 'block'; // Show error visually
      return;
    }

    // 2. Extract Data using FormData
    const formData = new FormData(ui.form);
    const newPatient = {
      id: crypto.randomUUID(), // Generates a unique ID
      bed: formData.get('bed').trim(),
      initials: formData.get('initials').trim().toUpperCase(),
      status: formData.get('status'),
      tasks: formData.get('tasks').trim(),
      timestamp: new Date().toISOString()
    };

    // 3. Update State & UI
    patients.push(newPatient);
    saveState();
    renderDashboard();
    closeModal();
    showToast(`Patient ${newPatient.bed} added to queue.`);
  };

  const handleCardActions = (e) => {
    const card = e.target.closest('.patient-card');
    if (!card) return;

    const patientId = card.dataset.id;

    // Handle Delete
    if (e.target.closest('.delete-btn')) {
      patients = patients.filter(p => p.id !== patientId);
      saveState();
      renderDashboard();
      showToast('Patient removed from shift list.');
    }

    // Handle Single Copy
    if (e.target.closest('.copy-single-btn')) {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        copyToClipboard(formatSinglePatient(patient), `Handover for ${patient.bed} copied!`);
      }
    }
  };

  // === Rendering UI ===
  
  const renderDashboard = () => {
    ui.dashboard.innerHTML = ''; // Clear current UI

    if (patients.length === 0) {
      // Empty state styling via inline styles to keep CSS clean
      ui.dashboard.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem 0; color: var(--text-muted);">No active patients on shift list.</div>`;
      return;
    }

    // Clone template for each patient
    patients.forEach(patient => {
      const clone = ui.template.content.cloneNode(true);
      const article = clone.querySelector('article');
      
      article.dataset.id = patient.id; // Store ID for event delegation
      
      // Inject Data
      clone.querySelector('.bed-number').textContent = patient.bed;
      clone.querySelector('.initials-circle').textContent = patient.initials;
      clone.querySelector('.tasks-text').textContent = patient.tasks;
      
      const badge = clone.querySelector('.status-badge');
      badge.textContent = patient.status;

      // Apply dynamic styles based on status map
      const styles = statusStyles[patient.status] || statusStyles['Stable'];
      article.classList.add(styles.border);
      badge.className = `status-badge ${styles.badge}`;

      ui.dashboard.appendChild(clone);
    });
  };

  // === Clipboard Export Logic ===

  const formatSinglePatient = (patient) => {
    return `[Bed ${patient.bed}] Initials: ${patient.initials} | Status: ${patient.status.toUpperCase()}\n- Tasks: ${patient.tasks.replace(/\n/g, '\n  ')}`;
  };

  const exportFullHandover = () => {
    if (patients.length === 0) {
      showToast("No active patients to export.");
      return;
    }

    let summary = "=== SHIFT HANDOVER SUMMARY ===\n\n";
    
    patients.forEach(patient => {
      summary += formatSinglePatient(patient) + "\n--------------------------\n";
    });

    copyToClipboard(summary, "Full Shift Handover copied to clipboard!");
  };

  const copyToClipboard = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showToast("Clipboard export failed. Check browser permissions.");
    }
  };

  // === Utility: Toast Notifications ===
  let toastTimeout;
  const showToast = (message) => {
    clearTimeout(toastTimeout);
    ui.toastMsg.textContent = message;
    
    // Show toast using our new custom CSS class
    ui.toast.classList.add('show');
    
    // Hide after 2.5 seconds
    toastTimeout = setTimeout(() => {
      ui.toast.classList.remove('show');
    }, 2500);
  };

  // Expose init explicitly
  return { init };
})();

// Boot up app when DOM is ready
document.addEventListener('DOMContentLoaded', MedShiftApp.init);