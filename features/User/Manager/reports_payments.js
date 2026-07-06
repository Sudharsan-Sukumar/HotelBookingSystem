document.addEventListener('DOMContentLoaded', () => {
  // 1. Mock Database representing Payment Transactions ledger
  let paymentsLedger = [
    { txId: 'TXN-09876', bookingId: 'HBS-2026-001', guest: 'Rajesh Kumar', base: 20000, method: 'Credit Card', coupon: 'WELCOME10', wallet: 500, tax: 3510, final: 23010, status: 'Success' },
    { txId: 'TXN-09877', bookingId: 'HBS-2026-002', guest: 'Priya Sharma', base: 25000, method: 'UPI', coupon: 'None', wallet: 0, tax: 2500, final: 27500, status: 'Success' },
    { txId: 'TXN-09878', bookingId: 'HBS-2026-003', guest: 'Arun Menon', base: 11000, method: 'Credit Card', coupon: 'None', wallet: 0, tax: 1000, final: 12000, status: 'Success' },
    { txId: 'TXN-09879', bookingId: 'HBS-2026-004', guest: 'Meena Varma', base: 41000, method: 'UPI', coupon: 'WELCOME10', wallet: 0, tax: 4000, final: 45000, status: 'Success' },
    { txId: 'TXN-09880', bookingId: 'HBS-2026-005', guest: 'Suresh Patel', base: 26000, method: 'Wallet', coupon: 'None', wallet: 5000, tax: 3000, final: 29000, status: 'Pending' },
    { txId: 'TXN-09881', bookingId: 'HBS-2026-006', guest: 'Kavya Reddy', base: 7500, method: 'Net Banking', coupon: 'None', wallet: 0, tax: 500, final: 8000, status: 'Failed' }
  ];

  const tblBody = document.querySelector('#tblReportPayments tbody');
  const btnApply = document.getElementById('btnApplyPaymentFilters');
  const btnReset = document.getElementById('btnResetPaymentFilters');
  const branchSelect = document.getElementById('filterPaymentBranch');
  const methodSelect = document.getElementById('filterPaymentMethod');
  const statusSelect = document.getElementById('filterPaymentStatus');

  // Render Table
  function renderReportTable() {
    tblBody.innerHTML = '';
    
    paymentsLedger.forEach(p => {
      let statusBadgeClass = 'badge-cancelled';
      if (p.status === 'Success') statusBadgeClass = 'badge-staying';
      else if (p.status === 'Pending') statusBadgeClass = 'badge-upcoming';
      else if (p.status === 'Failed') statusBadgeClass = 'badge-blacklisted';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-dark small">${p.txId}</strong></td>
        <td><span class="small text-secondary">${p.bookingId}</span></td>
        <td><span class="small text-dark fw-bold">${p.guest}</span></td>
        <td class="text-end small">₹${p.base.toLocaleString('en-IN')}</td>
        <td><span class="small">${p.method}</span></td>
        <td class="text-center small">${p.coupon}</td>
        <td class="text-end small">₹${p.wallet.toLocaleString('en-IN')}</td>
        <td class="text-end small">₹${p.tax.toLocaleString('en-IN')}</td>
        <td class="text-end fw-bold small">₹${p.final.toLocaleString('en-IN')}</td>
        <td class="text-center"><span class="badge ${statusBadgeClass}">${p.status}</span></td>
      `;
      tblBody.appendChild(tr);
    });
  }

  // 1. Line Chart Setup (Daily collections)
  const ctxAcq = document.getElementById('paymentTrendChart').getContext('2d');
  
  const purpleGradient = ctxAcq.createLinearGradient(0, 0, 0, 200);
  purpleGradient.addColorStop(0, 'rgba(26, 10, 46, 0.15)');
  purpleGradient.addColorStop(1, 'rgba(26, 10, 46, 0.01)');

  const trendChart = new Chart(ctxAcq, {
    type: 'line',
    data: {
      labels: ['1 Jun', '5 Jun', '10 Jun', '15 Jun', '20 Jun', '25 Jun', '29 Jun'],
      datasets: [
        {
          label: 'Collections (Rs)',
          data: [35000, 48000, 26000, 54000, 68000, 92000, 84000],
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
          ticks: {
            callback: function(value) { return '₹' + (value/1000) + 'K'; },
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

  // Daily, Weekly, Monthly Switchers
  document.getElementById('btnPayDaily').addEventListener('click', (e) => {
    toggleTrendActive(e.target);
    trendChart.data.labels = ['1 Jun', '5 Jun', '10 Jun', '15 Jun', '20 Jun', '25 Jun', '29 Jun'];
    trendChart.data.datasets[0].data = [35000, 48000, 26000, 54000, 68000, 92000, 84000];
    trendChart.update();
  });

  document.getElementById('btnPayWeekly').addEventListener('click', (e) => {
    toggleTrendActive(e.target);
    trendChart.data.labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    trendChart.data.datasets[0].data = [120000, 145000, 180000, 110000];
    trendChart.update();
  });

  document.getElementById('btnPayMonthly').addEventListener('click', (e) => {
    toggleTrendActive(e.target);
    trendChart.data.labels = ['Apr 2026', 'May 2026', 'Jun 2026'];
    trendChart.data.datasets[0].data = [380000, 410000, 444500];
    trendChart.update();
  });

  function toggleTrendActive(targetBtn) {
    document.querySelectorAll('.btn-group button').forEach(btn => btn.classList.remove('active'));
    targetBtn.classList.add('active');
  }

  // 2. Pie Chart Setup (Payment Methods)
  const ctxPie = document.getElementById('paymentMethodPieChart').getContext('2d');
  new Chart(ctxPie, {
    type: 'pie',
    data: {
      labels: ['Credit Card', 'UPI', 'Wallet', 'Cash'],
      datasets: [{
        data: [42, 38, 12, 8],
        backgroundColor: [
          '#1A0A2E', // Purple
          '#D4AF37', // Gold
          '#2E7D32', // Green
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
    const branch = branchSelect.value;
    const method = methodSelect.value;
    const status = statusSelect.value;

    alert(`Filtering payments transactions... Branch: ${branch}, Method: ${method}, Status: ${status}`);
    
    // Change total transactions mockup depending on branch
    if (branch === 'Salem') {
      document.getElementById('kpiTotalTrans').textContent = '40';
      document.getElementById('kpiNetColl').textContent = '₹1,24,000';
    } else {
      document.getElementById('kpiTotalTrans').textContent = '142';
      document.getElementById('kpiNetColl').textContent = '₹4,44,500';
    }
    renderReportTable();
  });

  btnReset.addEventListener('click', () => {
    branchSelect.value = 'all';
    methodSelect.value = 'all';
    statusSelect.value = 'all';
    document.getElementById('kpiTotalTrans').textContent = '142';
    document.getElementById('kpiNetColl').textContent = '₹4,44,500';
    renderReportTable();
  });

  // Export options triggers downloading
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
          filename = 'Payment_Report_June_2026.txt';
          mimeType = 'text/plain;charset=utf-8;';
          content = "PAYMENT TRANSACTIONS REPORT - JUNE 2026\r\n========================================\r\n\r\n";
          paymentsLog.forEach(p => {
            content += `Transaction ID: ${p.id}\r\nGuest: ${p.guest}\r\nBranch: ${p.branch}\r\nMethod: ${p.method}\r\nStatus: ${p.status}\r\nAmount: ${p.amount}\r\nDate: ${p.date}\r\n----------------------------------------\r\n`;
          });
        } else if (format === 'Word') {
          filename = 'Payment_Report_June_2026.doc';
          mimeType = 'application/msword';
          content = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><title>Payment Report</title><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style></head>
            <body>
              <h2>Payment Transactions Report - June 2026</h2>
              <table>
                <thead>
                  <tr>
                    <th>Transaction ID</th><th>Guest Name</th><th>Branch Location</th><th>Payment Method</th><th>Status</th><th>Amount</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>`;
          paymentsLog.forEach(p => {
            content += `<tr><td>${p.id}</td><td>${p.guest}</td><td>${p.branch}</td><td>${p.method}</td><td>${p.status}</td><td>${p.amount}</td><td>${p.date}</td></tr>`;
          });
          content += `</tbody></table></body></html>`;
        } else {
          filename = 'Payment_Report_June_2026.xlsx';
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          content = `<?xml version="1.0"?><?mso-application myexcel?>
            <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:behavior" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
              <Worksheet ss:Name="Payments Ledger">
                <Table>
                  <Row>
                    <Cell><Data ss:Type="String">Transaction ID</Data></Cell>
                    <Cell><Data ss:Type="String">Guest Name</Data></Cell>
                    <Cell><Data ss:Type="String">Branch Location</Data></Cell>
                    <Cell><Data ss:Type="String">Payment Method</Data></Cell>
                    <Cell><Data ss:Type="String">Status</Data></Cell>
                    <Cell><Data ss:Type="String">Amount</Data></Cell>
                    <Cell><Data ss:Type="String">Date</Data></Cell>
                  </Row>`;
          paymentsLog.forEach(p => {
            content += `
                  <Row>
                    <Cell><Data ss:Type="String">${p.id}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.guest}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.branch}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.method}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.status}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.amount}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.date}</Data></Cell>
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
  renderReportTable();
});
