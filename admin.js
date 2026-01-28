document.addEventListener('DOMContentLoaded', () => {
  const statusField = document.getElementById('adminStatus');
  const container = document.getElementById('requestsContainer');
  const refreshButton = document.getElementById('refreshRequests');
  const logoutButton = document.getElementById('logoutButton');
  const client = window.FirebaseClient;
  let currentAdmin = null;
  const callable = client?.httpsCallable ? client.httpsCallable(client.functions, 'adminResetPassword') : null;

  const formatTimestamp = (value) => {
    if (!value) {
      return '-';
    }
    const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
    return date.toLocaleString('pt-BR');
  };

  const showStatus = (message) => {
    if (statusField) {
      statusField.textContent = message;
    }
  };

  const buildRequestCard = (doc) => {
    const data = doc.data();
    const card = document.createElement('article');
    card.className = 'request-card';

    const header = document.createElement('div');
    header.className = 'request-card__header';
    const idLabel = document.createElement('span');
    idLabel.className = 'request-card__id';
    idLabel.textContent = data.requestedId || '---';
    const when = document.createElement('span');
    when.textContent = formatTimestamp(data.createdAt);
    header.append(idLabel, when);
    card.appendChild(header);

    if (data.requestedByUid) {
      const meta = document.createElement('div');
      meta.className = 'request-card__meta';
      meta.textContent = `Solicitado por UID ${data.requestedByUid}`;
      card.appendChild(meta);
    }

    const note = document.createElement('div');
    note.className = 'request-card__note';
    note.textContent = data.note || 'Sem observação.';
    card.appendChild(note);

    const actions = document.createElement('div');
    actions.className = 'request-card__actions';

    const approveButton = document.createElement('button');
    approveButton.type = 'button';
    approveButton.textContent = 'Aprovar';
    approveButton.addEventListener('click', () => handleApprove(doc.id, approveButton));

    const rejectButton = document.createElement('button');
    rejectButton.type = 'button';
    rejectButton.className = 'ghost';
    rejectButton.textContent = 'Rejeitar';
    rejectButton.addEventListener('click', () => handleReject(doc.id, rejectButton));

    actions.append(approveButton, rejectButton);
    card.appendChild(actions);
    return card;
  };

  const handleApprove = async (requestId, button) => {
    if (!callable) {
      showStatus('Função de reset indisponível.');
      return;
    }
    button.disabled = true;
    try {
      await callable({ requestId });
      showStatus('Reset aprovado. Senha voltou para Oi@12345 e mustChangePassword=true.');
      await loadRequests();
    } catch (err) {
      showStatus(err?.message || 'Falha ao aprovar a solicitação.');
    } finally {
      button.disabled = false;
    }
  };

  const handleReject = async (requestId, button) => {
    const note = window.prompt('Motivo da rejeição (opcional):', '');
    if (note === null) {
      return;
    }
    button.disabled = true;
    try {
      const docRef = client.doc(client.db, 'password_reset_requests', requestId);
      await client.updateDoc(docRef, {
        status: 'rejected',
        adminUid: currentAdmin?.uid || null,
        adminAt: client.serverTimestamp(),
        adminNote: String(note || '').trim(),
      });
      showStatus('Solicitação rejeitada.');
      await loadRequests();
    } catch (err) {
      showStatus(err?.message || 'Falha ao rejeitar a solicitação.');
    } finally {
      button.disabled = false;
    }
  };

  const loadRequests = async () => {
    if (!client) {
      showStatus('Firebase não carregado.');
      return;
    }
    if (container) {
      container.innerHTML = '';
    }
    showStatus('Carregando solicitações pendentes...');
    try {
      const requestsQuery = client.query(
        client.collection(client.db, 'password_reset_requests'),
        client.where('status', '==', 'pending'),
        client.orderBy('createdAt', 'desc')
      );
      const snapshot = await client.getDocs(requestsQuery);
      if (!snapshot.size) {
        showStatus('Nenhuma solicitação pendente.');
        return;
      }
      snapshot.forEach((doc) => {
        const card = buildRequestCard(doc);
        container?.appendChild(card);
      });
      showStatus('');
    } catch (err) {
      showStatus(err?.message || 'Falha ao carregar solicitações.');
    }
  };

  refreshButton?.addEventListener('click', loadRequests);
  logoutButton?.addEventListener('click', (event) => {
    event.preventDefault();
    window.signOut();
  });

  if (!window.requireAuthOrRedirect) {
    showStatus('Autenticação indisponível.');
    return;
  }

  window.requireAuthOrRedirect({ requiredRole: 'admin' }).then((user) => {
    if (!user) {
      return;
    }
    currentAdmin = user;
    loadRequests();
  });
});
