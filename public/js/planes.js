// ============================================
// VYNK — Planes Client Logic (Pure Event Listeners)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('token')) {
    window.location.href = '/';
    return;
  }

  const user = typeof getUser === 'function' ? getUser() : null;
  if (user && (user.plan === 'paid' || user.isPro)) {
    const freeBtn = document.getElementById('btn-free-plan');
    const proBtn = document.getElementById('btn-pro-plan');
    if (freeBtn) {
      freeBtn.textContent = 'Plan Básico';
    }
    if (proBtn) {
      proBtn.textContent = '★ Tu plan Pro Activo';
      proBtn.className = 'btn btn-outline';
      proBtn.style.background = 'rgba(16, 185, 129, 0.2)';
      proBtn.style.borderColor = '#10B981';
      proBtn.style.color = '#10B981';
    }
  }

  // Event Delegation for Planes
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.getAttribute('data-action');
    if (action === 'goto-dashboard') {
      window.location.href = '/dashboard.html';
    } else if (action === 'buy-pro') {
      if (typeof buyProduct === 'function') {
        buyProduct('plan_pro', 'Plan VYNK Pro', 149, 'subscription', target);
      } else {
        openPaymentModal();
      }
    } else if (action === 'close-payment') {
      closePaymentModal();
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target && e.target.name === 'planTipo') {
      updatePaymentDetails();
    }
  });

  const paymentForm = document.getElementById('paymentForm');
  if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const checkedPlan = document.querySelector('input[name="planTipo"]:checked');
      const plan = checkedPlan ? checkedPlan.value : 'mensual';
      const url = document.getElementById('comprobanteUrl').value;
      const btn = document.getElementById('btnSubmitPayment');

      try {
        if (btn) { btn.textContent = 'Enviando...'; btn.disabled = true; }

        const res = await api('/api/pagos/solicitar', {
          method: 'POST',
          body: JSON.stringify({
            plan: plan,
            comprobante_url: url
          })
        });

        if (res.ok) {
          alert('Tu pago será verificado en las próximas 24 horas. Recibirás confirmación por WhatsApp.');
          closePaymentModal();
          window.location.href = '/dashboard.html';
        } else {
          alert('Error: ' + (res.error || 'No se pudo enviar'));
        }
      } catch (err) {
        alert('Error de conexión');
      } finally {
        if (btn) { btn.textContent = 'Enviar Comprobante'; btn.disabled = false; }
      }
    });
  }
});

function openPaymentModal() {
  const user = typeof getUser === 'function' ? getUser() : null;
  if (user) {
    const concepto = document.getElementById('conceptoPago');
    if (concepto) concepto.textContent = `VYNK-PRO-${user.telefono}`;
  }
  const modal = document.getElementById('paymentModal');
  if (modal) modal.classList.add('active');
}

function closePaymentModal() {
  const modal = document.getElementById('paymentModal');
  if (modal) modal.classList.remove('active');
}

function updatePaymentDetails() {
  const isAnual = document.getElementById('planAnual') && document.getElementById('planAnual').checked;
  const monto = document.getElementById('montoPago');
  if (monto) monto.textContent = isAnual ? '$1,499.00 MXN' : '$149.00 MXN';
}
