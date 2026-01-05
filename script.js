
    // ############################################################
    //  FRONTEND-LOGIK FÜR DIE KI-INTEGRATION (dein Code bleibt erhalten)
    //  + kleine Erweiterung: Consent-Checkbox steuert Start-Button
    // ############################################################

    const kiModalBackdrop = document.getElementById('ki-modal-backdrop');
    const kiModalCloseBtn = document.getElementById('ki-modal-close-btn');
    const kiModalCancelBtn = document.getElementById('ki-modal-cancel-btn');
    const kiModalStartBtn = document.getElementById('ki-modal-start-btn');
    const kiModeSelect = document.getElementById('ki-mode-select');
    const kiLanguageSelect = document.getElementById('ki-language-select');
    const kiNotesInput = document.getElementById('ki-notes');
    const kiResultBox = document.getElementById('ki-modal-result');
    const kiLoadingText = document.getElementById('ki-modal-loading');

    // NEU: Consent Elemente
    const kiConsent = document.getElementById('ki-consent');
    const kiConsentError = document.getElementById('ki-consent-error');

    let kiCurrentExamId = null;
    let kiLastFocusedElement = null;

    // Utility: Modal öffnen
    function openKiModal(examId, mode) {
      kiCurrentExamId = examId;
      kiLastFocusedElement = document.activeElement;

      if (mode === 'explain') {
        kiModeSelect.value = 'explain';
      } else if (mode === 'translate') {
        kiModeSelect.value = 'translate';
      }

      // Vorherigen Inhalt zurücksetzen
      kiNotesInput.value = '';
      kiResultBox.innerHTML =
        '<div class="modal-result-placeholder">Hier erscheint die KI-Erklärung oder Übersetzung zum ausgewählten Befund.</div>';
      kiLoadingText.style.display = 'none';

      // NEU: Consent Reset
      kiConsent.checked = false;
      kiModalStartBtn.disabled = true;
      kiConsentError.style.display = 'none';

      // Modal sichtbar setzen
      kiModalBackdrop.setAttribute('aria-hidden', 'false');

      // Fokus in den Dialog setzen (Barrierefreiheit)
      kiModeSelect.focus();
    }

    // Utility: Modal schließen
    function closeKiModal() {
      kiModalBackdrop.setAttribute('aria-hidden', 'true');
      kiCurrentExamId = null;

      if (kiLastFocusedElement && typeof kiLastFocusedElement.focus === 'function') {
        kiLastFocusedElement.focus();
      }
    }

    // ESC-Taste zum Schließen des Dialogs
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && kiModalBackdrop.getAttribute('aria-hidden') === 'false') {
        closeKiModal();
      }
    });

    // Klicks auf die Schließen/Abbrechen-Buttons
    kiModalCloseBtn.addEventListener('click', closeKiModal);
    kiModalCancelBtn.addEventListener('click', closeKiModal);

    // NEU: Consent steuert Start-Button (Usability + Kostentransparenz)
    kiConsent.addEventListener('change', () => {
      kiModalStartBtn.disabled = !kiConsent.checked;
      if (kiConsent.checked) {
        kiConsentError.style.display = 'none';
      }
    });

    // Buttons in der Untersuchungs-Liste anbinden
    document.querySelectorAll('.exam-item').forEach((item) => {
      const examId = item.getAttribute('data-exam-id');
      const explainBtn = item.querySelector('.js-ki-explain');
      const translateBtn = item.querySelector('.js-ki-translate');

      if (explainBtn) {
        explainBtn.addEventListener('click', () => {
          openKiModal(examId, 'explain');
        });
      }
      if (translateBtn) {
        translateBtn.addEventListener('click', () => {
          openKiModal(examId, 'translate');
        });
      }
    });

    // KI Call
    kiModalStartBtn.addEventListener('click', () => {
      if (!kiCurrentExamId) return;

      // NEU: Safety-Check (falls jemand disabled per DevTools entfernt)
      if (!kiConsent.checked) {
        kiConsentError.style.display = 'block';
        return;
      }

      const mode = kiModeSelect.value;
      const targetLanguage = kiLanguageSelect.value;
      const notes = kiNotesInput.value.trim();

      kiLoadingText.style.display = 'block';
      kiResultBox.innerHTML = '';

      const payload = {
        examId: kiCurrentExamId,
        mode: mode,
        targetLanguage: targetLanguage,
        notes: notes,

        // OPTIONAL (wenn ihr es im Backend loggen wollt):
        // priceCents: 250,
        // partner: "Radishmed/MedUniGraz",
        // anonymization: true
      };

      // HIER KI-PARTNER / BACKEND ANBINDEN
      fetch('/api/ki/befund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(async (response) => {
          if (!response.ok) throw new Error('Serverfehler: ' + response.status);
          return response.json();
        })
        .then((data) => {
          kiLoadingText.style.display = 'none';

          if (data && data.success && data.resultText) {
            kiResultBox.textContent = data.resultText;
          } else {
            kiResultBox.innerHTML =
              '<div class="modal-result-placeholder">Leider konnte keine KI-Antwort erzeugt werden. Bitte versuchen Sie es später erneut.</div>';
          }
        })
        .catch((error) => {
          console.error('Fehler bei KI-Anfrage:', error);
          kiLoadingText.style.display = 'none';
          kiResultBox.innerHTML =
            '<div class="modal-result-placeholder">Es ist ein Fehler bei der KI-Anfrage aufgetreten. Bitte versuchen Sie es später erneut.</div>';
        });
    });
  