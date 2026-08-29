let clients = JSON.parse(localStorage.getItem('autolog_clients')) || [];
const API_URL = "http://127.0.0.1:5000";

// ================= 1. VERIFICAÇÃO DE LOGIN =================
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('inputPassword').value;
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (res.ok) {
            sessionStorage.setItem('authenticated', 'true');
            document.getElementById('loginOverlay').style.display = 'none';
        } else {
            alert('Senha incorreta!');
        }
    } catch (err) {
        alert('Erro ao conectar com o servidor Python!');
    }
});

// Verifica se já está autenticado na sessão atual
if (sessionStorage.getItem('authenticated') === 'true') {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) overlay.style.display = 'none';
}

function logout() {
    sessionStorage.removeItem('authenticated');
    location.reload();
}

// ================= 2. GESTÃO DE CLIENTES =================
document.getElementById('clientForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const newClient = {
        id: Date.now(),
        name: document.getElementById('name').value,
        site: document.getElementById('site').value,
        mac: document.getElementById('mac').value,
        key: document.getElementById('key').value,
        expiration: document.getElementById('expiration').value
    };
    clients.push(newClient);
    saveData();
    document.getElementById('clientForm').reset();
});

function saveData() {
    localStorage.setItem('autolog_clients', JSON.stringify(clients));
    renderTable();
    
    // Backup Automático no Servidor Python (Salva no arquivo local backup_database.json)
    fetch(`${API_URL}/api/backup/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clients)
    }).catch(err => console.error("Backup remoto falhou", err));
}

function deleteClient(id) {
    if (confirm("Deseja remover este cliente?")) {
        clients = clients.filter(c => c.id !== id);
        saveData();
    }
}

// ================= 3. DISPARAR AUTOMAÇÃO SELENIUM =================
async function runAutoLogin(id) {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    try {
        const res = await fetch(`${API_URL}/auto-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(client)
        });
        const data = await res.json();
        alert(data.message);
    } catch (err) {
        alert("Erro ao executar automação no backend Python.");
    }
}

// ================= 4. CÁLCULO DE VENCIMENTOS E TABELA =================
function renderTable() {
    const tbody = document.getElementById('clientTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let vencidos = 0, alertas = 0, ativos = 0;
    const today = new Date();
    today.setHours(0,0,0,0);

    clients.forEach(c => {
        const expDate = new Date(c.expiration + 'T00:00:00');
        const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        
        let statusBadge = '';
        if (diffDays < 0) {
            statusBadge = `<span class="badge badge-vencido">Vencido</span>`;
            vencidos++;
        } else if (diffDays <= 3) {
            statusBadge = `<span class="badge badge-alerta">A Vencer (${diffDays}d)</span>`;
            alertas++;
        } else {
            statusBadge = `<span class="badge badge-ativo">Ativo</span>`;
            ativos++;
        }

        tbody.innerHTML += `
            <tr>
                <td>${statusBadge}</td>
                <td class="fw-bold">${c.name}</td>
                <td><span class="badge bg-secondary">${c.site}</span></td>
                <td><code>${c.mac}</code></td>
                <td><code>${c.key}</code></td>
                <td>${c.expiration.split('-').reverse().join('/')}</td>
                <td class="text-end">
                    <button class="btn btn-success btn-sm me-1" onclick="runAutoLogin(${c.id})"><i class="fa-solid fa-play"></i> Logar</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteClient(${c.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    if (document.getElementById('countVencidos')) document.getElementById('countVencidos').innerText = vencidos;
    if (document.getElementById('countAlerta')) document.getElementById('countAlerta').innerText = alertas;
    if (document.getElementById('countAtivos')) document.getElementById('countAtivos').innerText = ativos;
}

// ================= 5. BACKUP MANUAL (DOWNLOAD / UPLOAD JSON) =================
function exportBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clients, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", `autolog_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
}

function importBackup(e) {
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
        try {
            clients = JSON.parse(event.target.result);
            saveData();
            alert("Backup restaurado com sucesso!");
        } catch (err) {
            alert("Arquivo de backup inválido.");
        }
    };
    fileReader.readAsText(e.target.files[0]);
}

// Renderiza a tabela ao carregar o script
renderTable();
