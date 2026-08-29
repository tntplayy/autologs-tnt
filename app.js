const { useState, useEffect } = React;
const API_URL = "http://127.0.0.1:5000";

const APPS_LIST = [
  "VU Player",
  "IBO Player",
  "IBO Player Pro",
  "BOB Player",
  "Quick Player",
  "Clouddy"
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem('authenticated') === 'true'
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [clients, setClients] = useState(() => {
    return JSON.parse(localStorage.getItem('autolog_clients')) || [];
  });
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAppFilter, setSelectedAppFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    site: 'VU Player',
    mac: '',
    key: '',
    expiration: ''
  });

  // Efeito para re-inicializar ícones Lucide
  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [isAuthenticated, activeTab, clients, selectedAppFilter]);

  // Sincronização e Backup Automático
  const saveData = (newClients) => {
    setClients(newClients);
    localStorage.setItem('autolog_clients', JSON.stringify(newClients));
    fetch(`${API_URL}/api/backup/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClients)
    }).catch(err => console.error("Falha ao salvar backup automático no backend", err));
  };

  // Autenticação
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      if (res.ok) {
        sessionStorage.setItem('authenticated', 'true');
        setIsAuthenticated(true);
      } else {
        setLoginError('Senha incorreta!');
      }
    } catch (err) {
      setLoginError('Servidor backend desconectado.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('authenticated');
    setIsAuthenticated(false);
  };

  // Cadastro de Clientes
  const handleSubmit = (e) => {
    e.preventDefault();
    const newClient = { ...formData, id: Date.now() };
    const updated = [...clients, newClient];
    saveData(updated);
    setFormData({ name: '', site: 'VU Player', mac: '', key: '', expiration: '' });
  };

  const handleDelete = (id) => {
    if (confirm("Deseja realmente remover este cliente?")) {
      const updated = clients.filter(c => c.id !== id);
      saveData(updated);
    }
  };

  // Disparo da Automação Selenium
  const handleAutoLogin = async (client) => {
    try {
      const res = await fetch(`${API_URL}/auto-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
      const data = await res.json();
      alert(data.message);
    } catch (err) {
      alert("Erro ao comunicar com o servidor de automação Python.");
    }
  };

  // Backup Manual
  const exportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clients, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", `autolog_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const importBackup = (e) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        saveData(imported);
        alert("Backup restaurado com sucesso!");
      } catch (err) {
        alert("Formato de arquivo inválido.");
      }
    };
    fileReader.readAsText(e.target.files[0]);
  };

  // Cálculos de Status dos Clientes
  const today = new Date();
  today.setHours(0,0,0,0);

  const getClientStatus = (expiration) => {
    const expDate = new Date(expiration + 'T00:00:00');
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { status: 'VENCIDO', color: 'bg-red-500/10 text-red-500 border-red-500/20', days: diffDays };
    if (diffDays <= 3) return { status: 'A VENCER', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', days: diffDays };
    return { status: 'ATIVO', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', days: diffDays };
  };

  const expiredClients = clients.filter(c => getClientStatus(c.expiration).status === 'VENCIDO');
  const expiringClients = clients.filter(c => getClientStatus(c.expiration).status === 'A VENCER');
  const activeClientsCount = clients.filter(c => getClientStatus(c.expiration).status === 'ATIVO').length;

  // Filtros da Tela de Clientes
  const filteredClients = clients.filter(c => {
    const matchesApp = selectedAppFilter === 'ALL' || c.site === selectedAppFilter;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.mac.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesApp && matchesSearch;
  });

  // TELA DE LOGIN
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0F19] p-4">
        <div className="w-full max-w-md bg-[#111827] border border-[#1F2937] rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20">
              <i data-lucide="shield-check" className="w-8 h-8"></i>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">AUTOLOG APPS</h1>
            <p className="text-sm text-slate-400 mt-1">Insira sua credencial master para acessar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Digite a senha master"
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            {loginError && <p className="text-xs text-red-400 text-center font-medium">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              Acessar Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // TELA PRINCIPAL DO PAINEL
  return (
    <div className="flex h-screen bg-[#0B0F19] text-slate-100">
      
      <!-- NAVEGAÇÃO LATERAL -->
      <aside className="w-64 border-r border-[#1F2937] bg-[#111827] flex flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <i data-lucide="bot" className="w-6 h-6"></i>
            </div>
            <span className="font-bold tracking-wider text-lg">AUTOLOG</span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-[#1F2937] hover:text-white'
              }`}
            >
              <i data-lucide="layout-dashboard" className="w-5 h-5"></i>
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'clients' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-[#1F2937] hover:text-white'
              }`}
            >
              <i data-lucide="users" className="w-5 h-5"></i>
              Clientes
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-[#1F2937] space-y-2">
          <button onClick={exportBackup} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-[#1F2937] hover:text-white rounded-lg transition-all">
            <i data-lucide="download" className="w-4 h-4"></i> Baixar Backup JSON
          </button>
          <label className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-[#1F2937] hover:text-white rounded-lg transition-all cursor-pointer">
            <i data-lucide="upload" className="w-4 h-4"></i> Importar Backup
            <input type="file" onChange={importBackup} className="hidden" accept=".json" />
          </label>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
            <i data-lucide="log-out" className="w-4 h-4"></i> Sair do Painel
          </button>
        </div>
      </aside>

      <!-- CONTEÚDO PRINCIPAL -->
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* VIEW: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold">Visão Geral</h1>
              <p className="text-sm text-slate-400 mt-1">Acompanhe métricas e os alertas de vencimento da sua base</p>
            </div>

            {/* CARDS DE RESUMO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">CLIENTES VENCIDOS</p>
                  <h3 className="text-3xl font-bold text-red-500 mt-1">{expiredClients.length}</h3>
                </div>
                <div className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
                  <i data-lucide="alert-octagon" className="w-6 h-6"></i>
                </div>
              </div>

              <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">VENCEM EM BREVE (≤ 3d)</p>
                  <h3 className="text-3xl font-bold text-amber-500 mt-1">{expiringClients.length}</h3>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                  <i data-lucide="alert-triangle" className="w-6 h-6"></i>
                </div>
              </div>

              <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">CLIENTES ATIVOS</p>
                  <h3 className="text-3xl font-bold text-emerald-500 mt-1">{activeClientsCount}</h3>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
                  <i data-lucide="check-circle" className="w-6 h-6"></i>
                </div>
              </div>
            </div>

            {/* PAINÉIS DE ATENÇÃO DA DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* LISTA: VENCIDOS */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4 text-red-500">
                  <i data-lucide="alert-octagon" className="w-5 h-5"></i>
                  <h3 className="font-semibold text-lg text-white">Clientes Vencidos</h3>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {expiredClients.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">Nenhum cliente vencido.</p>
                  ) : (
                    expiredClients.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-[#0B0F19] p-3 rounded-xl border border-[#1F2937]">
                        <div>
                          <p className="font-medium text-sm text-white">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.site} • Venceu dia {c.expiration.split('-').reverse().join('/')}</p>
                        </div>
                        <button onClick={() => handleAutoLogin(c)} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-all">
                          <i data-lucide="play" className="w-4 h-4"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* LISTA: PRESTES A VENCER */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4 text-amber-500">
                  <i data-lucide="alert-triangle" className="w-5 h-5"></i>
                  <h3 className="font-semibold text-lg text-white">Vencendo nos Próximos 3 Dias</h3>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {expiringClients.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">Nenhum cliente prestes a vencer.</p>
                  ) : (
                    expiringClients.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-[#0B0F19] p-3 rounded-xl border border-[#1F2937]">
                        <div>
                          <p className="font-medium text-sm text-white">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.site} • Vence dia {c.expiration.split('-').reverse().join('/')}</p>
                        </div>
                        <button onClick={() => handleAutoLogin(c)} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-all">
                          <i data-lucide="play" className="w-4 h-4"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW: CLIENTES */}
        {activeTab === 'clients' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold">Gestão de Clientes</h1>
              <p className="text-sm text-slate-400 mt-1">Cadastre, gerencie e execute automações de acesso</p>
            </div>

            {/* FORMULÁRIO DE CADASTRO */}
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <i data-lucide="user-plus" className="w-5 h-5 text-indigo-400"></i> Novo Cadastro
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Nome do Cliente"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <select
                    value={formData.site}
                    onChange={(e) => setFormData({...formData, site: e.target.value})}
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {APPS_LIST.map(app => <option key={app} value={app}>{app}</option>)}
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="MAC Address"
                    value={formData.mac}
                    onChange={(e) => setFormData({...formData, mac: e.target.value})}
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Key / Senha"
                    value={formData.key}
                    onChange={(e) => setFormData({...formData, key: e.target.value})}
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={formData.expiration}
                    onChange={(e) => setFormData({...formData, expiration: e.target.value})}
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="md:col-span-6 text-right">
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20">
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </div>

            {/* BARRAS DE FILTRO POR APLICATIVO */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* FILTRO INDIVIDUAL DE APPS */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                <button
                  onClick={() => setSelectedAppFilter('ALL')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                    selectedAppFilter === 'ALL'
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-[#111827] border-[#1F2937] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  Todos ({clients.length})
                </button>
                {APPS_LIST.map(app => {
                  const count = clients.filter(c => c.site === app).length;
                  return (
                    <button
                      key={app}
                      onClick={() => setSelectedAppFilter(app)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                        selectedAppFilter === app
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-[#111827] border-[#1F2937] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {app} ({count})
                    </button>
                  );
                })}
              </div>

              {/* BUSCA RÁPIDA */}
              <div className="w-full md:w-64">
                <input
                  type="text"
                  placeholder="Buscar nome ou MAC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* TABELA DE CLIENTES */}
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0B0F19] text-slate-400 border-b border-[#1F2937]">
                    <tr>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Cliente</th>
                      <th className="p-4 font-medium">Aplicativo</th>
                      <th className="p-4 font-medium">MAC</th>
                      <th className="p-4 font-medium">Key</th>
                      <th className="p-4 font-medium">Vencimento</th>
                      <th className="p-4 font-medium text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-500">
                          Nenhum cliente encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map(c => {
                        const statusInfo = getClientStatus(c.expiration);
                        return (
                          <tr key={c.id} className="hover:bg-[#1F2937]/50 transition-colors">
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.color}`}>
                                {statusInfo.status}
                              </span>
                            </td>
                            <td className="p-4 font-semibold text-white">{c.name}</td>
                            <td className="p-4">
                              <span className="bg-[#0B0F19] border border-[#1F2937] px-2.5 py-1 rounded-lg text-xs text-slate-300">
                                {c.site}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-xs text-slate-300">{c.mac}</td>
                            <td className="p-4 font-mono text-xs text-slate-300">{c.key}</td>
                            <td className="p-4 text-slate-300">{c.expiration.split('-').reverse().join('/')}</td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => handleAutoLogin(c)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-all"
                              >
                                <i data-lucide="play" className="w-3.5 h-3.5"></i> Logar
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/20 transition-all"
                              >
                                Excluir
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
