const { useState, useEffect } = React;

// 1. BANCO DE DADOS LOCAL (localStorage)
const SITES_KEY = 'autolog_sites';
const CLIENTS_KEY = 'autolog_clients';

const defaultSites = [
  { id: '1', name: 'VU Player', url: 'https://vuplayer.com', description: 'Ativação Web Player' },
  { id: '2', name: 'IBO Player', url: 'https://iboplayer.com', description: 'Ativação Smart TV' },
  { id: '3', name: 'Clouddy', url: 'https://clouddy.online', description: 'Painel Multi-dispositivo' }
];

const defaultClients = [
  { id: '1', name: 'Carlos Silva', siteId: '1', username: 'carlos_vu', password: 'password123', expiryDate: '2026-08-25', status: 'EM USO' },
  { id: '2', name: 'Ana Souza', siteId: '2', username: 'ana_ibo', password: 'password123', expiryDate: '2026-08-29', status: 'EM USO' },
  { id: '3', name: 'Marcos Lima', siteId: '1', username: 'marcos_vu', password: 'password123', expiryDate: '2026-09-02', status: 'EM USO' },
  { id: '4', name: 'Fernanda Costa', siteId: '3', username: 'fer_cloud', password: 'password123', expiryDate: '2026-09-15', status: 'LIVRE' }
];

const getStoredData = (key, fallback) => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(stored);
};

// 2. COMPONENTE PRINCIPAL (APP)
function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sites, setSites] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modais
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [deleteClientModal, setDeleteClientModal] = useState(null);
  const [deleteSiteModal, setDeleteSiteModal] = useState(null);

  useEffect(() => {
    setSites(getStoredData(SITES_KEY, defaultSites));
    setClients(getStoredData(CLIENTS_KEY, defaultClients));
  }, []);

  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  // Salvar alterações
  const saveClientsData = (data) => {
    setClients(data);
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(data));
  };

  const saveSitesData = (data) => {
    setSites(data);
    localStorage.setItem(SITES_KEY, JSON.stringify(data));
  };

  // Handlers Clientes
  const handleSaveClient = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const clientData = {
      id: editingClient ? editingClient.id : Date.now().toString(),
      name: formData.get('name'),
      siteId: formData.get('siteId'),
      username: formData.get('username'),
      password: formData.get('password'),
      expiryDate: formData.get('expiryDate'),
      status: formData.get('status')
    };

    let updated = editingClient 
      ? clients.map(c => c.id === clientData.id ? clientData : c)
      : [...clients, clientData];

    saveClientsData(updated);
    setClientModalOpen(false);
    setEditingClient(null);
  };

  const handleDeleteClient = () => {
    const updated = clients.filter(c => c.id !== deleteClientModal);
    saveClientsData(updated);
    setDeleteClientModal(null);
  };

  // Handlers Sites
  const handleSaveSite = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const siteData = {
      id: editingSite ? editingSite.id : Date.now().toString(),
      name: formData.get('name'),
      url: formData.get('url'),
      description: formData.get('description')
    };

    let updated = editingSite 
      ? sites.map(s => s.id === siteData.id ? siteData : s)
      : [...sites, siteData];

    saveSitesData(updated);
    setSiteModalOpen(false);
    setEditingSite(null);
  };

  const handleDeleteSite = () => {
    const updated = sites.filter(s => s.id !== deleteSiteModal.id);
    saveSitesData(updated);
    setDeleteSiteModal(null);
  };

  // Cálculos KPIs
  const today = new Date();
  today.setHours(0,0,0,0);

  const totalClients = clients.length;
  const livresCount = clients.filter(c => c.status === 'LIVRE').length;
  const emUsoCount = clients.filter(c => c.status === 'EM USO').length;
  
  const vencidosCount = clients.filter(c => {
    const d = new Date(c.expiryDate);
    d.setHours(0,0,0,0);
    return d < today;
  }).length;

  const ate7Count = clients.filter(c => {
    const d = new Date(c.expiryDate);
    d.setHours(0,0,0,0);
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  }).length;

  const attentionClients = clients.filter(c => {
    const d = new Date(c.expiryDate);
    d.setHours(0,0,0,0);
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    return diff <= 7;
  });

  const filteredClients = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.username.toLowerCase().includes(search.toLowerCase());
    const matchSite = siteFilter ? c.siteId === siteFilter : true;
    const matchStatus = statusFilter ? c.status === statusFilter : true;
    return matchSearch && matchSite && matchStatus;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111827] border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
            <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
              <i data-lucide="shield-check" className="w-6 h-6 text-blue-500"></i>
            </div>
            <span className="font-bold text-lg text-white">AUTOLOG <span className="text-blue-500">APPS</span></span>
          </div>
          <nav className="p-4 space-y-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
              { id: 'clients', label: 'Clientes', icon: 'users' },
              { id: 'sites', label: 'Sites Personalizados', icon: 'globe' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  currentTab === item.id 
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <i data-lucide={item.icon} className="w-5 h-5"></i>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          AUTOLOG APPS v2.0
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6">
        
        {/* DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Bem-vindo ao AUTOLOG APPS 👋</h1>
              <p className="text-sm text-slate-400 mt-1">Resumo completo dos seus clientes e vencimentos.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { title: 'TOTAL CLIENTES', count: totalClients, icon: 'users', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { title: 'CLIENTES LIVRES', count: livresCount, icon: 'user-check', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { title: 'CLIENTES EM USO', count: emUsoCount, icon: 'activity', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { title: 'CLIENTES VENCIDOS', count: vencidosCount, icon: 'alert-triangle', color: 'text-red-400', bg: 'bg-red-500/10' },
                { title: 'VENCEM EM 7 DIAS', count: ate7Count, icon: 'clock', color: 'text-amber-400', bg: 'bg-amber-500/10' }
              ].map((kpi, idx) => (
                <div key={idx} className="relative group bg-[#111827] border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-all cursor-pointer">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.title}</span>
                    <div className={`p-2 rounded-xl ${kpi.bg}`}>
                      <i data-lucide={kpi.icon} className={`w-4 h-4 ${kpi.color}`}></i>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-slate-500">Passe o mouse</div>
                  {/* Tooltip Hover */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity text-center z-20">
                    <div className="text-2xl font-bold text-white">{kpi.count}</div>
                    <div className="text-xs text-slate-400">Total registrado</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela Atenção */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 font-bold text-sm text-white flex items-center gap-2">
                <i data-lucide="alert-circle" className="w-4 h-4 text-amber-500"></i>
                CLIENTES QUE PRECISAM DE ATENÇÃO
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/50 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-6">Cliente</th>
                    <th className="py-3.5 px-6">Site</th>
                    <th className="py-3.5 px-6">Validade</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                    <th className="py-3.5 px-6 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {attentionClients.map(c => {
                    const site = sites.find(s => s.id === c.siteId);
                    const d = new Date(c.expiryDate);
                    d.setHours(0,0,0,0);
                    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
                    const isVencido = diff < 0;

                    return (
                      <tr key={c.id} className="hover:bg-slate-800/30">
                        <td className="py-4 px-6 font-medium text-white">{c.name}</td>
                        <td className="py-4 px-6">{site ? site.name : 'N/A'}</td>
                        <td className="py-4 px-6">{new Date(c.expiryDate).toLocaleDateString('pt-BR')}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.status === 'LIVRE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${isVencido ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {isVencido ? 'VENCIDO' : `${diff} DIAS`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CLIENTES */}
        {currentTab === 'clients' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">Clientes</h1>
              <button onClick={() => { setEditingClient(null); setClientModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
                <i data-lucide="plus" className="w-4 h-4"></i> Novo Cliente
              </button>
            </div>

            {/* Tabela de Clientes */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/50 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-6">Nome</th>
                    <th className="py-3.5 px-6">Site</th>
                    <th className="py-3.5 px-6">Login</th>
                    <th className="py-3.5 px-6">Senha</th>
                    <th className="py-3.5 px-6">Validade</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                    <th className="py-3.5 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {filteredClients.map(c => (
                    <tr key={c.id} className="hover:bg-slate-800/30">
                      <td className="py-4 px-6 font-medium text-white">{c.name}</td>
                      <td className="py-4 px-6">{sites.find(s => s.id === c.siteId)?.name || 'N/A'}</td>
                      <td className="py-4 px-6 font-mono">{c.username}</td>
                      <td className="py-4 px-6 font-mono">••••••••</td>
                      <td className="py-4 px-6">{new Date(c.expiryDate).toLocaleDateString('pt-BR')}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.status === 'LIVRE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button onClick={() => { setEditingClient(c); setClientModalOpen(true); }} className="text-slate-400 hover:text-blue-400">
                          <i data-lucide="edit" className="w-4 h-4"></i>
                        </button>
                        <button onClick={() => setDeleteClientModal(c.id)} className="text-slate-400 hover:text-red-400">
                          <i data-lucide="trash-2" className="w-4 h-4"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SITES */}
        {currentTab === 'sites' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">Sites Personalizados</h1>
              <button onClick={() => { setEditingSite(null); setSiteModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
                <i data-lucide="plus" className="w-4 h-4"></i> Adicionar Site
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sites.map(s => (
                <div key={s.id} className="bg-[#111827] border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-white">{s.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{s.url || 'Sem URL'}</p>
                    <p className="text-xs text-slate-400 mt-2">{s.description || 'Sem descrição.'}</p>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button onClick={() => { setEditingSite(s); setSiteModalOpen(true); }} className="text-slate-400 hover:text-blue-400">
                      <i data-lucide="edit" className="w-4 h-4"></i>
                    </button>
                    <button onClick={() => setDeleteSiteModal(s)} className="text-slate-400 hover:text-red-400">
                      <i data-lucide="trash-2" className="w-4 h-4"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* MODAL CLIENTE */}
      {clientModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveClient} className="bg-[#111827] border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
            <h3 className="font-bold text-white">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            <input required name="name" defaultValue={editingClient?.name} placeholder="Nome completo" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white" />
            <select name="siteId" defaultValue={editingClient?.siteId || sites[0]?.id} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white">
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input required name="username" defaultValue={editingClient?.username} placeholder="Usuário" className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white" />
              <input required name="password" type="password" defaultValue={editingClient?.password} placeholder="Senha" className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input required name="expiryDate" type="date" defaultValue={editingClient?.expiryDate} className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white" />
              <select name="status" defaultValue={editingClient?.status || 'EM USO'} className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white">
                <option value="EM USO">EM USO</option>
                <option value="LIVRE">LIVRE</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setClientModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL SITE */}
      {siteModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveSite} className="bg-[#111827] border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
            <h3 className="font-bold text-white">{editingSite ? 'Editar Site' : 'Novo Site'}</h3>
            <input required name="name" defaultValue={editingSite?.name} placeholder="Nome do Site" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white" />
            <input name="url" defaultValue={editingSite?.url} placeholder="URL (Opcional)" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white" />
            <textarea name="description" defaultValue={editingSite?.description} placeholder="Descrição" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white h-20" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSiteModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL EXCLUIR CLIENTE */}
      {deleteClientModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-slate-800 p-6 rounded-2xl max-w-sm w-full space-y-4">
            <h3 className="font-bold text-white">Excluir cliente?</h3>
            <p className="text-xs text-slate-400">Tem certeza que deseja excluir este cliente?</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteClientModal(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancelar</button>
              <button onClick={handleDeleteClient} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR SITE */}
      {deleteSiteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-slate-800 p-6 rounded-2xl max-w-sm w-full space-y-4">
            <h3 className="font-bold text-white">Excluir site?</h3>
            <p className="text-xs text-slate-400">Tem certeza que deseja excluir o site "{deleteSiteModal.name}"?</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteSiteModal(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancelar</button>
              <button onClick={handleDeleteSite} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs">Excluir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);