const supabaseUrl = 'https://puhldzoazkgjzbhgeuvk.supabase.co';
const supabaseAnonKey = 'sb_publishable_LD8ntu_8_3mqWMkpgmAmXw_yzfHnQYl';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
const { useState, useEffect } = React;

function App() {
  // Autenticação
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem('autolog_auth') === 'true'
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Lista de sites cadastrados
  const [sites, setSites] = useState(() => {
    try {
      const saved = localStorage.getItem('autolog_sites_list');
      return saved ? JSON.parse(saved) : [
        { id: 1, name: 'VU Player', url: 'https://vuproplayer.com/login' },
        { id: 2, name: 'IBO Player Pro', url: 'https://iboplayerpro.com/login' },
        { id: 3, name: 'IBO Player', url: 'https://iboplayer.com/device/login' },
        { id: 4, name: 'BOB Player', url: 'https://bobplayer.com/login' },
        { id: 5, name: 'Quick Player', url: 'https://quickplayer.org/login' },
        { id: 6, name: 'Clouddy', url: 'https://clouddy.online/login' }
      ];
    } catch (e) {
      return [];
    }
  });

  // Lista de clientes
  const [clients, setClients] = useState(() => {
    try {
      const saved = localStorage.getItem('autolog_clients');
      return saved ? JSON.parse(saved) : [
        { id: 1, name: 'Carlos Silva', site: 'VU Player', login: 'carlos_vu', senha: '123456', expiry: '2026-08-20', status: 'EM USO' },
        { id: 2, name: 'Ana Souza', site: 'IBO Player', login: 'ana_ibo', senha: '123456', expiry: '2026-08-30', status: 'EM USO' }
      ];
    } catch (e) {
      return [];
    }
  });

  // Estados de busca e filtro por aplicativo
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('ALL');

  // Modais de Clientes
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deleteClientModal, setDeleteClientModal] = useState(null);

  // Modais de Sites
  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [deleteSiteModal, setDeleteSiteModal] = useState(null);

  useEffect(() => {
    localStorage.setItem('autolog_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('autolog_sites_list', JSON.stringify(sites));
  }, [sites]);

  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [isAuthenticated, activeTab, clients, sites, clientModalOpen, siteModalOpen, selectedSiteFilter, searchTerm]);

  // LOGIN VIA BACKEND PYTHON
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoadingLogin(true);

    try {
      const response = await fetch(`http://${window.location.hostname}:5000/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: passwordInput })
});

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        sessionStorage.setItem('autolog_auth', 'true');
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        setLoginError(data.message || 'Senha incorreta!');
      }
    } catch (err) {
      setLoginError('Não foi possível conectar ao backend local (app_backend.py).');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('autolog_auth');
    setIsAuthenticated(false);
  };

  // BACKUP
  const handleExportBackup = () => {
    const backupData = { sites, clients };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", `autolog_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleImportBackup = (e) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.clients) setClients(imported.clients);
        if (imported.sites) setSites(imported.sites);
        alert("Backup restaurado com sucesso!");
      } catch (err) {
        alert("Arquivo de backup inválido.");
      }
    };
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0]);
    }
  };

  // DISPARAR AUTOMAÇÃO PYTHON
  const dispararAutoLogin = async (cliente) => {
    const siteObj = sites.find(s => s.name === cliente.site);
    const siteUrl = siteObj ? siteObj.url : '';

    try {
      const response = await fetch('http://127.0.0.1:5000/auto-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: cliente.site,
          url: siteUrl,
          mac: cliente.login,
          key: cliente.senha
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        alert('Automação iniciada!');
      } else {
        alert('Erro na automação: ' + data.message);
      }
    } catch (err) {
      alert('Não foi possível conectar ao servidor local.\n\nVerifique se o "app_backend.py" está rodando no terminal.');
    }
  };

  // SALVAR / EXCLUIR CLIENTE
  const handleSaveClient = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const clientData = {
      id: editingClient ? editingClient.id : Date.now(),
      name: formData.get('name') || '',
      site: formData.get('site') || (sites[0] ? sites[0].name : ''),
      login: formData.get('login') || '',
      senha: formData.get('senha') || '',
      expiry: formData.get('expiry') || '',
      status: formData.get('status') || 'LIVRE'
    };

    if (editingClient) {
      setClients(clients.map(c => c.id === editingClient.id ? clientData : c));
    } else {
      setClients([...clients, clientData]);
    }
    setClientModalOpen(false);
    setEditingClient(null);
  };

  const handleDeleteClient = (id) => {
    setClients(clients.filter(c => c.id !== id));
    setDeleteClientModal(null);
  };

  // SALVAR / EXCLUIR SITE
  const handleSaveSite = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const siteData = {
      id: editingSite ? editingSite.id : Date.now(),
      name: formData.get('name') || '',
      url: formData.get('url') || ''
    };

    if (editingSite) {
      setSites(sites.map(s => s.id === editingSite.id ? siteData : s));
    } else {
      setSites([...sites, siteData]);
    }
    setSiteModalOpen(false);
    setEditingSite(null);
  };

  const handleDeleteSite = (id) => {
    setSites(sites.filter(s => s.id !== id));
    setDeleteSiteModal(null);
  };

  // LÓGICA DE DATAS E STATUS DO DASHBOARD
  const today = new Date();
  today.setHours(0,0,0,0);

  const getClientExpirationInfo = (expiryStr) => {
    if (!expiryStr) return { status: 'NORMAL', days: 999 };
    const expDate = new Date(expiryStr + 'T00:00:00');
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'VENCIDO', days: diffDays };
    if (diffDays <= 3) return { status: 'A_VENCER', days: diffDays };
    return { status: 'ATIVO', days: diffDays };
  };

  const expiredClients = clients.filter(c => getClientExpirationInfo(c.expiry).status === 'VENCIDO');
  const expiringClients = clients.filter(c => getClientExpirationInfo(c.expiry).status === 'A_VENCER');
  const activeClients = clients.filter(c => getClientExpirationInfo(c.expiry).status === 'ATIVO');

  // FILTRAGEM DE CLIENTES
  const filteredClients = clients.filter(c => {
    const matchesSite = selectedSiteFilter === 'ALL' || c.site === selectedSiteFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(term) ||
                          c.login.toLowerCase().includes(term) ||
                          c.senha.toLowerCase().includes(term);
    return matchesSite && matchesSearch;
  });

  // TELA DE LOGIN SE NÃO ESTIVER AUTENTICADO
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090d16] p-4 font-sans">
        <div className="w-full max-w-md bg-[#0d1322] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <i data-lucide="shield-check" className="w-8 h-8"></i>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wider">AUTOLOG <span className="text-blue-500">APPS</span></h1>
            <p className="text-xs text-slate-400">Digite a senha master para acessar o painel</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Senha de acesso"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-[#111827] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-slate-500"
                required
              />
            </div>
            {loginError && <p className="text-xs text-rose-500 text-center font-semibold">{loginError}</p>}
            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 text-sm"
            >
              {loadingLogin ? 'Verificando...' : 'Acessar Painel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 font-sans antialiased">
      {/* MENU LATERAL */}
      <aside className="w-64 bg-[#0d1322] border-r border-slate-800/60 flex flex-col justify-between">
        <div>
          <div className="p-6 flex items-center space-x-3 border-b border-slate-800/40">
            <div className="bg-blue-600/20 p-2 rounded-xl border border-blue-500/30">
              <i data-lucide="shield-check" className="w-6 h-6 text-blue-400"></i>
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wider text-white">AUTOLOG <span className="text-blue-500">APPS</span></h1>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
            >
              <i data-lucide="layout-dashboard" className="w-5 h-5"></i>
              <span>Dashboard</span>
            </button>

            <button 
              onClick={() => setActiveTab('clientes')} 
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'clientes' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
            >
              <i data-lucide="users" className="w-5 h-5"></i>
              <span>Clientes</span>
            </button>

            <button 
              onClick={() => setActiveTab('sites')} 
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'sites' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
            >
              <i data-lucide="globe" className="w-5 h-5"></i>
              <span>Gerenciar Sites</span>
            </button>
          </nav>
        </div>

        {/* OPÇÕES DE BACKUP E LOGOUT NO RODAPÉ */}
        <div className="p-4 border-t border-slate-800/40 space-y-1">
          <button 
            onClick={handleExportBackup} 
            className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800/40 hover:text-white rounded-xl transition-all"
          >
            <i data-lucide="download" className="w-4 h-4"></i>
            <span>Exportar Backup JSON</span>
          </button>

          <label className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800/40 hover:text-white rounded-xl transition-all cursor-pointer">
            <i data-lucide="upload" className="w-4 h-4"></i>
            <span>Importar Backup</span>
            <input type="file" onChange={handleImportBackup} className="hidden" accept=".json" />
          </label>

          <button 
            onClick={handleLogout} 
            className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all mt-2"
          >
            <i data-lucide="log-out" className="w-4 h-4"></i>
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* PAINEL PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Dashboard & Métricas</h2>

            {/* CARDS RESUMO */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">TOTAL CLIENTES</p>
                  <p className="text-2xl font-bold text-white mt-1">{clients.length}</p>
                </div>
                <div className="p-3 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <i data-lucide="users" className="w-5 h-5"></i>
                </div>
              </div>

              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">VENCIDOS</p>
                  <p className="text-2xl font-bold text-rose-500 mt-1">{expiredClients.length}</p>
                </div>
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                  <i data-lucide="alert-octagon" className="w-5 h-5"></i>
                </div>
              </div>

              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">VENCEM EM ≤ 3d</p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">{expiringClients.length}</p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <i data-lucide="alert-triangle" className="w-5 h-5"></i>
                </div>
              </div>

              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">EM DIA</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{activeClients.length}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <i data-lucide="check-circle" className="w-5 h-5"></i>
                </div>
              </div>
            </div>

            {/* TABELAS DE VENCIDOS E A VENCER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* CLIENTES VENCIDOS */}
              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-2 text-rose-500">
                  <i data-lucide="alert-octagon" className="w-5 h-5"></i>
                  <h3 className="font-semibold text-lg text-white">Clientes Vencidos</h3>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {expiredClients.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">Nenhum cliente vencido.</p>
                  ) : (
                    expiredClients.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-[#111827] p-3 rounded-xl border border-slate-800">
                        <div>
                          <p className="font-medium text-sm text-white">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.site} • Venceu em {c.expiry.split('-').reverse().join('/')}</p>
                        </div>
                        <button onClick={() => dispararAutoLogin(c)} title="Automação" className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-all text-xs">
                          ⚡ Logar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* CLIENTES A VENCER (<= 3 DIAS) */}
              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-2 text-amber-400">
                  <i data-lucide="alert-triangle" className="w-5 h-5"></i>
                  <h3 className="font-semibold text-lg text-white">Vencendo nos Próximos 3 Dias</h3>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {expiringClients.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">Nenhum cliente a vencer nos próximos dias.</p>
                  ) : (
                    expiringClients.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-[#111827] p-3 rounded-xl border border-slate-800">
                        <div>
                          <p className="font-medium text-sm text-white">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.site} • Vence em {c.expiry.split('-').reverse().join('/')}</p>
                        </div>
                        <button onClick={() => dispararAutoLogin(c)} title="Automação" className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-all text-xs">
                          ⚡ Logar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CLIENTES */}
        {activeTab === 'clientes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Clientes</h2>
              <button 
                onClick={() => { setEditingClient(null); setClientModalOpen(true); }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 text-sm shadow-lg shadow-blue-600/20"
              >
                <span>+ Novo Cliente</span>
              </button>
            </div>

            {/* BARRA DE PESQUISA E FILTROS DE SITES */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
                <button
                  onClick={() => setSelectedSiteFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    selectedSiteFilter === 'ALL'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-[#0d1322] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({clients.length})
                </button>
                {sites.map(s => {
                  const count = clients.filter(c => c.site === s.name).length;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSiteFilter(s.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                        selectedSiteFilter === s.name
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-[#0d1322] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.name} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="w-full md:w-64">
                <input
                  type="text"
                  placeholder="Buscar nome, MAC ou senha..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#111827] text-slate-400 font-semibold border-b border-slate-800/60">
                  <tr>
                    <th className="py-4 px-6">Nome</th>
                    <th className="py-4 px-6">Site</th>
                    <th className="py-4 px-6">Login / MAC</th>
                    <th className="py-4 px-6">Senha / Key</th>
                    <th className="py-4 px-6">Validade</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">
                        Nenhum cliente encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map(c => {
                      const expInfo = getClientExpirationInfo(c.expiry);
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-4 px-6 font-medium text-white">{c.name}</td>
                          <td className="py-4 px-6 text-slate-400">{c.site}</td>
                          <td className="py-4 px-6 font-mono text-xs">{c.login}</td>
                          <td className="py-4 px-6 font-mono text-xs">{c.senha}</td>
                          <td className="py-4 px-6 text-slate-400">{c.expiry}</td>
                          <td className="py-4 px-6 text-center">
                            {expInfo.status === 'VENCIDO' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">VENCIDO</span>
                            )}
                            {expInfo.status === 'A_VENCER' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">A VENCER</span>
                            )}
                            {expInfo.status === 'ATIVO' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ATIVO</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <button onClick={() => dispararAutoLogin(c)} title="Automação" className="text-slate-400 hover:text-amber-400 transition-colors p-1">⚡</button>
                            <button onClick={() => { setEditingClient(c); setClientModalOpen(true); }} className="text-slate-400 hover:text-blue-400 transition-colors p-1">✏️</button>
                            <button onClick={() => setDeleteClientModal(c.id)} className="text-slate-400 hover:text-rose-400 transition-colors p-1">🗑️</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GERENCIAR SITES */}
        {activeTab === 'sites' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Sites Cadastrados</h2>
              <button 
                onClick={() => { setEditingSite(null); setSiteModalOpen(true); }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 text-sm shadow-lg shadow-blue-600/20"
              >
                <span>+ Adicionar Site</span>
              </button>
            </div>

            <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#111827] text-slate-400 font-semibold border-b border-slate-800/60">
                  <tr>
                    <th className="py-4 px-6">Nome do Site / App</th>
                    <th className="py-4 px-6">URL de Login</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {sites.map(s => (
                    <tr key={s.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6 font-medium text-white">{s.name}</td>
                      <td className="py-4 px-6 font-mono text-xs text-blue-400">{s.url}</td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button onClick={() => { setEditingSite(s); setSiteModalOpen(true); }} className="text-slate-400 hover:text-blue-400 transition-colors p-1">✏️</button>
                        <button onClick={() => setDeleteSiteModal(s.id)} className="text-slate-400 hover:text-rose-400 transition-colors p-1">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAIS MANTIDOS */}
      {clientModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome</label>
                <input name="name" defaultValue={editingClient ? editingClient.name : ''} required className="w-full bg-[#111827] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Site</label>
                <select name="site" defaultValue={editingClient ? editingClient.site : (sites[0] ? sites[0].name : '')} className="w-full bg-[#111827] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Login / MAC</label>
                  <input name="login" defaultValue={editingClient ? editingClient.login : ''} required className="w-full bg-[#111827] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Senha / Key</label>
                  <input name="senha" defaultValue={editingClient ? editingClient.senha : ''} required className="w-full bg-[#111827] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Validade</label>
                  <input type="date" name="expiry" defaultValue={editingClient ? editingClient.expiry : ''} required className="w-full bg-[#111827] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Status</label>
                  <select name="status" defaultValue={editingClient ? editingClient.status : 'LIVRE'} className="w-full bg-[#111827] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value="LIVRE">LIVRE</option>
                    <option value="EM USO">EM USO</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setClientModalOpen(false); setEditingClient(null); }} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {siteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white">{editingSite ? 'Editar Site' : 'Novo Site'}</h3>
            <form onSubmit={handleSaveSite} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome do Aplicativo</label>
                <input name="name" defaultValue={editingSite ? editingSite.name : ''} placeholder="Ex: VU Player Pro" required className="w-full bg-[#111827] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">URL da Página de Login</label>
                <input name="url" defaultValue={editingSite ? editingSite.url : ''} placeholder="https://exemplo.com/login" required className="w-full bg-[#111827] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setSiteModalOpen(false); setEditingSite(null); }} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <h3 className="text-lg font-bold text-white">Excluir cliente?</h3>
            <p className="text-xs text-slate-400">Essa ação não pode ser desfeita.</p>
            <div className="flex justify-center space-x-3 pt-2">
              <button onClick={() => setDeleteClientModal(null)} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={() => handleDeleteClient(deleteClientModal)} className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2 rounded-xl text-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {deleteSiteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <h3 className="text-lg font-bold text-white">Excluir site?</h3>
            <p className="text-xs text-slate-400">Essa ação não pode ser desfeita.</p>
            <div className="flex justify-center space-x-3 pt-2">
              <button onClick={() => setDeleteSiteModal(null)} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={() => handleDeleteSite(deleteSiteModal)} className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2 rounded-xl text-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
