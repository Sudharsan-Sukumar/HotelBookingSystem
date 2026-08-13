(function () {
  const statusBox = document.getElementById('statusBox');

  function renderStatus(html) {
    if (statusBox) statusBox.innerHTML = html;
  }

  function writeResult(reference, result) {
    localStorage.setItem(`hbs_rzp_result_${reference}`, JSON.stringify(result));
  }

  const params = new URLSearchParams(window.location.search);
  const reference = params.get('ref');

  if (!reference) {
    renderStatus('<h2 class="failure">Missing payment reference.</h2><p>Please close this tab and try again.</p>');
    return;
  }

  const rawOrder = localStorage.getItem(`hbs_rzp_order_${reference}`);
  if (!rawOrder) {
    renderStatus('<h2 class="failure">Could not find order details.</h2><p>Please close this tab and try again.</p>');
    return;
  }

  const order = JSON.parse(rawOrder);
  const apiBase = order.apiBase || 'http://localhost:5031';

  const rzpOptions = {
    key: order.keyId,
    order_id: order.orderId,
    amount: order.amountPaise,
    currency: order.currency,
    name: order.name,
    description: order.description,
    prefill: {
      name: order.prefillName,
      email: order.prefillEmail,
      contact: order.prefillContact
    },
    theme: { color: '#1A0A2E' },
    handler: async function (response) {
      renderStatus('<div class="spinner"></div><h2>Verifying payment…</h2><p>Please don\'t close this tab.</p>');

      try {
        const verifyResp = await fetch(`${apiBase}/api/razorpay/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          })
        });

        if (!verifyResp.ok) {
          const err = await verifyResp.json().catch(() => ({}));
          throw new Error(err.message || 'Payment verification failed.');
        }

        const status = await verifyResp.json();
        writeResult(reference, { status: 'paid', orderId: status.razorpayOrderId, paymentId: status.razorpayPaymentId });

        renderStatus('<div class="status-icon success">&#10004;</div><h2 class="success">Payment Successful</h2><p>You can close this tab and return to your booking.</p>');
        setTimeout(() => window.close(), 2500);
      } catch (err) {
        writeResult(reference, { status: 'failed', reason: err.message });
        renderStatus(`<div class="status-icon failure">&#10008;</div><h2 class="failure">Verification Failed</h2><p>${err.message}</p>`);
      }
    },
    modal: {
      ondismiss: function () {
        writeResult(reference, { status: 'cancelled' });
        renderStatus('<h2>Payment Cancelled</h2><p>You can close this tab and try again.</p>');
      }
    }
  };

  const rzp = new Razorpay(rzpOptions);

  rzp.on('payment.failed', function (response) {
    const reason = response.error && response.error.description ? response.error.description : 'Payment was declined.';
    writeResult(reference, { status: 'failed', reason });
    renderStatus(`<div class="status-icon failure">&#10008;</div><h2 class="failure">Payment Failed</h2><p>${reason}</p>`);
  });

  renderStatus('<div class="spinner"></div><h2>Opening Razorpay Checkout…</h2><p>Please don\'t close this tab.</p>');
  rzp.open();
})();
