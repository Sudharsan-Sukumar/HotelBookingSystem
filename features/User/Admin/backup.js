document.addEventListener('DOMContentLoaded', () => {
  let backups = [
    { id: 'BCK-042', type: 'Scheduled', datetime: '23 Jun 2026, 05:00 AM', size: '320 MB', status: 'Completed', includes: 'DB + Files' },
    { id: 'BCK-041', type: 'Scheduled', datetime: '22 Jun 2026, 05:00 AM', size: '318 MB', status: 'Completed', includes: 'DB + Files' },
    { id: 'BCK-040', type: 'Manual', datetime: '21 Jun 2026, 02:32 PM', size: '315 MB', status: 'Completed', includes: 'DB Only' },
    { id: 'BCK-039', type: 'Scheduled', datetime: '21 Jun 2026, 05:00 AM', size: '314 MB', status: 'Completed', includes: 'DB + Files' },
    { id: 'BCK-038', type: 'Scheduled', datetime: '20 Jun 2026, 05:00 AM', size: '312 MB', status: 'Completed', includes: 'DB + Files' }
  ];

  const tblBody = document.querySelector('#tblBackups tbody');
  const filterType = document.getElementById('filterType');
  const btnReset = document.getElementById('btnResetFilters');
  const btnApply = document.getElementById('btnApplyFilters');

  function showToast(message, isSuccess = true) {
    const toastMessage = document.getElementById('toastMessage');
    const toastEl = document.getElementById('statusToast');
    toastEl.className = `toast align-items-center text-white border-0 shadow ${isSuccess ? 'bg-success' : 'bg-danger'}`;
    toastMessage.textContent = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }

  function renderTable() {
    tblBody.innerHTML = '';
    const typeVal = filterType.value;

    let filtered = backups.filter(b => {
      if (typeVal !== 'all' && b.type !== typeVal) return false;
      return true;
    });

    // Update KPI metrics values
    document.getElementById('kpiTotalBackups').textContent = backups.length;
    if (backups.length > 0) {
      document.getElementById('kpiLastBackup').textContent = 'Just now';
      document.getElementById('kpiLastBackupDate').textContent = backups[0].datetime;
    }

    filtered.forEach(b => {
      let statusBadge = '<span class="badge bg-success">Completed</span>';
      if (b.status === 'Failed') {
        statusBadge = '<span class="badge bg-danger">Failed</span>';
      }

      let actions = `
        <button class="btn btn-sm btn-outline-purple py-0 px-2 me-1" onclick="downloadBackup('${b.id}')"><i class="bi bi-download me-1"></i>Download</button>
        <button class="btn btn-sm btn-outline-purple py-0 px-2 me-1" onclick="restoreBackup('${b.id}')"><i class="bi bi-arrow-counterclockwise me-1"></i>Restore</button>
        <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteBackup('${b.id}')"><i class="bi bi-trash-fill"></i></button>
      `;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${b.id}</strong></td>
        <td><span class="badge bg-secondary-light text-secondary">${b.type}</span></td>
        <td>${b.datetime}</td>
        <td>${b.size}</td>
        <td>${statusBadge}</td>
        <td>${b.includes}</td>
        <td class="text-end text-nowrap">${actions}</td>
      `;
      tblBody.appendChild(tr);
    });
  }

  // Create Backup Action with Premium Progress Animation
  const backupModalEl = document.getElementById('backupAnimModal');
  const backupModal = new bootstrap.Modal(backupModalEl);

  document.getElementById('btnCreateBackupNow').addEventListener('click', () => {
    if (confirm('Create a new system backup now?')) {
      // Show full-screen animation modal
      backupModal.show();

      const progressCircle = document.getElementById('progressCircle');
      const progressText = document.getElementById('progressPercentage');
      const stageTitle = document.getElementById('backupStageTitle');
      const stageDesc = document.getElementById('backupStageDesc');
      const bottomBar = document.getElementById('progressBarBottom');
      const dataPacket = document.querySelector('.data-packet');

      // Reset progress
      let progress = 0;
      progressText.textContent = '0%';
      bottomBar.style.width = '0%';
      progressCircle.style.strokeDashoffset = '251.2';
      if (dataPacket) dataPacket.style.animation = 'none';

      // Define Stage details
      const stages = [
        { limit: 15, title: 'Initializing Backup...', desc: 'Preparing secure data pipeline...' },
        { limit: 35, title: 'Checking Database Integrity...', desc: 'Verifying tables and indexes...' },
        { limit: 55, title: 'Compressing Database...', desc: 'Optimizing schema archives...' },
        { limit: 75, title: 'Encrypting Backup...', desc: 'AES-256 Encryption Enabled' },
        { limit: 90, title: 'Uploading Secure Backup...', desc: 'Synchronizing backup files to cloud...' },
        { limit: 100, title: 'Verifying Backup Integrity...', desc: 'Performing checksum validation...' }
      ];

      // Trigger packet flow animation
      if (dataPacket) {
        dataPacket.style.animation = 'flowData 2s infinite linear';
      }

      // Animate progress over exactly 6 seconds
      const duration = 6000; // 6 seconds total
      const intervalTime = 50; // every 50ms
      const totalSteps = duration / intervalTime;
      const stepValue = 100 / totalSteps;

      const timer = setInterval(() => {
        progress += stepValue;
        if (progress >= 100) {
          progress = 100;
          clearInterval(timer);

          // Completion success state
          stageTitle.innerHTML = '<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i> Backup Completed Successfully</span>';
          stageDesc.textContent = 'Secure backup RT-043 created and stored.';
          if (dataPacket) dataPacket.style.animation = 'none';

          // Show success state for 1 second, then close modal and save records
          setTimeout(() => {
            backupModal.hide();

            const nextId = `BCK-0${backups.length + 43}`;
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            backups.unshift({
              id: nextId,
              type: 'Manual',
              datetime: dateStr,
              size: '325 MB',
              status: 'Completed',
              includes: 'DB + Files'
            });

            showToast('Backup created successfully.', true);
            renderTable();
          }, 1200);
        }

        // Apply progress text and indicators
        const displayProgress = Math.floor(progress);
        progressText.textContent = `${displayProgress}%`;
        bottomBar.style.width = `${displayProgress}%`;
        
        // svg dash offset calculation
        const offset = 251.2 - (251.2 * displayProgress) / 100;
        progressCircle.style.strokeDashoffset = offset;

        // Cycle process stages description
        const currentStage = stages.find(s => displayProgress <= s.limit) || stages[stages.length - 1];
        if (displayProgress < 100) {
          stageTitle.textContent = currentStage.title;
          stageDesc.textContent = currentStage.desc;
        }

      }, intervalTime);
    }
  });

  // Download Trigger simulation
  window.downloadBackup = function(id) {
    showToast(`Preparing download for backup archive ${id}...`, true);
    setTimeout(() => {
      showToast(`Download completed for ${id}.`, true);
    }, 1500);
  };

  // Restore backup handler
  const restoreConfirmModal = new bootstrap.Modal(document.getElementById('restoreConfirmModal'));
  const restoreAnimModal = new bootstrap.Modal(document.getElementById('restoreAnimModal'));
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const txtPassword = document.getElementById('txtAdminPassword');
  let selectedBackupForRestore = null;

  // Toggle Password Visibility
  btnTogglePassword.addEventListener('click', () => {
    const type = txtPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    txtPassword.setAttribute('type', type);
    btnTogglePassword.querySelector('i').classList.toggle('bi-eye');
    btnTogglePassword.querySelector('i').classList.toggle('bi-eye-slash');
  });

  // Top header button action
  document.getElementById('btnRestoreLatest').addEventListener('click', () => {
    if (backups.length > 0) {
      window.restoreBackup(backups[0].id);
    } else {
      showToast('No backup records available to restore.', false);
    }
  });

  document.getElementById('btnDownloadLatest').addEventListener('click', () => {
    if (backups.length > 0) {
      window.downloadBackup(backups[0].id);
    }
  });

  window.restoreBackup = function(id) {
    const b = backups.find(x => x.id === id);
    if (!b) return;

    selectedBackupForRestore = b;
    document.getElementById('lblRestoreBackupId').textContent = b.id;
    document.getElementById('lblRestoreBackupDate').textContent = b.datetime;
    document.getElementById('lblRestoreBackupSize').textContent = b.size;
    document.getElementById('lblRestoreBackupIncludes').textContent = b.includes;
    
    // Clear inputs
    txtPassword.value = '';
    document.getElementById('chkRestoreConsent').checked = false;
    document.getElementById('errAdminPassword').style.display = 'none';

    restoreConfirmModal.show();
  };

  // Submit and validate restore trigger
  document.getElementById('frmRestoreConfirm').addEventListener('submit', (e) => {
    e.preventDefault();

    const pass = txtPassword.value.trim();
    const consent = document.getElementById('chkRestoreConsent').checked;
    const errorMsg = document.getElementById('errAdminPassword');

    errorMsg.style.display = 'none';

    if (!pass) {
      errorMsg.textContent = 'Administrator password is required.';
      errorMsg.style.display = 'block';
      return;
    }

    if (pass !== 'admin123' && pass !== 'admin' && pass !== 'Admin@123') {
      errorMsg.textContent = 'Invalid administrator password.';
      errorMsg.style.display = 'block';
      return;
    }

    if (!consent) {
      alert('You must check the consent checkbox to continue.');
      return;
    }

    // Pass validates, proceed with restore animation
    restoreConfirmModal.hide();
    restoreAnimModal.show();

    const progressCircle = document.getElementById('restoreCircle');
    const progressText = document.getElementById('restorePercentage');
    const stageTitle = document.getElementById('restoreStageTitle');
    const stageDesc = document.getElementById('restoreStageDesc');
    const bottomBar = document.getElementById('restoreBarBottom');
    const dataPacket = document.querySelector('.restore-data-packet');

    // Reset parameters
    let progress = 0;
    progressText.textContent = '0%';
    bottomBar.style.width = '0%';
    progressCircle.style.strokeDashoffset = '251.2';
    if (dataPacket) dataPacket.style.animation = 'none';

    // Define stage parameters
    const stages = [
      { limit: 15, title: 'Initializing Restore...', desc: 'Preparing recovery environment...' },
      { limit: 35, title: 'Verifying Backup Integrity...', desc: 'Checking backup consistency...' },
      { limit: 55, title: 'Restoring Database...', desc: 'Replacing existing database tables...' },
      { limit: 75, title: 'Restoring Files...', desc: 'Recovering application files...' },
      { limit: 90, title: 'Synchronizing Configuration...', desc: 'Updating system configurations...' },
      { limit: 100, title: 'Final Verification...', desc: 'Validating restored system...' }
    ];

    if (dataPacket) {
      dataPacket.style.animation = 'flowData 2s infinite linear reverse';
    }

    const duration = 5000; // 5 seconds
    const intervalTime = 50;
    const totalSteps = duration / intervalTime;
    const stepValue = 100 / totalSteps;

    const timer = setInterval(() => {
      progress += stepValue;
      if (progress >= 100) {
        progress = 100;
        clearInterval(timer);

        stageTitle.innerHTML = '<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i> System Restored Successfully</span>';
        stageDesc.textContent = 'Backup has been fully restored and updated.';
        if (dataPacket) dataPacket.style.animation = 'none';

        setTimeout(() => {
          restoreAnimModal.hide();
          showToast('Backup restored successfully.', true);
          renderTable();
        }, 1200);
      }

      const displayProgress = Math.floor(progress);
      progressText.textContent = `${displayProgress}%`;
      bottomBar.style.width = `${displayProgress}%`;
      
      const offset = 251.2 - (251.2 * displayProgress) / 100;
      progressCircle.style.strokeDashoffset = offset;

      const currentStage = stages.find(s => displayProgress <= s.limit) || stages[stages.length - 1];
      if (displayProgress < 100) {
        stageTitle.textContent = currentStage.title;
        stageDesc.textContent = currentStage.desc;
      }
    }, intervalTime);
  });

  // Download Trigger simulation
  window.downloadBackup = function(id) {
    showToast(`Preparing download for backup archive ${id}...`, true);
    setTimeout(() => {
      showToast(`Download completed for ${id}.`, true);
    }, 1500);
  };

  // Delete Trigger
  window.deleteBackup = function(id) {
    if (confirm('Delete backup archive file? This action is permanent.')) {
      const idx = backups.findIndex(x => x.id === id);
      if (idx !== -1) {
        backups.splice(idx, 1);
        showToast('Backup deleted successfully.', true);
        renderTable();
      }
    }
  };

  btnApply.addEventListener('click', renderTable);
  btnReset.addEventListener('click', () => {
    filterType.value = 'all';
    renderTable();
  });

  renderTable();
});
