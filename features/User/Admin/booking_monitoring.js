document.addEventListener('DOMContentLoaded', () => {
  let bookings = [
    { id: 'HBS-2026-001', branch: 'Salem', customer: 'Rajesh K.', roomType: 'Exec Studio', checkin: '25 Jun 2026', amount: 19470, status: 'Confirmed' },
    { id: 'HBS-2026-002', branch: 'Salem', customer: 'Priya S.', roomType: 'Deluxe Suite', checkin: '26 Jun 2026', amount: 35200, status: 'Pending' },
    { id: 'HBS-2026-010', branch: 'Coimbatore', customer: 'Kiran M.', roomType: 'Standard', checkin: '25 Jun 2026', amount: 7350, status: 'Confirmed' },
    { id: 'HBS-2026-015', branch: 'Chennai', customer: 'Shreya L.', roomType: 'Penthouse', checkin: '27 Jun 2026', amount: 57000, status: 'Confirmed' }
  ];

  const tblBody = document.querySelector('#tblBookings tbody');
  const filterBranch = document.getElementById('filterBranch');
  const filterStatus = document.getElementById('filterStatus');

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
    const branchVal = filterBranch.value;
    const statusVal = filterStatus.value;

    let filtered = bookings.filter(b => {
      if (branchVal !== 'all' && b.branch !== branchVal) return false;
      if (statusVal !== 'all' && b.status !== statusVal) return false;
      return true;
    });

    if (filtered.length === 0) {
      tblBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No bookings found. Try changing your filters.</td></tr>`;
      return;
    }

    filtered.forEach(b => {
      let badgeClass = 'bg-success';
      if (b.status === 'Pending') badgeClass = 'bg-warning text-dark';
      else if (b.status === 'Cancelled') badgeClass = 'bg-danger';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${b.id}</strong></td>
        <td>${b.branch}</td>
        <td>${b.customer}</td>
        <td>${b.roomType}</td>
        <td>${b.checkin}</td>
        <td>Rs. ${b.amount.toLocaleString()}</td>
        <td><span class="badge ${badgeClass}">${b.status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-purple py-0 px-2" onclick="location.href='view_booking.html?id=${b.id}'"><i class="bi bi-eye-fill me-1"></i>View</button>
        </td>
      `;
      tblBody.appendChild(tr);
    });
  }

  // Chart setup
  const ctx = document.getElementById('trendChart').getContext('2d');
  let trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['1 Jun', '5 Jun', '10 Jun', '15 Jun', '20 Jun', '25 Jun', '30 Jun'],
      datasets: [
        { label: 'Salem', data: [100, 120, 130, 160, 120, 170, 150], borderColor: '#8A2BE2', tension: 0.4 },
        { label: 'Coimbatore', data: [50, 60, 80, 95, 70, 105, 90], borderColor: '#2E8B57', tension: 0.4 },
        { label: 'Chennai', data: [20, 30, 45, 55, 40, 65, 50], borderColor: '#FF8C00', tension: 0.4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // Booking Status Distribution Doughnut Chart
  const ctxStatus = document.getElementById('statusChart').getContext('2d');
  let statusChart = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['Confirmed', 'Pending', 'Checked-In', 'Checked-Out', 'Cancelled'],
      datasets: [{
        data: [182, 33, 45, 120, 15],
        backgroundColor: ['#2E8B57', '#F1C40F', '#0D6EFD', '#6C757D', '#dc3545'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // Branch Occupancy Bar Chart
  const ctxBranch = document.getElementById('branchRatioChart').getContext('2d');
  let branchRatioChart = new Chart(ctxBranch, {
    type: 'bar',
    data: {
      labels: ['Chennai Enclave', 'Coimbatore Enclave', 'Salem Enclave'],
      datasets: [{
        label: 'Occupancy Rate (%)',
        data: [82, 75, 68],
        backgroundColor: ['#1A0A2E', '#D4AF37', '#8A2BE2'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: { beginAtZero: true, max: 100 }
      }
    }
  });

  window.setChartMode = function(mode) {
    document.querySelectorAll('.btn-group button').forEach(b => b.classList.remove('active', 'btn-purple'));
    document.querySelectorAll('.btn-group button').forEach(b => b.classList.add('btn-outline-purple'));
    
    // Simulate data transitions
    if (mode === 'daily') {
      trendChart.data.datasets[0].data = [100, 120, 130, 160, 120, 170, 150];
      statusChart.data.datasets[0].data = [182, 33, 45, 120, 15];
      branchRatioChart.data.datasets[0].data = [82, 75, 68];
    } else if (mode === 'weekly') {
      trendChart.data.datasets[0].data = [400, 520, 480, 600, 550, 710, 680];
      statusChart.data.datasets[0].data = [720, 110, 180, 490, 65];
      branchRatioChart.data.datasets[0].data = [88, 79, 72];
    } else {
      trendChart.data.datasets[0].data = [1600, 1800, 2100, 1900, 2300, 2500, 2400];
      statusChart.data.datasets[0].data = [2900, 450, 780, 1950, 220];
      branchRatioChart.data.datasets[0].data = [91, 84, 78];
    }
    trendChart.update();
    statusChart.update();
    branchRatioChart.update();
  };

  window.exportReport = function(format) {
    showToast(`Report exported successfully in ${format} format.`, true);
    
    // Create mock file contents
    let content = '';
    let mimeType = 'text/plain';
    let filename = `Booking_Report_${new Date().toISOString().slice(0,10)}.${format.toLowerCase()}`;

    if (format === 'CSV') {
      content = 'Booking ID,Branch,Customer,Room Type,Check-In Date,Amount,Status\n' +
                bookings.map(b => `${b.id},${b.branch},${b.customer},${b.roomType},${b.checkin},${b.amount},${b.status}`).join('\n');
      mimeType = 'text/csv';
    } else if (format === 'Excel') {
      filename = filename.replace('.excel', '.xlsx');
      content = 'XML/Binary Data Excel Stub';
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      filename = filename.replace('.pdf', '.txt');
      content = '=== ELEGANT ENCLAVE SYSTEM BOOKING REPORT ===\n\n' +
                `Generated on: ${new Date().toLocaleString()}\n` +
                '--------------------------------------------\n\n' +
                bookings.map(b => `Booking ID: ${b.id}\nBranch: ${b.branch}\nCustomer: ${b.customer}\nRoom Type: ${b.roomType}\nCheck-In: ${b.checkin}\nAmount: Rs. ${b.amount}\nStatus: ${b.status}\n--------------------------------------------`).join('\n\n');
      mimeType = 'text/plain';
    }

    // Trigger file download helper
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const btnApplyFilters = document.getElementById('btnApplyFilters');
  const btnResetFilters = document.getElementById('btnResetFilters');

  if (btnApplyFilters) {
    btnApplyFilters.addEventListener('click', () => {
      renderTable();
      showToast('Filters applied successfully.', true);
    });
  }

  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      if (filterBranch) filterBranch.value = 'all';
      if (filterStatus) filterStatus.value = 'all';
      if (document.getElementById('filterDateRange')) {
        document.getElementById('filterDateRange').value = 'This Month';
      }
      renderTable();
      showToast('Filters reset to default.', true);
    });
  }

  // Active chart selector toggle logic
  const selectActiveChart = document.getElementById('selectActiveChart');
  const containerTrendChart = document.getElementById('containerTrendChart');
  const containerStatusChart = document.getElementById('containerStatusChart');
  const containerOccupancyChart = document.getElementById('containerOccupancyChart');
  const trendChartTimeRange = document.getElementById('trendChartTimeRange');

  if (selectActiveChart) {
    selectActiveChart.addEventListener('change', () => {
      const val = selectActiveChart.value;
      
      // Hide all chart containers
      containerTrendChart.classList.add('d-none');
      containerStatusChart.classList.add('d-none');
      containerOccupancyChart.classList.add('d-none');
      
      if (val === 'trends') {
        containerTrendChart.classList.remove('d-none');
        if (trendChartTimeRange) trendChartTimeRange.classList.remove('d-none');
      } else if (val === 'status') {
        containerStatusChart.classList.remove('d-none');
        if (trendChartTimeRange) trendChartTimeRange.classList.add('d-none'); // Disable date range for static distribution doughnut
      } else if (val === 'occupancy') {
        containerOccupancyChart.classList.remove('d-none');
        if (trendChartTimeRange) trendChartTimeRange.classList.add('d-none'); // Disable date range for static branch ratio
      }
    });
  }

  // Simulated live update every 30 seconds
  setInterval(() => {
    // Randomize slight KPI values changes
    const totalEl = document.getElementById('kpiTotal');
    if (totalEl) {
      const curVal = parseInt(totalEl.textContent.replace(/,/g, '')) || 9841;
      totalEl.textContent = (curVal + Math.floor(Math.random() * 3)).toLocaleString();
      showToast('Live bookings monitor updated.', true);
    }
  }, 30000);

  renderTable();
});
