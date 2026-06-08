
import React, { useState, useMemo } from 'react';
import { User, Vacancy, Resume, Profession, Region, ItemStatus, UserRole } from '../types.ts';
import { Pagination, ConfirmModal, SearchableSelect } from '../components/Shared.tsx';

interface AdminPanelProps {
  users: User[];
  vacancies: Vacancy[];
  resumes: Resume[];
  professions: Profession[];
  regions: Region[];
  onLogout: () => void;
  onEditItem: (type: string, item: any) => void;
  onDeleteItem: (type: string, id: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, vacancies, resumes, professions, regions, onLogout, onEditItem, onDeleteItem }) => {
  const [activeMenu, setActiveMenu] = useState<'users' | 'vacancies' | 'resumes' | 'settings'>('users');
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<{type: string, id: string} | null>(null);

  const activeList = useMemo(() => {
    let list: any[] = [];
    if (activeMenu === 'users') list = users;
    else if (activeMenu === 'vacancies') list = vacancies;
    else if (activeMenu === 'resumes') list = resumes;
    else if (activeMenu === 'settings') list = [...professions, ...regions];

    return list.filter(item => {
      const query = search.toLowerCase();
      const matchSearch = activeMenu === 'users' ? (item.username.toLowerCase().includes(query) || item.phone.includes(query)) :
                         activeMenu === 'vacancies' ? (item.company_name.toLowerCase().includes(query) || item.phone.includes(query)) :
                         activeMenu === 'resumes' ? (item.first_name.toLowerCase().includes(query) || item.phone.includes(query)) :
                         item.name.toLowerCase().includes(query);
      
      const matchStatus = filterStatus === 'all' || item.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [activeMenu, users, vacancies, resumes, professions, regions, search, filterStatus]);

  const pagedList = useMemo(() => {
    const start = (page - 1) * perPage;
    return activeList.slice(start, start + perPage);
  }, [activeList, page]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans">
      <nav className="bg-slate-900 border-b border-white/5 px-10 py-6 flex items-center justify-between sticky top-0 z-50">
         <div className="flex items-center gap-4">
            <h1 className="text-xl font-black uppercase tracking-normal">Admin<span className="text-sky-500">Core</span></h1>
            <div className="flex bg-white/5 p-1 rounded-2xl">
               {(['users', 'vacancies', 'resumes', 'settings'] as const).map(m => (
                 <button key={m} onClick={() => { setActiveMenu(m); setPage(1); }} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMenu === m ? 'bg-white text-slate-900 shadow-xl' : ' hover:text-white'}`}>{m}</button>
               ))}
            </div>
         </div>
         <button onClick={onLogout} className="px-5 py-2.5 rounded-xl bg-white/5 text-[10px] font-black uppercase  hover:text-white transition-colors">Logout</button>
      </nav>

      <main className="p-4 flex-1 flex flex-col gap-8 max-w-[1600px] mx-auto w-full">
         <div className="flex items-center justify-between">
            <div className="flex gap-4 items-end">
               <div className="w-80">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Universal Search</p>
                  <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"></i>
                    <input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-500 transition-all" placeholder="ID, Name, Phone..." />
                  </div>
               </div>
               <div className="w-48">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Status</p>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="deleted">Deleted</option>
                  </select>
               </div>
            </div>
            {activeMenu !== 'users' && (
              <button onClick={() => onEditItem(activeMenu, null)} className="px-8 py-4 bg-sky-500 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-sky-500/20 active:scale-95 transition-all">Add New Entry</button>
            )}
         </div>

         <div className="bg-white/5 border border-white/5 rounded-[2.5rem] overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/5">
                     <tr>
                        <th className="px-4 py-6 text-[10px] font-black uppercase text-slate-500">Principal</th>
                        <th className="px-4 py-6 text-[10px] font-black uppercase text-slate-500">Secondary</th>
                        <th className="px-4 py-6 text-[10px] font-black uppercase text-slate-500">Metadata</th>
                        <th className="px-4 py-6 text-[10px] font-black uppercase text-slate-500 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {pagedList.map((item: any) => (
                       <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-4 py-6">
                             <p className="font-bold">{activeMenu === 'users' ? `@${item.username}` : activeMenu === 'vacancies' ? item.company_name : activeMenu === 'resumes' ? `${item.first_name} ${item.last_name}` : item.name}</p>
                             <p className="text-xs text-slate-500">{item.phone || item.id}</p>
                          </td>
                          <td className="px-4 py-6">
                             <p className="text-sm font-bold">{item.profession || item.role || 'System Entry'}</p>
                          </td>
                          <td className="px-4 py-6">
                             <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${item.status === 'active' ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-500/20 '}`}>{item.status}</span>
                             {item.viewed !== undefined && <span className="ml-3 text-[10px] font-black text-slate-600"><i className="fa-solid fa-eye mr-1"></i>{item.viewed}</span>}
                          </td>
                          <td className="px-4 py-6 text-right">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEditItem(activeMenu, item)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center  hover:text-white transition-colors"><i className="fa-solid fa-pen"></i></button>
                                <button onClick={() => setConfirmDelete({type: activeMenu, id: item.id})} className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-trash"></i></button>
                             </div>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>
            <div className="mt-auto border-t border-white/5 pb-6">
               <Pagination current={page} total={activeList.length} perPage={perPage} onChange={setPage} />
            </div>
         </div>
      </main>

      <ConfirmModal isOpen={!!confirmDelete} title={`Permanently delete this ${confirmDelete?.type}?`} onConfirm={() => { if(confirmDelete) onDeleteItem(confirmDelete.type, confirmDelete.id); setConfirmDelete(null); }} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
};

export default AdminPanel;
