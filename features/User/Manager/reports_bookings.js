document.addEventListener('DOMContentLoaded', () => {
  // 1. Mock Database representing detailed bookings data
  let bookingsLog = [
    { id: 'HBS-2026-001', guest: 'Rajesh Kumar', type: 'Executive Studio', checkin: '25 Jun 2026', checkout: '28 Jun 2026', source: 'Website', status: 'Checked Out', amount: '₹23,010' },
    { id: 'HBS-2026-002', guest: 'Priya Sharma', type: 'Deluxe Suite', checkin: '26 Jun 2026', checkout: '29 Jun 2026', source: 'Phone Call', status: 'Staying', amount: '₹27,500' },
    { id: 'HBS-2026-003', guest: 'Arun Menon', type: 'Standard Room', checkin: '27 Jun 2026', checkout: '30 Jun 2026', source: 'Walk-in', status: 'Checked Out', amount: '₹12,000' },
    { id: 'HBS-2026-004', guest: 'Meena Varma', type: 'Penthouse Suite', checkin: '28 Jun 2026', checkout: '02 Jul 2026', source: 'Website', status: 'Confirmed', amount: '₹45,000' },
    { id: 'HBS-2026-005', guest: 'Suresh Patel', type: 'Deluxe Suite', checkin: '01 Jul 2026', checkout: '05 Jul 2026', source: 'Travel Agent', status: 'Upcoming', amount: '₹29,000' },
    { id: 'HBS-2026-006', guest: 'Kavya Reddy', type: 'Standard Room', checkin: '30 Jun 2026', checkout: '02 Jul 2026', source: 'Website', status: 'Cancelled', amount: '₹8,000' }
  ];

  const tblBody = document.querySelector('#tblReportBookings tbody');
  const btnApply = document.getElementById('btnApplyBookingFilters');
  const btnReset = document.getElementById('btnResetBookingFilters');
  const rangeSelect = document.getElementById('filterBookingRange');
  const branchSelect = document.getElementById('filterBookingBranch');
  const statusSelect = document.getElementById('filterBookingStatus');
  const sourceSelect = document.getElementById('filterBookingSource');

  // Render Table
  function renderBookingsTable() {
    tblBody.innerHTML = '';
    
    bookingsLog.forEach(b => {
      let statusBadgeClass = 'badge-cancelled';
      if (b.status === 'Staying') statusBadgeClass = 'badge-staying';
      else if (b.status === 'Upcoming' || b.status === 'Confirmed') statusBadgeClass = 'badge-upcoming';
      else if (b.status === 'Checked Out') statusBadgeClass = 'badge-checkout';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-dark small">${b.id}</strong></td>
        <td><span class="small text-dark fw-bold">${b.guest}</span></td>
        <td><span class="small text-secondary">${b.type}</span></td>
        <td class="small">${b.checkin}</td>
        <td class="small">${b.checkout}</td>
        <td><span class="small">${b.source}</span></td>
        <td><span class="badge ${statusBadgeClass}">${b.status}</span></td>
        <td class="text-end fw-bold small">${b.amount}</td>
      `;
      tblBody.appendChild(tr);
    });
  }

  // 1. Trend Line Chart setup
  const ctxTrend = document.getElementById('bookingTrendChart').getContext('2d');
  
  const purpleGradient = ctxTrend.createLinearGradient(0, 0, 0, 200);
  purpleGradient.addColorStop(0, 'rgba(26, 10, 46, 0.15)');
  purpleGradient.addColorStop(1, 'rgba(26, 10, 46, 0.01)');

  const trendChart = new Chart(ctxTrend, {
    type: 'line',
    data: {
      labels: ['1 Jun', '5 Jun', '10 Jun', '15 Jun', '20 Jun', '25 Jun', '29 Jun'],
      datasets: [
        {
          label: 'Bookings Count',
          data: [15, 24, 18, 32, 28, 42, 38],
          borderColor: '#1A0A2E',
          backgroundColor: purpleGradient,
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: '#D4AF37',
          pointBorderColor: '#1A0A2E',
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0,
          ticks: { font: { family: 'Outfit', size: 10 } },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        x: {
          ticks: { font: { family: 'Outfit', size: 10 } },
          grid: { display: false }
        }
      }
    }
  });

  // Daily, Weekly, Monthly Switchers
  document.getElementById('btnBkDaily').addEventListener('click', (e) => {
    toggleTrendActive(e.target);
    trendChart.data.labels = ['1 Jun', '5 Jun', '10 Jun', '15 Jun', '20 Jun', '25 Jun', '29 Jun'];
    trendChart.data.datasets[0].data = [15, 24, 18, 32, 28, 42, 38];
    trendChart.update();
  });

  document.getElementById('btnBkWeekly').addEventListener('click', (e) => {
    toggleTrendActive(e.target);
    trendChart.data.labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    trendChart.data.datasets[0].data = [78, 92, 110, 85];
    trendChart.update();
  });

  document.getElementById('btnBkMonthly').addEventListener('click', (e) => {
    toggleTrendActive(e.target);
    trendChart.data.labels = ['Apr 2026', 'May 2026', 'Jun 2026'];
    trendChart.data.datasets[0].data = [280, 310, 340];
    trendChart.update();
  });

  function toggleTrendActive(targetBtn) {
    document.querySelectorAll('.btn-group button').forEach(btn => btn.classList.remove('active'));
    targetBtn.classList.add('active');
  }

  // 2. Pie Chart Setup
  const ctxPie = document.getElementById('bookingSourcePieChart').getContext('2d');
  new Chart(ctxPie, {
    type: 'pie',
    data: {
      labels: ['Website', 'Walk-in', 'Phone', 'Corporate', 'Travel Agent'],
      datasets: [{
        data: [48, 24, 12, 10, 6],
        backgroundColor: [
          '#1A0A2E', // Purple
          '#D4AF37', // Gold
          '#2E7D32', // Green
          '#0D6EFD', // Blue
          '#8E8E93'  // Grey
        ],
        borderWidth: 1.5,
        borderColor: '#FAF8F4'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 10,
            font: { family: 'Outfit', size: 9 }
          }
        }
      }
    }
  });

  // Apply filters
  btnApply.addEventListener('click', () => {
    const range = rangeSelect.value;
    const branch = branchSelect.value;
    const status = statusSelect.value;
    const source = sourceSelect.value;

    alert(`Filtering booking database... range: ${range}, Branch: ${branch}, Status: ${status}, Source: ${source}`);
    
    // Change total bookings mock value depending on branch
    if (branch === 'Salem') {
      document.getElementById('kpiTotalBookings').textContent = '28 Bookings';
    } else {
      document.getElementById('kpiTotalBookings').textContent = '94 Bookings';
    }
    renderBookingsTable();
  });

  btnReset.addEventListener('click', () => {
    rangeSelect.value = 'this-month';
    branchSelect.value = 'all';
    statusSelect.value = 'all';
    sourceSelect.value = 'all';
    document.getElementById('kpiTotalBookings').textContent = '94 Bookings';
    renderBookingsTable();
  });

  // Export Report option triggers downloading
  document.querySelectorAll('.btn-export-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const format = btn.getAttribute('data-format');
      
      if (format === 'PDF') {
        // Trigger browser print to download current page layout as PDF
        window.print();
      } else {
        let content = '';
        let filename = '';
        let mimeType = '';
        
        if (format === 'TXT') {
          filename = 'Booking_Report_June_2026.txt';
          mimeType = 'text/plain;charset=utf-8;';
          content = "BOOKING REPORT - JUNE 2026\r\n=========================\r\n\r\n";
          bookingsLog.forEach(b => {
            content += `ID: ${b.id}\r\nGuest: ${b.guest}\r\nCategory: ${b.type}\r\nStay: ${b.checkin} to ${b.checkout}\r\nChannel: ${b.source}\r\nStatus: ${b.status}\r\nRevenue: ${b.amount}\r\n-------------------------\r\n`;
          });
        } else if (format === 'Word') {
          filename = 'Booking_Report_June_2026.doc';
          mimeType = 'application/msword';
          content = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><title>Booking Report</title><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style></head>
            <body>
              <h2>Booking Report - June 2026</h2>
              <table>
                <thead>
                  <tr>
                    <th>Booking ID</th><th>Guest Name</th><th>Room Category</th><th>Check-In</th><th>Check-Out</th><th>Source</th><th>Status</th><th>Amount</th>
                  </tr>
                </thead>
                <tbody>`;
          bookingsLog.forEach(b => {
            content += `<tr><td>${b.id}</td><td>${b.guest}</td><td>${b.type}</td><td>${b.checkin}</td><td>${b.checkout}</td><td>${b.source}</td><td>${b.status}</td><td>${b.amount}</td></tr>`;
          });
          content += `</tbody></table></body></html>`;
        } else {
          filename = 'Booking_Report_June_2026.xlsx';
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          // Generate a basic XML representation for Excel Spreadsheet data format
          content = `<?xml version="1.0"?><?mso-application myexcel?>
            <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:behavior" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
              <Worksheet ss:Name="Bookings Report">
                <Table>
                  <Row>
                    <Cell><Data ss:Type="String">Booking ID</Data></Cell>
                    <Cell><Data ss:Type="String">Guest Name</Data></Cell>
                    <Cell><Data ss:Type="String">Room Category</Data></Cell>
                    <Cell><Data ss:Type="String">Check-In</Data></Cell>
                    <Cell><Data ss:Type="String">Check-Out</Data></Cell>
                    <Cell><Data ss:Type="String">Source</Data></Cell>
                    <Cell><Data ss:Type="String">Status</Data></Cell>
                    <Cell><Data ss:Type="String">Amount</Data></Cell>
                  </Row>`;
          bookingsLog.forEach(b => {
            content += `
                  <Row>
                    <Cell><Data ss:Type="String">${b.id}</Data></Cell>
                    <Cell><Data ss:Type="String">${b.guest}</Data></Cell>
                    <Cell><Data ss:Type="String">${b.type}</Data></Cell>
                    <Cell><Data ss:Type="String">${b.checkin}</Data></Cell>
                    <Cell><Data ss:Type="String">${b.checkout}</Data></Cell>
                    <Cell><Data ss:Type="String">${b.source}</Data></Cell>
                    <Cell><Data ss:Type="String">${b.status}</Data></Cell>
                    <Cell><Data ss:Type="String">${b.amount}</Data></Cell>
                  </Row>`;
          });
          content += `
                </Table>
              </Worksheet>
            </Workbook>`;
        }
        
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  });

  // Initial table render
  renderBookingsTable();
});
