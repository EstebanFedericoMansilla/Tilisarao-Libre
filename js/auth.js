// ============================================================================
//  Tilisarao Libre - registro e ingreso (Supabase Auth)
// ============================================================================

import { sb, isConfigured } from './supabase-client.js';

let mode = 'login';

function setMode(next) {
  mode = next;
  const isLogin = mode === 'login';

  document.getElementById('registerFields').style.display = isLogin ? 'none' : 'block';
  document.getElementById('submitLabel').innerHTML = isLogin
    ? '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión'
    : '<i class="fas fa-user-plus"></i> Crear Cuenta';
  document.getElementById('switchText').innerHTML = isLogin
    ? '¿No tenés cuenta? <a href="#" onclick="setMode(\'register\');return false;">Registrate</a>'
    : '¿Ya tenés cuenta? <a href="#" onclick="setMode(\'login\');return false;">Ingresá</a>';
  hideError();
}

function showError(text) {
  const box = document.getElementById('authError');
  box.textContent = text;
  box.style.display = 'block';
}

function hideError() {
  document.getElementById('authError').style.display = 'none';
}

function showInfo(text) {
  const box = document.getElementById('authInfo');
  box.textContent = text;
  box.style.display = 'block';
}

async function submitAuth(event) {
  event.preventDefault();
  hideError();

  if (!isConfigured) {
    return showError('Falta configurar Supabase: editá js/supabase-client.js');
  }

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const nick = document.getElementById('nick').value.trim();

  if (!email || !password) return showError('Email y contraseña son obligatorios');

  const button = document.getElementById('submitButton');
  button.disabled = true;

  try {
    if (mode === 'login') {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = 'index.html';
    } else {
      if (!nick || nick.length < 3) return showError('El usuario debe tener al menos 3 caracteres');
      if (password.length < 6) return showError('La contraseña debe tener al menos 6 caracteres');

      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { nick } },
      });
      if (error) throw error;

      if (!data.session) {
        showInfo('Cuenta creada. Revisá tu email y hacé clic en el link de confirmación para entrar.');
        setMode('login');
        document.getElementById('email').value = email;
      } else {
        window.location.href = 'index.html';
      }
    }
  } catch (error) {
    console.error('Auth error:', error);
    const message = String(error.message || '');
    if (message.includes('Invalid login')) showError('Email o contraseña incorrectos.');
    else if (message.includes('already registered')) showError('Ese email ya está registrado.');
    else if (message.includes('rate limit')) showError('Demasiados intentos. Esperá un minuto.');
    else showError(message || 'No se pudo completar la operación.');
  } finally {
    button.disabled = false;
  }
}

// Contacto / WhatsApp (se mantiene igual que antes)
function openContactModal() {
  document.getElementById('contactModal').style.display = 'block';
}

function closeContactModal() {
  document.getElementById('contactModal').style.display = 'none';
}

function openWhatsApp() {
  const email = document.getElementById('email').value;
  const message = encodeURIComponent(
    `Hola! Necesito ayuda con mi cuenta de Tilisarao Libre.\n\nEmail: ${email}\n\n¡Gracias!`
  );
  window.open(`https://wa.me/542664024390?text=${message}`, '_blank');
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('authForm').addEventListener('submit', submitAuth);
  setMode('login');

  if (isConfigured) {
    const { data } = await sb.auth.getSession();
    if (data.session) window.location.href = 'index.html';
  }

  window.onclick = (event) => {
    const modal = document.getElementById('contactModal');
    if (event.target === modal) modal.style.display = 'none';
  };
});

window.setMode = setMode;
window.openContactModal = openContactModal;
window.closeContactModal = closeContactModal;
window.openWhatsApp = openWhatsApp;
