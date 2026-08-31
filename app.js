const supabaseUrl = 'https://puhldzoazkgjzbhgeuvk.supabase.co';
const supabaseAnonKey = 'sb_publishable_LD8ntu_8_3mqWMkpgmAmXw_yzfHnQYl';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
const { useState, useEffect } = React;

function App() {
  const irParaCliente = (nomeCliente) => {
    setSelectedSiteFilter('ALL');
    setSearchTerm(nomeCliente);
    setActiveTab('clientes');
  };
  const formatDateBR = (dateStr) => {
  if (!dateStr) return 'N/A';
  // Se a data já estiver em YYYY-MM-DD
  const [year, month, day] = dateStr.split('-');
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }
  return dateStr;
};
  const [session, setSession] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  
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

  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('ALL');

  // ESTADO DE ORDENAÇÃO
  const [sortField, setSortField] = useState('name'); // 'name' ou 'expiry'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' ou 'desc'

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deleteClientModal, setDeleteClientModal] = useState(null);

  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [deleteSiteModal, setDeleteSiteModal] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const carregarClientes = async () => {
    setLoadingClients(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar clientes no Supabase:', error);
    } else if (data) {
      const mappedClients = data.map(item => ({
        id: item.id,
        name: item.nome || '',
        site: item.app || '',
        login: item.mac || '',
        senha: item.key || '',
        expiry: item.vencimento || '',
        url: item.url || ''
      }));
      setClients(mappedClients);
    }
    setLoadingClients(false);
  };

  useEffect(() => {
    if (session) {
      carregarClientes();
    }
  }, [session]);

  useEffect(() => {
    localStorage.setItem('autolog_sites_list', JSON.stringify(sites));
  }, [sites]);

  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [session, activeTab, clients, sites, clientModalOpen, siteModalOpen, selectedSiteFilter, searchTerm, sortField, sortDirection]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoadingLogin(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: passwordInput,
    });

    if (error) {
      setLoginError('E-mail ou senha incorretos!');
    } else {
      setEmailInput('');
      setPasswordInput('');
    }
    setLoadingLogin(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

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
    fileReader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.clients && Array.isArray(imported.clients)) {
          const formatted = imported.clients.map(c => ({
            nome: c.name || c.nome,
            app: c.site || c.app,
            mac: c.login || c.mac,
            key: c.senha || c.key,
            vencimento: c.expiry || c.vencimento
          }));

          const { error } = await supabase.from('clientes').insert(formatted);
          if (error) throw error;
          await carregarClientes();
        }
        if (imported.sites) setSites(imported.sites);
        alert("Backup restaurado e sincronizado com o Supabase!");
      } catch (err) {
        alert("Erro ao importar backup: " + err.message);
      }
    };
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0]);
    }
  };

  const dispararAutoLogin = async (cliente) => {
    const siteObj = sites.find(s => s.name === cliente.site);
    const siteUrl = siteObj ? siteObj.url : cliente.url || '';

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
      alert('A automação via robô só funciona no computador em que o script Python está sendo executado.');
    }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const dbPayload = {
      nome: formData.get('name') || '',
      app: formData.get('site') || (sites[0] ? sites[0].name : ''),
      mac: formData.get('login') || '',
      key: formData.get('senha') || '',
      vencimento: formData.get('expiry') || null
    };

    if (editingClient) {
      const { error } = await supabase
        .from('clientes')
        .update(dbPayload)
        .eq('id', editingClient.id);

      if (error) {
        alert('Erro ao atualizar no banco: ' + error.message);
      } else {
        await carregarClientes();
      }
    } else {
      const { error } = await supabase
        .from('clientes')
        .insert([dbPayload]);

      if (error) {
        alert('Erro ao salvar no banco: ' + error.message);
      } else {
        await carregarClientes();
      }
    }

    setClientModalOpen(false);
    setEditingClient(null);
  };

  const handleDeleteClient = async (id) => {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao deletar no Supabase: ' + error.message);
    } else {
      await carregarClientes();
    }
    setDeleteClientModal(null);
  };

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

  // FUNÇÃO DE ALTERNÂNCIA DE ORDENAÇÃO
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // FILTRAGEM E ORDENAÇÃO DINÂMICA
  const filteredClients = clients
    .filter(c => {
      const matchesSite = selectedSiteFilter === 'ALL' || c.site === selectedSiteFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(term) ||
                            c.login.toLowerCase().includes(term) ||
                            c.senha.toLowerCase().includes(term);
      return matchesSite && matchesSearch;
    })
    .sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (sortField === 'name') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090d16] p-4 font-sans">
        <div className="w-full max-w-md bg-[#0d1322] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <i data-lucide="shield-check" className="w-8 h-8"></i>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wider">AUTOLOG <span className="text-blue-500">APPS</span></h1>
            <p className="text-xs text-slate-400">Entre com suas credenciais para acessar o painel</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">E-mail</label>
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-[#111827] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-slate-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
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
              {loadingLogin ? 'Autenticando...' : 'Acessar Painel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#090d16] text-slate-100 font-sans antialiased overflow-hidden">
      
      {/* NAVEGAÇÃO DESKTOP */}
      <aside className="hidden md:flex md:w-64 bg-[#0d1322] border-r border-slate-800/60 flex-col justify-between shrink-0">
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

        <div className="p-4 border-t border-slate-800/40 space-y-1">
          <button 
            onClick={handleExportBackup} 
            className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800/40 hover:text-white rounded-xl transition-all"
          >
            <i data-lucide="download" className="w-4 h-4"></i>
            <span>Exportar Backup</span>
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
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* HEADER MOBILE */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0d1322] border-b border-slate-800/60 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600/20 p-1.5 rounded-lg border border-blue-500/30">
            <i data-lucide="shield-check" className="w-5 h-5 text-blue-400"></i>
          </div>
          <span className="font-bold text-base text-white">AUTOLOG <span className="text-blue-500">APPS</span></span>
        </div>
        <button onClick={handleLogout} className="text-rose-400 p-2">
          <i data-lucide="log-out" className="w-5 h-5"></i>
        </button>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
        
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h2>
              {loadingClients && <span className="text-xs text-blue-400 animate-pulse">Sincronizando...</span>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-slate-400">TOTAL</p>
                  <p className="text-xl sm:text-2xl font-bold text-white mt-1">{clients.length}</p>
                </div>
                <div className="p-2.5 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <i data-lucide="users" className="w-4 h-4 sm:w-5 sm:h-5"></i>
                </div>
              </div>

              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-slate-400">VENCIDOS</p>
                  <p className="text-xl sm:text-2xl font-bold text-rose-500 mt-1">{expiredClients.length}</p>
                </div>
                <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                  <i data-lucide="alert-octagon" className="w-4 h-4 sm:w-5 sm:h-5"></i>
                </div>
              </div>

              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-slate-400">VENCEM ≤ 3D</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">{expiringClients.length}</p>
                </div>
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <i data-lucide="alert-triangle" className="w-4 h-4 sm:w-5 sm:h-5"></i>
                </div>
              </div>

              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-slate-400">EM DIA</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">{activeClients.length}</p>
                </div>
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <i data-lucide="check-circle" className="w-4 h-4 sm:w-5 sm:h-5"></i>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CARD CLIENTES VENCIDOS */}
              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center space-x-2 text-rose-500">
                  <i data-lucide="alert-octagon" className="w-5 h-5"></i>
                  <h3 className="font-semibold text-base sm:text-lg text-white">Clientes Vencidos</h3>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {expiredClients.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">Nenhum cliente vencido.</p>
                  ) : (
                    expiredClients.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-[#111827] p-3 rounded-xl border border-slate-800">
                        <div className="overflow-hidden mr-2">
                          <p className="font-medium text-sm text-white truncate">{c.name}</p>
                          <p className="text-xs text-slate-400 truncate">{c.site} • {formatDateBR(c.expiry)}</p>
                        </div>
                        <button 
  onClick={() => irParaCliente(c.name)} 
  title="Ver na lista de clientes" 
  className="p-2 bg-slate-800 hover:bg-blue-600 rounded-lg text-slate-300 hover:text-white transition-all text-xs shrink-0 flex items-center justify-center"
>
  <i data-lucide="eye" className="w-4 h-4"></i>
</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* CARD VENCENDO NOS PRÓXIMOS 3 DIAS */}
              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center space-x-2 text-amber-400">
                  <i data-lucide="alert-triangle" className="w-5 h-5"></i>
                  <h3 className="font-semibold text-base sm:text-lg text-white">Vencendo nos Próximos 3 Dias</h3>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {expiringClients.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">Nenhum cliente a vencer nos próximos dias.</p>
                  ) : (
                    expiringClients.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-[#111827] p-3 rounded-xl border border-slate-800">
                        <div className="overflow-hidden mr-2">
                          <p className="font-medium text-sm text-white truncate">{c.name}</p>
                          <p className="text-xs text-slate-400 truncate">{c.site} • {formatDateBR(c.expiry)}</p>
                        </div>
                        <button 
                          onClick={() => irParaCliente(c.name)} 
                          title="Ver na lista de clientes" 
                          className="p-2 bg-slate-800 hover:bg-blue-600 rounded-lg text-slate-300 hover:text-white transition-all text-xs shrink-0 flex items-center justify-center"
                        >
                          ➡️
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
              <h2 className="text-xl sm:text-2xl font-bold text-white">Clientes</h2>
              <button 
                onClick={() => { setEditingClient(null); setClientModalOpen(true); }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 text-xs sm:text-sm shadow-lg shadow-blue-600/20"
              >
                <span>+ Novo Cliente</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Buscar nome, MAC ou senha..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
                <button
                  onClick={() => setSelectedSiteFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    selectedSiteFilter === 'ALL'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-[#0d1322] border-slate-800 text-slate-400'
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
                          : 'bg-[#0d1322] border-slate-800 text-slate-400'
                      }`}
                    >
                      {s.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl overflow-x-auto shadow-xl">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[600px]">
                <thead className="bg-[#111827] text-slate-400 font-semibold border-b border-slate-800/60 select-none">
                  <tr>
                    {/* COLUNA NOME CLICÁVEL */}
                    <th 
                      onClick={() => handleSort('name')} 
                      className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Nome</span>
                        {sortField === 'name' && (
                          <span className="text-blue-400 font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>

                    <th className="py-3 px-4">Site</th>
                    <th className="py-3 px-4">Login / MAC</th>
                    <th className="py-3 px-4">Senha / Key</th>

                    {/* COLUNA VALIDADE CLICÁVEL */}
                    <th 
                      onClick={() => handleSort('expiry')} 
                      className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Validade</span>
                        {sortField === 'expiry' && (
                          <span className="text-blue-400 font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>

                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">
                        {loadingClients ? 'Carregando...' : 'Nenhum cliente encontrado.'}
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map(c => {
                      const expInfo = getClientExpirationInfo(c.expiry);
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-3 px-4 font-medium text-white">{c.name}</td>
                          <td className="py-3 px-4 text-slate-400">{c.site}</td>
                          <td className="py-3 px-4 font-mono text-[11px]">{c.login}</td>
                          <td className="py-3 px-4 font-mono text-[11px]">{c.senha}</td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{formatDateBR(c.expiry)}</td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {expInfo.status === 'VENCIDO' && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">VENCIDO</span>
                            )}
                            {expInfo.status === 'A_VENCER' && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">A VENCER</span>
                            )}
                            {expInfo.status === 'ATIVO' && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ATIVO</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                            <button onClick={() => dispararAutoLogin(c)} title="Automação" className="text-slate-400 hover:text-amber-400 p-1">⚡</button>
                            <button onClick={() => { setEditingClient(c); setClientModalOpen(true); }} className="text-slate-400 hover:text-blue-400 p-1">✏️</button>
                            <button onClick={() => setDeleteClientModal(c.id)} className="text-slate-400 hover:text-rose-400 p-1">🗑️</button>
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

        {/* SITES */}
        {activeTab === 'sites' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Sites Cadastrados</h2>
              <button 
                onClick={() => { setEditingSite(null); setSiteModalOpen(true); }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 text-xs sm:text-sm shadow-lg shadow-blue-600/20"
              >
                <span>+ Adicionar Site</span>
              </button>
            </div>

            <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl overflow-x-auto shadow-xl">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[500px]">
                <thead className="bg-[#111827] text-slate-400 font-semibold border-b border-slate-800/60">
                  <tr>
                    <th className="py-3 px-4">Nome do Aplicativo</th>
                    <th className="py-3 px-4">URL de Login</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {sites.map(s => (
                    <tr key={s.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{s.name}</td>
                      <td className="py-3 px-4 font-mono text-blue-400 truncate max-w-[200px]">{s.url}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                        <button onClick={() => { setEditingSite(s); setSiteModalOpen(true); }} className="text-slate-400 hover:text-blue-400 p-1">✏️</button>
                        <button onClick={() => setDeleteSiteModal(s.id)} className="text-slate-400 hover:text-rose-400 p-1">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* NAVEGAÇÃO MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0d1322] border-t border-slate-800/80 flex justify-around p-2 z-40">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`flex flex-col items-center py-1 px-3 rounded-xl ${activeTab === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400'}`}
        >
          <i data-lucide="layout-dashboard" className="w-5 h-5"></i>
          <span className="text-[10px] mt-1">Dashboard</span>
        </button>

        <button 
          onClick={() => setActiveTab('clientes')} 
          className={`flex flex-col items-center py-1 px-3 rounded-xl ${activeTab === 'clientes' ? 'text-blue-400 font-bold' : 'text-slate-400'}`}
        >
          <i data-lucide="users" className="w-5 h-5"></i>
          <span className="text-[10px] mt-1">Clientes</span>
        </button>

        <button 
          onClick={() => setActiveTab('sites')} 
          className={`flex flex-col items-center py-1 px-3 rounded-xl ${activeTab === 'sites' ? 'text-blue-400 font-bold' : 'text-slate-400'}`}
        >
          <i data-lucide="globe" className="w-5 h-5"></i>
          <span className="text-[10px] mt-1">Sites</span>
        </button>
      </nav>

      {/* MODAL DE CLIENTES */}
      {clientModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            <form onSubmit={handleSaveClient} className="space-y-3">
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
              <div>
                <label className="block text-xs text-slate-400 mb-1">Validade</label>
                <input type="date" name="expiry" defaultValue={editingClient ? editingClient.expiry : ''} required className="w-full bg-[#111827] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button type="button" onClick={() => { setClientModalOpen(false); setEditingClient(null); }} className="px-4 py-2 rounded-xl text-xs text-slate-400">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-xs">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SITES */}
      {siteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">{editingSite ? 'Editar Site' : 'Novo Site'}</h3>
            <form onSubmit={handleSaveSite} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome do Aplicativo</label>
                <input name="name" defaultValue={editingSite ? editingSite.name : ''} required className="w-full bg-[#111827] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">URL da Página de Login</label>
                <input name="url" defaultValue={editingSite ? editingSite.url : ''} required className="w-full bg-[#111827] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button type="button" onClick={() => { setSiteModalOpen(false); setEditingSite(null); }} className="px-4 py-2 rounded-xl text-xs text-slate-400">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-xs">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR CLIENTE */}
      {deleteClientModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl w-full max-w-xs p-5 space-y-3 text-center">
            <h3 className="text-base font-bold text-white">Excluir cliente?</h3>
            <div className="flex justify-center space-x-2 pt-2">
              <button onClick={() => setDeleteClientModal(null)} className="px-3 py-1.5 rounded-xl text-xs text-slate-400">Cancelar</button>
              <button onClick={() => handleDeleteClient(deleteClientModal)} className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-3 py-1.5 rounded-xl text-xs">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR SITE */}
      {deleteSiteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl w-full max-w-xs p-5 space-y-3 text-center">
            <h3 className="text-base font-bold text-white">Excluir site?</h3>
            <div className="flex justify-center space-x-2 pt-2">
              <button onClick={() => setDeleteSiteModal(null)} className="px-3 py-1.5 rounded-xl text-xs text-slate-400">Cancelar</button>
              <button onClick={() => handleDeleteSite(deleteSiteModal)} className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-3 py-1.5 rounded-xl text-xs">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
