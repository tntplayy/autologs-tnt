const { useState, useEffect } = React;

function App() {
  const [activeTab, setActiveTab] = useState('clientes');
  const [clients, setClients] = useState(() => {
    try {
      const saved = localStorage.getItem('autolog_clients');
      return saved ? JSON.parse(saved) : [
        { id: 1, name: 'Carlos Silva', site: 'VU Player', login: 'carlos_vu', senha: '123456', expiry: '2026-08-24', status: 'EM USO' },
        { id: 2, name: 'Ana Souza', site: 'IBO Player', login: 'ana_ibo', senha: '123456', expiry: '2026-08-28', status: 'EM USO' }
      ];
    } catch (e) {
      return [];
    }
  });

  const customSites = ['IBO Player Pro', 'IBO Player', 'BOB Player', 'VU Player', 'Quick Player'];
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deleteClientModal, setDeleteClientModal] = useState(null);

  useEffect(() => {
    localStorage.setItem('autolog_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [activeTab, clients, clientModalOpen, deleteClientModal]);

  const dispararAutoLogin = async (cliente) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/auto-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: cliente.site,
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

  const handleSaveClient = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const clientData = {
      id: editingClient ? editingClient.id : Date.now(),
      name: formData.get('name') || '',
      site: formData.get('site') || customSites[0],
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

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 font-sans antialiased">
      {/* MENU LATERAL */}
      <aside className="w-64 bg-[#0d1322] border-r border-slate-800/60 flex flex-col">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800/40">
          <div className="bg-blue-600/20 p-2 rounded-xl border border-blue-500/30">
            <i data-lucide="shield-check" className="w-6 h-6 text-blue-400"></i>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wider text-white">AUTOLOG <span className="text-blue-500">APPS</span></h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
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
        </nav>
      </aside>

      {/* PAINEL PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-6">
                <p className="text-sm font-medium text-slate-400">Total de Clientes</p>
                <p className="text-3xl font-bold text-white mt-2">{clients.length}</p>
              </div>
              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-6">
                <p className="text-sm font-medium text-slate-400">Clientes Ativos</p>
                <p className="text-3xl font-bold text-emerald-400 mt-2">{clients.filter(c => c.status === 'EM USO').length}</p>
              </div>
              <div className="bg-[#0d1322] border border-slate-800/60 rounded-2xl p-6">
                <p className="text-sm font-medium text-slate-400">Clientes Livres</p>
                <p className="text-3xl font-bold text-blue-400 mt-2">{clients.filter(c => c.status === 'LIVRE').length}</p>
              </div>
            </div>
          </div>
        )}

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
                  {clients.map(c => (
                    <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6 font-medium text-white">{c.name}</td>
                      <td className="py-4 px-6 text-slate-400">{c.site}</td>
                      <td className="py-4 px-6 font-mono text-xs">{c.login}</td>
                      <td className="py-4 px-6 font-mono text-xs">{c.senha}</td>
                      <td className="py-4 px-6 text-slate-400">{c.expiry}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${c.status === 'LIVRE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button onClick={() => dispararAutoLogin(c)} title="Automação" className="text-slate-400 hover:text-amber-400 transition-colors p-1">
                          ⚡
                        </button>
                        <button onClick={() => { setEditingClient(c); setClientModalOpen(true); }} className="text-slate-400 hover:text-blue-400 transition-colors p-1">
                          ✏️
                        </button>
                        <button onClick={() => setDeleteClientModal(c.id)} className="text-slate-400 hover:text-rose-400 transition-colors p-1">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL NOVO / EDITAR */}
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
                <select name="site" defaultValue={editingClient ? editingClient.site : customSites[0]} className="w-full bg-[#111827] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  {customSites.map(s => <option key={s} value={s}>{s}</option>)}
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

      {/* MODAL EXCLUIR */}
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
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
