
import React, { useState } from 'react';
import { Vacancy, Resume, ItemStatus, WorkFormat, WorkType, WorkSchedule, Gender, Profession, Region } from '../types.ts';
import { SearchableSelect } from '../components/Shared.tsx';
import RichTextEditor from '../components/RichTextEditor.tsx';
import { professionService } from '../services/professionService.ts';
import { regionService } from '../services/regionService.ts';

interface ItemEditFormProps {
   type: 'vacancy' | 'resume';
   initialData?: any;
   onSave: (data: any) => void;
   onCancel: () => void;
}

const ItemEditForm: React.FC<ItemEditFormProps> = ({ type, initialData, onSave, onCancel }) => {
   const [formData, setFormData] = useState<any>(initialData || (type === 'vacancy' ? {
      id: 0,
      company_name: '',
      profession_id: 0,
      region_id: 0,
      status: ItemStatus.ACTIVE,
      description: '',
      work_format: WorkFormat.REMOTE,
      work_type: WorkType.FULLTIME,
      work_hours: 40,
      phone: '',
      telegram: '',
      email: '',
      schedule: WorkSchedule.S_5_2,
      exp_from: 0,
      exp_till: 3,
      salary_from: undefined,
      salary_till: undefined,
      created_at: new Date().toISOString(),
      viewed: 0,
      hunterId: 'u2'
   } : {
      id: 0,
      first_name: '',
      last_name: '',
      middle_name: '',
      age: 20,
      profession_id: 0,
      region_id: 0,
      gender: Gender.ANY,
      experience: 0,
      description: '',
      phone: '',
      telegram: '',
      email: '',
      status: ItemStatus.ACTIVE,
      created_at: new Date().toISOString(),
      viewed: 0,
      seekerId: 'u1'
   }));

   const [professions, setProfessions] = useState<Profession[]>([]);
   const [regions, setRegions] = useState<Region[]>([]);

   React.useEffect(() => {
      professionService.getProfessions().then(setProfessions).catch(console.error);
      regionService.getRegions().then(setRegions).catch(console.error);
   }, []);

   const professionOptions = React.useMemo(() =>
      professions.map(p => ({ id: p.id, name: p.name_uz || p.name_en })),
      [professions]);

   const regionOptions = React.useMemo(() =>
      regions.map(r => ({ id: r.id, name: r.name_uz || r.name_en })),
      [regions]);

   const accentColor = type === 'vacancy' ? 'purple' : 'blue';
   const ringColor = accentColor === 'purple' ? 'focus:ring-purple-500' : 'focus:ring-blue-500';

   return (
      <div className="fixed inset-0 bg-slate-50 z-[1000] flex flex-col overflow-y-auto pb-20">
         <nav className="bg-slate-900 text-white px-8 py-6 flex items-center justify-between sticky top-0 z-50 shadow-xl">
            <div className="flex items-center gap-4">
               <button onClick={onCancel} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white active:scale-90 transition-all"><i className="fa-solid fa-arrow-left"></i></button>
               <h1 className="text-lg font-black uppercase tracking-widest">{initialData ? 'Update' : 'Publish'} {type}</h1>
            </div>
            <button onClick={() => onSave(formData)} className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg ${accentColor === 'blue' ? 'bg-blue-600 shadow-blue-500/20' : 'bg-purple-600 shadow-purple-500/20'}`}>Save</button>
         </nav>

         <div className="p-8 max-w-2xl mx-auto w-full space-y-10">
            <div className="bg-white p-4 rounded-[3rem] shadow-sm border border-slate-100 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                     <p className="text-[10px] font-black  uppercase tracking-widest mb-1.5 ml-1">{type === 'vacancy' ? 'Company Name' : 'First Name'}</p>
                     <input value={type === 'vacancy' ? formData.company_name : formData.first_name} onChange={e => setFormData({ ...formData, [type === 'vacancy' ? 'company_name' : 'first_name']: e.target.value })} className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none ${ringColor}`} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black  uppercase tracking-widest mb-1.5 ml-1">{type === 'vacancy' ? 'Region' : 'Last Name'}</p>
                     {type === 'vacancy' ? (
                        <select value={formData.region_id} onChange={e => setFormData({ ...formData, region_id: parseInt(e.target.value) })} className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none ${ringColor}`}>
                           <option value={0}>Select Region</option>
                           {regions.map(r => <option key={r.id} value={r.id}>{r.name_uz || r.name_en}</option>)}
                        </select>
                     ) : (
                        <input value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none ${ringColor}`} />
                     )}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <SearchableSelect label="Profession" options={professionOptions} value={formData.profession_id} onChange={val => setFormData({ ...formData, profession_id: val })} accentColor={accentColor} />
                  <div>
                     <p className="text-[10px] font-black  uppercase tracking-widest mb-1.5 ml-1">Status</p>
                     <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as ItemStatus })} className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none ${ringColor}`}>
                        <option value={ItemStatus.ACTIVE}>Active</option>
                        <option value={ItemStatus.DRAFT}>Draft</option>
                     </select>
                  </div>
               </div>

               {type === 'vacancy' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div>
                        <p className="text-[10px] font-black  uppercase tracking-widest mb-1.5 ml-1">Work Format</p>
                        <select value={formData.work_format} onChange={e => setFormData({ ...formData, work_format: e.target.value as WorkFormat })} className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none ${ringColor}`}>
                           {Object.values(WorkFormat).map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                        </select>
                     </div>
                     <div>
                        <p className="text-[10px] font-black  uppercase tracking-widest mb-1.5 ml-1">Type</p>
                        <select value={formData.work_type} onChange={e => setFormData({ ...formData, work_type: e.target.value as WorkType })} className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none ${ringColor}`}>
                           {Object.values(WorkType).map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                        </select>
                     </div>
                     <div>
                        <p className="text-[10px] font-black  uppercase tracking-widest mb-1.5 ml-1">Hours/Week</p>
                        <input type="number" value={formData.work_hours} onChange={e => setFormData({ ...formData, work_hours: parseInt(e.target.value) })} className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none ${ringColor}`} />
                     </div>
                  </div>
               )}

               <div>
                  <p className="text-[10px] font-black  uppercase tracking-widest mb-1.5 ml-1">Description</p>
                  <RichTextEditor value={formData.description} onChange={val => setFormData({ ...formData, description: val })} placeholder="Enter full details here..." maxLength={type === 'vacancy' ? 2000 : 1200} accentColor={accentColor} />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                     <p className="text-[10px] font-black  uppercase tracking-widest mb-1.5 ml-1">Phone</p>
                     <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none ${ringColor}`} placeholder="+998..." />
                  </div>
                  <div>
                     <p className="text-[10px] font-black  uppercase tracking-widest mb-1.5 ml-1">Telegram</p>
                     <input value={formData.telegram} onChange={e => setFormData({ ...formData, telegram: e.target.value })} className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none ${ringColor}`} placeholder="@username" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black  uppercase tracking-widest mb-1.5 ml-1">Email</p>
                     <input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none ${ringColor}`} placeholder="example@mail.com" />
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default ItemEditForm;
