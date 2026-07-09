const fs = require('fs');
const path = require('path');

const dashPath = path.join(__dirname, 'dashboard.html');
let content = fs.readFileSync(dashPath, 'utf8');

// The replacement for the main row
const newRowContent = `    <div class="row g-4 text-start">
      <!-- Left Column: Registrations -->
      <div class="col-lg-6">
        <!-- New Registrations -->
        <div class="card border bg-white shadow-sm p-3 h-100" style="border-radius: 16px;">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="m-0 font-serif fw-bold text-dark"><i class="bi bi-person-plus me-2 text-purple"></i>New Registrations (Today)</h5>
            <button class="btn btn-outline-purple btn-sm" onclick="location.href='users.html'">View All</button>
          </div>
          <div class="table-responsive">
            <table class="table align-middle text-start manager-premium-table small mb-0">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>CUST-3284 - Ravi P.</strong></td>
                  <td>Customer</td>
                  <td>10:20 AM</td>
                  <td><span class="badge bg-success bg-opacity-10 text-success">Active</span></td>
                </tr>
                <tr>
                  <td><strong>MGR-013 - Suresh K.</strong></td>
                  <td>Manager</td>
                  <td>09:15 AM</td>
                  <td><span class="badge bg-warning bg-opacity-10 text-warning text-dark">Pending</span></td>
                </tr>
                <tr>
                  <td><strong>CUST-3285 - Gita R.</strong></td>
                  <td>Customer</td>
                  <td>08:45 AM</td>
                  <td><span class="badge bg-success bg-opacity-10 text-success">Active</span></td>
                </tr>
                <tr>
                  <td><strong>MGR-014 - Priya S.</strong></td>
                  <td>Manager</td>
                  <td>08:30 AM</td>
                  <td><span class="badge bg-success bg-opacity-10 text-success">Active</span></td>
                </tr>
                <tr>
                  <td><strong>CUST-3286 - Karthik M.</strong></td>
                  <td>Customer</td>
                  <td>08:10 AM</td>
                  <td><span class="badge bg-warning bg-opacity-10 text-warning text-dark">Pending</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right Column: Booking Stats -->
      <div class="col-lg-6">
        <!-- Booking Statistics - Today -->
        <div class="card border bg-white shadow-sm p-3 h-100" style="border-radius: 16px;">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="m-0 font-serif fw-bold text-dark"><i class="bi bi-graph-up-arrow me-2 text-purple"></i>Booking Statistics - Today</h5>
            <button class="btn btn-outline-purple btn-sm" onclick="location.href='booking_monitoring.html'">View Report</button>
          </div>
          <div class="table-responsive">
            <table class="table align-middle text-start manager-premium-table small mb-0">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Bookings</th>
                  <th>Check-ins</th>
                  <th>Check-outs</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Salem Main</td>
                  <td>28</td>
                  <td>8</td>
                  <td>6</td>
                  <td>Rs. 1.4L</td>
                </tr>
                <tr>
                  <td>Coimbatore</td>
                  <td>19</td>
                  <td>5</td>
                  <td>4</td>
                  <td>Rs. 0.9L</td>
                </tr>
                <tr>
                  <td>Chennai Central</td>
                  <td>24</td>
                  <td>7</td>
                  <td>5</td>
                  <td>Rs. 1.3L</td>
                </tr>
                <tr class="table-light fw-bold" style="background-color: #FFF9E6;">
                  <td>Total</td>
                  <td>71</td>
                  <td>20</td>
                  <td>15</td>
                  <td>Rs. 3.6L</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;

// Replace the row
const rowStart = content.indexOf('<div class="row g-4 text-start">');
// Find the end of the container div that wraps the row by looking for the JS Dependencies tag
const endOfRow = content.indexOf('</div>\n  </div>\n\n  <!-- JS Dependencies -->');

if(rowStart !== -1 && endOfRow !== -1) {
    content = content.substring(0, rowStart) + newRowContent + content.substring(endOfRow);
}

// Remove audit logs from the inline script rendering logic
const auditScript = `
        const tbodyAudit = document.querySelector('.table-responsive tbody');
        if (tbodyAudit && window.location.pathname.includes('dashboard.html')) {
          const logs = AuditLogs.getLogs().slice(0, 5); // top 5
          tbodyAudit.innerHTML = '';
          logs.forEach(log => {
            let icon = 'bi-info-circle-fill text-info';
            if (log.action.includes('approved')) icon = 'bi-check-circle-fill text-success';
            if (log.action.includes('added') || log.action.includes('registered')) icon = 'bi-person-plus-fill text-primary';
            if (log.action.includes('updated')) icon = 'bi-pencil-square text-warning';
            if (log.action.includes('Backup')) icon = 'bi-cloud-check-fill text-success';

            tbodyAudit.innerHTML += \`
              <div class="d-flex justify-content-between align-items-start gap-2 border-bottom pb-2">
                <div class="d-flex gap-2">
                  <div style="font-size: 1.1rem;"><i class="bi \${icon}"></i></div>
                  <div>
                    <strong class="d-block text-dark small" style="font-size: 0.8rem !important;">\${log.action}</strong>
                    <span class="text-muted small" style="font-size: 0.7rem !important;">\${log.details}</span>
                  </div>
                </div>
                <span class="text-muted small" style="font-size: 0.7rem !important; white-space: nowrap;">\${new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            \`;
          });
        }
`;

content = content.replace(auditScript, '');

fs.writeFileSync(dashPath, content, 'utf8');
console.log('Dashboard updated successfully!');
