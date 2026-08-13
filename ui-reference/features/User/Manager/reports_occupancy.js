document.addEventListener('DOMContentLoaded', () => {
  // 1. Mock Data representing occupancy rates by room type
  let reportData = [
    { type: 'Standard Room', total: 10, occupied: 7, avail: 3, rate: 70, rev: 73500 },
    { type: 'Executive Studio', total: 6, occupied: 5, avail: 1, rate: 83, rev: 82500 },
    { type: 'Deluxe Suite', total: 8, occupied: 6, avail: 2, rate: 75, rev: 144000 },
    { type: 'Penthouse Suite', total: 4, occupied: 2, avail: 2, rate: 50, rev: 108000 }
  ];

  const tblBody = document.querySelector('#tblReportOccupancy tbody');
  const btnApply = document.getElementById('btnApplyReportFilters');
  const btnReset = document.getElementById('btnResetReportFilters');
  const rangeSelect = document.getElementById('filterReportRange');
  const roomTypeSelect = document.getElementById('filterReportRoomType');
  const branchSelect = document.getElementById('filterReportBranch');

  let currentSortCol = '';
  let sortAscending = true;

  // Render Table
  function renderReportTable() {
    tblBody.innerHTML = '';
    
    // Sort logic if active
    if (currentSortCol) {
      reportData.sort((a, b) => {
        let valA = a[currentSortCol];
        let valB = b[currentSortCol];
        
        if (typeof valA === 'string') {
          return sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
          return sortAscending ? valA - valB : valB - valA;
        }
      });
    }

    reportData.forEach(r => {
      // Configure Status Badges
      let rateBadgeClass = 'badge-low';
      let statusText = 'Low';
      if (r.rate >= 85) {
        rateBadgeClass = 'badge-excellent';
        statusText = 'Excellent';
      } else if (r.rate >= 70) {
        rateBadgeClass = 'badge-good';
        statusText = 'Good';
      } else if (r.rate >= 50) {
        rateBadgeClass = 'badge-average';
        statusText = 'Average';
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-dark small">${r.type}</strong></td>
        <td class="text-center small">${r.total}</td>
        <td class="text-center small">${r.occupied}</td>
        <td class="text-center small">${r.avail}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="progress" style="width: 80px; height: 6px;">
              <div class="progress-bar" role="progressbar" style="width: ${r.rate}%; background-color: #D4AF37;" aria-valuenow="${r.rate}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <span class="small fw-bold text-dark">${r.rate}%</span>
            <span class="badge ${rateBadgeClass}" style="font-size: 0.65rem;">${statusText}</span>
          </div>
        </td>
        <td class="text-end fw-bold small">₹${r.rev.toLocaleString('en-IN')}</td>
      `;
      tblBody.appendChild(tr);
    });
  }

  // Bind Table Sort headers
  document.querySelectorAll('.table-sort-header').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.getAttribute('data-sort');
      
      const aliasMap = {
        'type': 'type',
        'rooms': 'total',
        'occupied': 'occupied',
        'avail': 'avail',
        'rate': 'rate',
        'rev': 'rev'
      };

      const sortField = aliasMap[field];
      if (currentSortCol === sortField) {
        sortAscending = !sortAscending;
      } else {
        currentSortCol = sortField;
        sortAscending = true;
      }
      renderReportTable();
    });
  });

  // Chart setup
  const ctx = document.getElementById('occupancyTrendChart').getContext('2d');
  
  // Custom Gradient builder
  const purpleGradient = ctx.createLinearGradient(0, 0, 0, 300);
  purpleGradient.addColorStop(0, 'rgba(26, 10, 46, 0.2)');
  purpleGradient.addColorStop(1, 'rgba(26, 10, 46, 0.01)');

  const trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['1 Jun', '5 Jun', '10 Jun', '15 Jun', '20 Jun', '25 Jun', '29 Jun'],
      datasets: [
        {
          label: 'This Month',
          data: [60, 58, 88, 76, 92, 85, 74],
          borderColor: '#1A0A2E',
          backgroundColor: purpleGradient,
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: '#D4AF37',
          pointBorderColor: '#1A0A2E',
          pointRadius: 4
        },
        {
          label: 'Last Month',
          data: [42, 40, 68, 48, 62, 60, 58],
          borderColor: '#D4AF37',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.3,
          borderWidth: 1.5,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { family: 'Outfit', size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Occupancy: ${context.parsed.y}%`;
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            callback: function(value) { return value + '%'; },
            font: { family: 'Outfit', size: 10 }
          },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        x: {
          ticks: { font: { family: 'Outfit', size: 10 } },
          grid: { display: false }
        }
      }
    }
  });

  // Trend chart switchers
  document.getElementById('btnTrendDaily').addEventListener('click', (e) => {
    toggleTrendActive(e.target);
    trendChart.data.labels = ['1 Jun', '5 Jun', '10 Jun', '15 Jun', '20 Jun', '25 Jun', '29 Jun'];
    trendChart.data.datasets[0].data = [60, 58, 88, 76, 92, 85, 74];
    trendChart.data.datasets[1].data = [42, 40, 68, 48, 62, 60, 58];
    trendChart.update();
  });

  document.getElementById('btnTrendWeekly').addEventListener('click', (e) => {
    toggleTrendActive(e.target);
    trendChart.data.labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    trendChart.data.datasets[0].data = [65, 78, 85, 74];
    trendChart.data.datasets[1].data = [48, 55, 60, 58];
    trendChart.update();
  });

  document.getElementById('btnTrendMonthly').addEventListener('click', (e) => {
    toggleTrendActive(e.target);
    trendChart.data.labels = ['Apr 2026', 'May 2026', 'Jun 2026'];
    trendChart.data.datasets[0].data = [70, 72, 74];
    trendChart.data.datasets[1].data = [62, 65, 68];
    trendChart.update();
  });

  function toggleTrendActive(targetBtn) {
    document.querySelectorAll('.btn-group button').forEach(btn => btn.classList.remove('active'));
    targetBtn.classList.add('active');
  }

  // Apply filters triggers updates
  btnApply.addEventListener('click', () => {
    const selectedRange = rangeSelect.value;
    const selectedType = roomTypeSelect.value;
    const selectedBranch = branchSelect.value;

    // Recalculate summary metrics based on filters
    if (selectedType !== 'all') {
      const match = reportData.find(item => item.type === selectedType);
      if (match) {
        document.getElementById('kpiAvgOccupancy').textContent = `${match.rate}%`;
        document.getElementById('kpiAvailableNights').textContent = match.avail * 30;
      }
    } else {
      document.getElementById('kpiAvgOccupancy').textContent = '74%';
      document.getElementById('kpiAvailableNights').textContent = '126';
    }

    alert('Filtering occupancy database parameters... Updating tables and charts.');
    renderReportTable();
  });

  btnReset.addEventListener('click', () => {
    rangeSelect.value = 'this-month';
    roomTypeSelect.value = 'all';
    branchSelect.value = 'all';
    document.getElementById('kpiAvgOccupancy').textContent = '74%';
    document.getElementById('kpiAvailableNights').textContent = '126';
    renderReportTable();
  });

  // Export buttons binding trigger
  document.querySelectorAll('.btn-export-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const format = btn.getAttribute('data-format');
      
      if (format === 'PDF') {
        window.print();
      } else {
        let content = '';
        let filename = '';
        let mimeType = '';
        
        if (format === 'TXT') {
          filename = 'Occupancy_Report_June_2026.txt';
          mimeType = 'text/plain;charset=utf-8;';
          content = "OCCUPANCY PERFORMANCE REPORT - JUNE 2026\r\n========================================\r\n\r\n";
          reportData.forEach(r => {
            content += `Category: ${r.type}\r\nTotal Rooms: ${r.total}\r\nOccupied: ${r.occupied}\r\nAvailable: ${r.avail}\r\nOccupancy Rate: ${r.rate}%\r\nRevenue Contribution: ₹${r.rev.toLocaleString()}\r\n----------------------------------------\r\n`;
          });
        } else if (format === 'Word') {
          filename = 'Occupancy_Report_June_2026.doc';
          mimeType = 'application/msword';
          content = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><title>Occupancy Report</title><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style></head>
            <body>
              <h2>Occupancy Performance Report - June 2026</h2>
              <table>
                <thead>
                  <tr>
                    <th>Room Category</th><th>Total Rooms</th><th>Occupied Rooms</th><th>Available Rooms</th><th>Occupancy Rate</th><th>Revenue Contribution</th>
                  </tr>
                </thead>
                <tbody>`;
          reportData.forEach(r => {
            content += `<tr><td>${r.type}</td><td>${r.total}</td><td>${r.occupied}</td><td>${r.avail}</td><td>${r.rate}%</td><td>₹${r.rev.toLocaleString()}</td></tr>`;
          });
          content += `</tbody></table></body></html>`;
        } else {
          filename = 'Occupancy_Report_June_2026.xlsx';
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          content = `<?xml version="1.0"?><?mso-application myexcel?>
            <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:behavior" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
              <Worksheet ss:Name="Occupancy Report">
                <Table>
                  <Row>
                    <Cell><Data ss:Type="String">Room Category</Data></Cell>
                    <Cell><Data ss:Type="String">Total Rooms</Data></Cell>
                    <Cell><Data ss:Type="String">Occupied Rooms</Data></Cell>
                    <Cell><Data ss:Type="String">Available Rooms</Data></Cell>
                    <Cell><Data ss:Type="String">Occupancy Rate</Data></Cell>
                    <Cell><Data ss:Type="String">Revenue Contribution</Data></Cell>
                  </Row>`;
          reportData.forEach(r => {
            content += `
                  <Row>
                    <Cell><Data ss:Type="String">${r.type}</Data></Cell>
                    <Cell><Data ss:Type="String">${r.total}</Data></Cell>
                    <Cell><Data ss:Type="String">${r.occupied}</Data></Cell>
                    <Cell><Data ss:Type="String">${r.avail}</Data></Cell>
                    <Cell><Data ss:Type="String">${r.rate}%</Data></Cell>
                    <Cell><Data ss:Type="String">₹${r.rev.toLocaleString()}</Data></Cell>
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

  // Initial table load
  renderReportTable();
});
