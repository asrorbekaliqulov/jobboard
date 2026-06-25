import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { userbotApi, UserbotAccount } from '../services/userbotApi.ts';

const statusColor = (status: string) => {
    switch (status) {
        case 'authorized': return 'bg-green-100 text-green-700';
        case 'code_sent': return 'bg-amber-100 text-amber-700';
        case 'error': return 'bg-red-100 text-red-700';
        default: return 'bg-slate-100 text-slate-600';
    }
};

const UserbotPanel: React.FC = () => {
    const { t } = useTranslation();
    const [accounts, setAccounts] = useState<UserbotAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string>('');

    // Translate backend status codes for display
    const statusLabel = (status: string) => t(`admin_userbot.status.${status}`, { defaultValue: status });

    // new account form
    const [form, setForm] = useState({ name: '', phone: '', api_id: '', api_hash: '' });
    // per-account code inputs
    const [codeInputs, setCodeInputs] = useState<Record<number, { code: string; password: string }>>({});
    // per-account channel inputs
    const [channelInputs, setChannelInputs] = useState<Record<number, { channel_identifier: string; keywords: string }>>({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { items } = await userbotApi.accounts.list();
            setAccounts(items);
        } catch (e: any) {
            setMsg(e.message || t('admin_userbot.error_generic'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    const notify = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 5000); };

    const handleCreate = async () => {
        if (!form.name || !form.phone || !form.api_id || !form.api_hash) {
            notify(t('admin_userbot.fill_all_fields')); return;
        }
        try {
            await userbotApi.accounts.create({
                name: form.name, phone: form.phone,
                api_id: Number(form.api_id), api_hash: form.api_hash,
            });
            setForm({ name: '', phone: '', api_id: '', api_hash: '' });
            notify(t('admin_userbot.account_added')); load();
        } catch (e: any) { notify(e.message); }
    };

    const handleSendCode = async (id: number) => {
        try { const r = await userbotApi.accounts.sendCode(id); notify(r.message); load(); }
        catch (e: any) { notify(e.message); }
    };

    const handleVerify = async (id: number) => {
        const input = codeInputs[id];
        if (!input?.code) { notify(t('admin_userbot.enter_code')); return; }
        try { const r = await userbotApi.accounts.verifyCode(id, input.code, input.password); notify(r.message); load(); }
        catch (e: any) { notify(e.message); }
    };

    const handleToggleActive = async (acc: UserbotAccount) => {
        try { await userbotApi.accounts.update(acc.id, { is_active: !acc.is_active }); load(); }
        catch (e: any) { notify(e.message); }
    };

    const handlePoll = async (id: number) => {
        try { notify(t('admin_userbot.checking')); const r = await userbotApi.accounts.pollNow(id); notify(r.message); load(); }
        catch (e: any) { notify(e.message); }
    };

    const handleDeleteAccount = async (id: number) => {
        if (!confirm(t('admin_userbot.delete_account_confirm'))) return;
        try { await userbotApi.accounts.remove(id); load(); } catch (e: any) { notify(e.message); }
    };

    const handleAddChannel = async (accId: number) => {
        const input = channelInputs[accId];
        if (!input?.channel_identifier) { notify(t('admin_userbot.enter_channel')); return; }
        try {
            await userbotApi.channels.add(accId, { channel_identifier: input.channel_identifier, keywords: input.keywords });
            setChannelInputs(prev => ({ ...prev, [accId]: { channel_identifier: '', keywords: '' } }));
            notify(t('admin_userbot.channel_added')); load();
        } catch (e: any) { notify(e.message); }
    };

    const handleToggleChannel = async (channelId: number, isActive: boolean) => {
        try { await userbotApi.channels.update(channelId, { is_active: !isActive }); load(); }
        catch (e: any) { notify(e.message); }
    };

    const handleDeleteChannel = async (channelId: number) => {
        if (!confirm(t('admin_userbot.delete_channel_confirm'))) return;
        try { await userbotApi.channels.remove(channelId); load(); } catch (e: any) { notify(e.message); }
    };

    return (
        <div className="flex flex-col gap-6">
            {msg && (
                <div className="px-5 py-3 rounded-2xl bg-blue-50 text-blue-700 text-sm font-bold border border-blue-100">{msg}</div>
            )}

            {/* Add account */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 mb-4">
                    <i className="fa-solid fa-robot mr-2 text-blue-600"></i>{t('admin_userbot.new_account_title')}
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                    {t('admin_userbot.api_hint')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('admin_userbot.placeholder_name')} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+998901234567" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                    <input value={form.api_id} onChange={e => setForm({ ...form, api_id: e.target.value })} placeholder="api_id" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                    <input value={form.api_hash} onChange={e => setForm({ ...form, api_hash: e.target.value })} placeholder="api_hash" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                </div>
                <button onClick={handleCreate} className="mt-4 px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all">
                    <i className="fa-solid fa-plus mr-2"></i>{t('admin_userbot.add')}
                </button>
            </div>

            {loading && <div className="text-center py-6"><div className="animate-spin inline-block rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}

            {/* Accounts list */}
            {accounts.map(acc => (
                <div key={acc.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <span className="font-black text-slate-800">{acc.name}</span>
                            <span className="text-xs text-slate-400 font-bold">{acc.phone}</span>
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${statusColor(acc.status)}`}>{statusLabel(acc.status)}</span>
                            {acc.is_active && <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">{t('admin_userbot.on')}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            {acc.status !== 'authorized' && (
                                <button onClick={() => handleSendCode(acc.id)} className="px-3 py-2 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase">{t('admin_userbot.send_code')}</button>
                            )}
                            <button onClick={() => handleToggleActive(acc)} className="px-3 py-2 rounded-lg bg-slate-700 text-white text-[10px] font-black uppercase">{acc.is_active ? t('admin_userbot.stop') : t('admin_userbot.enable')}</button>
                            <button onClick={() => handlePoll(acc.id)} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase">{t('admin_userbot.check')}</button>
                            <button onClick={() => handleDeleteAccount(acc.id)} className="px-3 py-2 rounded-lg bg-red-500 text-white text-[10px] font-black uppercase"><i className="fa-solid fa-trash"></i></button>
                        </div>
                    </div>

                    {acc.last_error && <div className="text-xs text-red-500 font-bold mb-3">⚠ {acc.last_error}</div>}

                    {/* Verify code form (when code sent) */}
                    {acc.status === 'code_sent' && (
                        <div className="flex flex-wrap items-center gap-3 mb-4 bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <input
                                value={codeInputs[acc.id]?.code || ''}
                                onChange={e => setCodeInputs(prev => ({ ...prev, [acc.id]: { ...prev[acc.id], code: e.target.value } }))}
                                placeholder={t('admin_userbot.placeholder_code')} className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
                            <input
                                value={codeInputs[acc.id]?.password || ''}
                                onChange={e => setCodeInputs(prev => ({ ...prev, [acc.id]: { ...prev[acc.id], password: e.target.value } }))}
                                placeholder={t('admin_userbot.placeholder_2fa')} className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
                            <button onClick={() => handleVerify(acc.id)} className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-[10px] font-black uppercase">{t('admin_userbot.confirm')}</button>
                        </div>
                    )}

                    {/* Channels */}
                    <div className="border-t border-slate-100 pt-4">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3">{t('admin_userbot.channels')}</h4>
                        <div className="flex flex-col gap-2 mb-3">
                            {acc.channels.length === 0 && <p className="text-xs text-slate-400">{t('admin_userbot.no_channels')}</p>}
                            {acc.channels.map(ch => (
                                <div key={ch.id} className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {ch.channel_photo_url && <img src={ch.channel_photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />}
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{ch.channel_title || ch.channel_identifier}</p>
                                            <p className="text-[11px] text-slate-400 font-medium">{ch.keywords ? `🔑 ${ch.keywords}` : t('admin_userbot.all_vacancies')} · {ch.imported_count} {t('admin_userbot.imported_suffix')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleToggleChannel(ch.id, ch.is_active)} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase ${ch.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{ch.is_active ? t('admin_userbot.active') : t('admin_userbot.inactive')}</button>
                                        <button onClick={() => handleDeleteChannel(ch.id)} className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-600 text-[9px] font-black uppercase"><i className="fa-solid fa-trash"></i></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                value={channelInputs[acc.id]?.channel_identifier || ''}
                                onChange={e => setChannelInputs(prev => ({ ...prev, [acc.id]: { ...prev[acc.id], channel_identifier: e.target.value } }))}
                                placeholder={t('admin_userbot.placeholder_channel')} className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
                            <input
                                value={channelInputs[acc.id]?.keywords || ''}
                                onChange={e => setChannelInputs(prev => ({ ...prev, [acc.id]: { ...prev[acc.id], keywords: e.target.value } }))}
                                placeholder={t('admin_userbot.placeholder_keywords')} className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
                            <button onClick={() => handleAddChannel(acc.id)} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase">{t('admin_userbot.add_channel')}</button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default UserbotPanel;
