// Admin Session Check
const userId = localStorage.getItem('userId');
const userRole = (localStorage.getItem('userRole') || '').trim();
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

if (!isLoggedIn || userRole !== 'Admin') {
  console.warn('Session check failed:', { isLoggedIn, userRole });
  window.location.href = '../../../features/Auth/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  let backups = HotelState.get('backupHistory') || [];
  let currentPage = 1;
  let rowsPerPage = 5;
  
  const tblBody = document.querySelector('#tblBackups tbody');
  const filterType = document.getElementById('filterType');
  const btnReset = document.getElementById('btnResetFilters');
  const btnApply = document.getElementById('btnApplyFilters');

  const customConfirmModal = new bootstrap.Modal(document.getElementById('customConfirmModal'));
  const customConfirmModalTitle = document.getElementById('customConfirmModalTitle');
  const customConfirmModalBody = document.getElementById('customConfirmModalBody');
  const btnConfirmActionSubmit = document.getElementById('btnConfirmActionSubmit');
  let activeConfirmAction = null;

  btnConfirmActionSubmit.addEventListener('click', () => {
    if (activeConfirmAction) {
      activeConfirmAction();
      activeConfirmAction = null;
    }
    customConfirmModal.hide();
  });

  function showToast(message, isSuccess = true) {
    const toastMessage = document.getElementById('toastMessage');
    const toastEl = document.getElementById('statusToast');
    toastEl.className = `toast align-items-center text-white border-0 shadow ${isSuccess ? 'bg-success' : 'bg-danger'}`;
    toastMessage.textContent = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }

  function getStorageSizeStr() {
    let _lsTotal = 0;
    for(let x in localStorage) {
      if(localStorage.hasOwnProperty(x)) {
        _lsTotal += ((localStorage[x].length + x.length) * 2);
      }
    }
    const kb = (_lsTotal / 1024).toFixed(2);
    return `${kb} KB`;
  }

  function renderTable() {
    tblBody.innerHTML = '';
    const typeVal = filterType.value;
    const filterDateStart = document.getElementById('filterDateStart').value;
    const filterDateEnd = document.getElementById('filterDateEnd').value;
    
    // Sort descending
    backups.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    let filtered = backups.filter(b => {
      if (typeVal !== 'all' && b.type !== typeVal) return false;
      
      if (filterDateStart || filterDateEnd) {
        const bDate = new Date(b.timestamp);
        if (filterDateStart && bDate < new Date(filterDateStart)) return false;
        if (filterDateEnd) {
          const endDate = new Date(filterDateEnd);
          endDate.setHours(23, 59, 59, 999);
          if (bDate > endDate) return false;
        }
      }
      return true;
    });

    // Update KPI metrics values
    document.getElementById('kpiTotalBackups').textContent = backups.length;
    if (backups.length > 0) {
      document.getElementById('kpiLastBackup').textContent = 'Recent';
      document.getElementById('kpiLastBackupDate').textContent = backups[0].datetime;
    } else {
      document.getElementById('kpiLastBackup').textContent = 'Never';
      document.getElementById('kpiLastBackupDate').textContent = '-';
    }

    // Update storage size element
    const kpiStorage = document.querySelector('.bi-pie-chart-fill').closest('.kpi-card').querySelector('strong');
    if (kpiStorage) {
      kpiStorage.textContent = getStorageSizeStr();
      kpiStorage.nextElementSibling.textContent = 'Estimated size';
    }

    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / rowsPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

    if (totalFiltered === 0) {
      tblBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No backup history available.</td></tr>`;
      renderPagination(0);
      return;
    }

    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + rowsPerPage);

    paginated.forEach(b => {
      let statusBadge = '<span class="badge bg-success">Completed</span>';
      if (b.status === 'Failed') {
        statusBadge = '<span class="badge bg-danger">Failed</span>';
      }

      let actions = `
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
    
    renderPagination(totalFiltered);
  }

  window.changePage = function(page) {
    currentPage = page;
    renderTable();
  };

  function renderPagination(totalFiltered) {
    const paginationControls = document.getElementById('paginationControls');
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationList = document.getElementById('paginationList');
    
    if (totalFiltered === 0) {
      paginationControls.style.setProperty('display', 'none', 'important');
      return;
    }
    
    paginationControls.style.setProperty('display', 'flex', 'important');
    
    const totalPages = Math.ceil(totalFiltered / rowsPerPage);
    const startItem = (currentPage - 1) * rowsPerPage + 1;
    const endItem = Math.min(currentPage * rowsPerPage, totalFiltered);
    
    paginationInfo.textContent = `Showing ${startItem} to ${endItem} of ${totalFiltered} entries`;
    
    let html = '';
    
    // Prev
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
               <a class="page-link text-purple" href="#" onclick="changePage(${currentPage - 1}); return false;">Previous</a>
             </li>`;
             
    for (let i = 1; i <= totalPages; i++) {
      if (currentPage === i) {
        html += `<li class="page-item active">
                   <a class="page-link bg-purple border-purple text-white" href="#" onclick="changePage(${i}); return false;">${i}</a>
                 </li>`;
      } else {
        html += `<li class="page-item">
                   <a class="page-link text-purple" href="#" onclick="changePage(${i}); return false;">${i}</a>
                 </li>`;
      }
    }
    
    // Next
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
               <a class="page-link text-purple" href="#" onclick="changePage(${currentPage + 1}); return false;">Next</a>
             </li>`;
             
    paginationList.innerHTML = html;
  }

  // Create Backup Action
  const backupModalEl = document.getElementById('backupAnimModal');
  const backupModal = new bootstrap.Modal(backupModalEl);

  document.getElementById('btnCreateBackupNow').addEventListener('click', () => {
    customConfirmModalTitle.textContent = 'Create Backup';
    customConfirmModalBody.textContent = 'Create a new system backup now?';
    activeConfirmAction = () => {
      backupModal.show();

      const progressCircle = document.getElementById('progressCircle');
      const progressText = document.getElementById('progressPercentage');
      const stageTitle = document.getElementById('backupStageTitle');
      const stageDesc = document.getElementById('backupStageDesc');
      const bottomBar = document.getElementById('progressBarBottom');
      const dataPacket = document.querySelector('.data-packet');

      let progress = 0;
      progressText.textContent = '0%';
      bottomBar.style.width = '0%';
      progressCircle.style.strokeDashoffset = '251.2';
      if (dataPacket) dataPacket.style.animation = 'none';

      const stages = [
        { limit: 20, title: 'Gathering System Data...', desc: 'Reading state from LocalStorage...' },
        { limit: 50, title: 'Creating JSON Payload...', desc: 'Structuring entities...' },
        { limit: 80, title: 'Finalizing Backup...', desc: 'Logging activity...' },
        { limit: 100, title: 'Triggering Download...', desc: 'Saving file to disk...' }
      ];

      if (dataPacket) {
        dataPacket.style.animation = 'flowData 1s infinite linear';
      }

      const duration = 3000;
      const intervalTime = 50;
      const totalSteps = duration / intervalTime;
      const stepValue = 100 / totalSteps;

      const timer = setInterval(() => {
        progress += stepValue;
        if (progress >= 100) {
          progress = 100;
          clearInterval(timer);

          // Actual Backup Logic
          const data = {
            users: HotelState.users,
            hotels: HotelState.hotels,
            rooms: HotelState.rooms,
            bookings: HotelState.bookings,
            notifications: HotelState.notifications,
            housekeeping: HotelState.housekeeping,
            content: HotelState.content,
            backupHistory: HotelState.get('backupHistory') || []
          };

          const now = new Date();
          const payload = {
            backupDate: now.toISOString(),
            version: '1.0',
            data: data
          };

          const jsonStr = JSON.stringify(payload, null, 2);
          const kbSize = (jsonStr.length / 1024).toFixed(2) + ' KB';

          const pad = (n) => n.toString().padStart(2, '0');
          const dStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
          const filename = `hbs_backup_${dStr}.json`;

          // Trigger Download
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // Save state and history
          const user = HotelState.currentUser || { id: 'SYS', role: 'Admin', name: 'System Admin' };

          const backupId = `BCK-${Date.now().toString().slice(-6)}`;
          backups.unshift({
            id: backupId,
            type: 'Manual',
            timestamp: now.toISOString(),
            datetime: now.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }),
            size: kbSize,
            status: 'Completed',
            includes: 'All State Data'
          });
          HotelState.set('backupHistory', backups);

          stageTitle.innerHTML = '<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i> Backup Completed Successfully</span>';
          stageDesc.textContent = 'Backup file downloaded securely.';
          if (dataPacket) dataPacket.style.animation = 'none';

          setTimeout(() => {
            backupModal.hide();
            showToast('Backup created successfully.', true);
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
    };
    customConfirmModal.show();
  });

  // Download Latest Functionality
  const downloadFormatModal = new bootstrap.Modal(document.getElementById('downloadFormatModal'));
  
  function generateBackupData() {
    return {
      users: HotelState.users,
      hotels: HotelState.hotels,
      rooms: HotelState.rooms,
      bookings: HotelState.bookings,
      notifications: HotelState.notifications,
      housekeeping: HotelState.housekeeping,
      content: HotelState.content,
      backupHistory: HotelState.get('backupHistory') || []
    };
  }

  document.getElementById('btnDownloadLatest').addEventListener('click', () => {
    downloadFormatModal.show();
  });

  document.getElementById('btnDownloadJson').addEventListener('click', () => {
    downloadFormatModal.hide();
    const payload = {
      backupDate: new Date().toISOString(),
      version: '1.0',
      data: generateBackupData()
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hbs_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('JSON backup downloaded successfully.');
  });

  document.getElementById('btnDownloadZip').addEventListener('click', () => {
    downloadFormatModal.hide();
    const payload = {
      backupDate: new Date().toISOString(),
      version: '1.0',
      data: generateBackupData()
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    
    if (typeof JSZip !== 'undefined') {
      const zip = new JSZip();
      zip.file(`hbs_backup_${Date.now()}.json`, jsonStr);
      zip.file('readme.txt', 'This ZIP contains the system backup data in JSON format.');
      zip.generateAsync({type:"blob"}).then(function(content) {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hbs_backup_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('ZIP backup downloaded successfully.');
      });
    } else {
      showToast('Error: Failed to load ZIP library.', false);
    }
  });

  // Restore Functionality
  const btnUploadRestore = document.getElementById('btnUploadRestore');
  const fileRestoreBackup = document.getElementById('fileRestoreBackup');
  const restoreConfirmModal = new bootstrap.Modal(document.getElementById('restoreConfirmModal'));
  const restoreAnimModal = new bootstrap.Modal(document.getElementById('restoreAnimModal'));
  const txtPassword = document.getElementById('txtAdminPassword');
  let loadedRestoreData = null;

  if (btnUploadRestore && fileRestoreBackup) {
    btnUploadRestore.addEventListener('click', () => fileRestoreBackup.click());
    
    fileRestoreBackup.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target.result);
          if (!json.version || !json.data || typeof json.data !== 'object') {
            throw new Error('Invalid backup file schema: version or data missing.');
          }
          // Strict validation of entity arrays
          const requiredKeys = ['users', 'hotels', 'rooms', 'bookings'];
          for (const key of requiredKeys) {
            if (!json.data[key] || !Array.isArray(json.data[key])) {
              throw new Error(`Invalid backup data collection: '${key}' is missing or not an array.`);
            }
          }
          
          loadedRestoreData = json;
          
          document.getElementById('lblRestoreBackupId').textContent = file.name;
          document.getElementById('lblRestoreBackupDate').textContent = json.backupDate ? new Date(json.backupDate).toLocaleString() : new Date().toLocaleString();
          document.getElementById('lblRestoreBackupSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
          document.getElementById('lblRestoreBackupIncludes').textContent = 'All State Data';
          
          txtPassword.value = '';
          document.getElementById('chkRestoreConsent').checked = false;
          document.getElementById('errAdminPassword').style.display = 'none';

          restoreConfirmModal.show();
        } catch (err) {
          showToast(`Failed to parse backup file: ${err.message}`, false);
        }
        fileRestoreBackup.value = '';
      };
      reader.readAsText(file);
    });
  }

  document.getElementById('frmRestoreConfirm').addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = txtPassword.value.trim();
    const consent = document.getElementById('chkRestoreConsent').checked;
    const errorMsg = document.getElementById('errAdminPassword');
    const errConsent = document.getElementById('errRestoreConsent');
    errorMsg.style.display = 'none';
    if(errConsent) errConsent.style.display = 'none';

    if (!pass) {
      errorMsg.textContent = 'Administrator password is required.';
      errorMsg.style.display = 'block';
      return;
    }
    // Simple admin validation as per Phase 1 spec mockup
    if (pass !== 'admin123' && pass !== 'admin' && pass !== 'Admin@123' && pass !== 'Secure@123') {
      errorMsg.textContent = 'Invalid administrator password.';
      errorMsg.style.display = 'block';
      return;
    }
    if (!consent) {
      if(errConsent) errConsent.style.display = 'block';
      return;
    }

    restoreConfirmModal.hide();
    restoreAnimModal.show();

    const progressCircle = document.getElementById('restoreCircle');
    const progressText = document.getElementById('restorePercentage');
    const stageTitle = document.getElementById('restoreStageTitle');
    const stageDesc = document.getElementById('restoreStageDesc');
    const bottomBar = document.getElementById('restoreBarBottom');
    const dataPacket = document.querySelector('.restore-data-packet');

    let progress = 0;
    progressText.textContent = '0%';
    bottomBar.style.width = '0%';
    progressCircle.style.strokeDashoffset = '251.2';
    if (dataPacket) dataPacket.style.animation = 'none';

    const stages = [
      { limit: 20, title: 'Wiping current data...', desc: 'Preparing memory...' },
      { limit: 50, title: 'Restoring Entities...', desc: 'Injecting JSON payload to LocalStorage...' },
      { limit: 90, title: 'Synchronizing Configuration...', desc: 'Updating state values...' },
      { limit: 100, title: 'Final Verification...', desc: 'Validating restored system...' }
    ];

    if (dataPacket) dataPacket.style.animation = 'flowData 1s infinite linear reverse';

    const duration = 3000;
    const intervalTime = 50;
    const totalSteps = duration / intervalTime;
    const stepValue = 100 / totalSteps;

    const timer = setInterval(() => {
      progress += stepValue;
      if (progress >= 100) {
        progress = 100;
        clearInterval(timer);

        // Perform Restore Logic
        const d = loadedRestoreData.data;
        if(d.users) HotelState.set('users', d.users);
        if(d.hotels) HotelState.set('hotels', d.hotels);
        if(d.rooms) HotelState.set('rooms', d.rooms);
        if(d.bookings) HotelState.set('bookings', d.bookings);
        if(d.notifications) HotelState.set('notifications', d.notifications);
        if(d.housekeeping) HotelState.set('housekeeping', d.housekeeping);
        if(d.content) HotelState.set('content', d.content);
        if(d.backupHistory) HotelState.set('backupHistory', d.backupHistory);

        const user = HotelState.currentUser || { id: 'SYS', role: 'Admin', name: 'System Admin' };

        // Reload backups ref
        backups = HotelState.get('backupHistory') || [];

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

  window.deleteBackup = function(id) {
    customConfirmModalTitle.textContent = 'Delete Backup';
    customConfirmModalBody.textContent = 'Are you sure you want to delete this backup archive?';
    activeConfirmAction = () => {
      backups = backups.filter(b => b.id !== id);
      HotelState.set('backupHistory', backups);
      showToast('Backup deleted successfully.', true);
      renderTable();
    };
    customConfirmModal.show();
  };

  // Add event listeners for filters
  btnApply.addEventListener('click', () => {
    currentPage = 1;
    renderTable();
  });

  btnReset.addEventListener('click', () => {
    filterType.value = 'all';
    document.getElementById('filterDateStart').value = '';
    document.getElementById('filterDateEnd').value = '';
    currentPage = 1;
    renderTable();
  });

  const pageSizeSelector = document.getElementById('pageSizeSelector');
  if (pageSizeSelector) {
    pageSizeSelector.addEventListener('change', (e) => {
      rowsPerPage = parseInt(e.target.value);
      currentPage = 1;
      renderTable();
    });
  }

  // Auto-Backup Configuration
  const autoBackupModal = new bootstrap.Modal(document.getElementById('autoBackupModal'));
  const chkAutoBackupEnable = document.getElementById('chkAutoBackupEnable');
  const autoBackupOptions = document.getElementById('autoBackupOptions');
  const selAutoBackupFrequency = document.getElementById('selAutoBackupFrequency');

  chkAutoBackupEnable.addEventListener('change', (e) => {
    autoBackupOptions.style.display = e.target.checked ? 'block' : 'none';
  });

  document.getElementById('btnConfigureAutoBackup').addEventListener('click', () => {
    const config = HotelState.get('autoBackupConfig') || { enabled: false, frequency: 'Daily' };
    chkAutoBackupEnable.checked = config.enabled;
    selAutoBackupFrequency.value = config.frequency || 'Daily';
    autoBackupOptions.style.display = config.enabled ? 'block' : 'none';
    autoBackupModal.show();
  });

  document.getElementById('btnSaveAutoBackup').addEventListener('click', () => {
    const config = HotelState.get('autoBackupConfig') || {};
    config.enabled = chkAutoBackupEnable.checked;
    config.frequency = selAutoBackupFrequency.value;
    // Don't reset lastRun if we're just updating
    HotelState.set('autoBackupConfig', config);
    
    autoBackupModal.hide();
    showToast('Auto-backup settings saved successfully.', true);
  });

  // Simulated Cron Job for Auto-Backup
  function runScheduledBackupSilently() {
    // Generate a backup record silently
    const user = { id: 'SYS', role: 'System', name: 'Auto Scheduler' };
    const backupId = `BCK-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    
    backups.unshift({
      id: backupId,
      type: 'Scheduled',
      timestamp: now.toISOString(),
      datetime: now.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }),
      size: '2.1 MB', // Placeholder size
      status: 'Completed',
      includes: 'Database, Files'
    });
    
    HotelState.set('backupHistory', backups);
    renderTable();
    showToast('A scheduled auto-backup was successfully created in the background.', true);
  }

  setInterval(() => {
    const config = HotelState.get('autoBackupConfig');
    if (!config || !config.enabled) return;

    const now = new Date().getTime();
    const lastRun = config.lastRun || 0;
    const msSinceLastRun = now - lastRun;

    let threshold = 24 * 60 * 60 * 1000; // Daily
    if (config.frequency === 'Weekly') threshold *= 7;
    if (config.frequency === 'Monthly') threshold *= 30;
    if (config.frequency === 'Minute') threshold = 60 * 1000;

    if (msSinceLastRun >= threshold) {
      config.lastRun = now;
      HotelState.set('autoBackupConfig', config);
      runScheduledBackupSilently();
    }
  }, 10000); // Check every 10 seconds

  // Initial render
  renderTable();
});
