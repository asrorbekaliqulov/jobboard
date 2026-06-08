import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/auth.ts';
import { useNavigate } from 'react-router-dom';

const AdminLoginPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    useEffect(() => {
        // Define the global callback function for Telegram Login
        (window as any).onTelegramAuth = async (user: any) => {
            console.log('Logged in as ' + user.first_name + ' ' + user.last_name + ' (' + user.id + (user.username ? ', @' + user.username : '') + ')');

            const result = await authService.loginWithWidget(user);
            if (result) {
                if (result.user.role === 'admin') {
                    navigate('/administration/panel');
                } else {
                    alert(t('admin_login.denied'));
                    authService.logout();
                }
            } else {
                alert(t('admin_login.failed'));
            }
        };

        // Load Telegram Login Widget script
        const script = document.createElement('script');
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.async = true;
        script.setAttribute('data-telegram-login', import.meta.env.VITE_TELEGRAM_BOT_NAME || 'devYordamchiBot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');

        const container = document.getElementById('telegram-login-container');
        if (container) {
            container.appendChild(script);
        }

        return () => {
            // Clean up
            const container = document.getElementById('telegram-login-container');
            if (container) {
                container.innerHTML = '';
            }
            delete (window as any).onTelegramAuth;
        };
    }, [navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 px-4 py-6">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <div className="mb-6">
                    <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-user-shield text-white text-4xl"></i>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">{t('admin_login.access')}</h1>
                    <p className="text-gray-500 mt-2">{t('admin_login.description')}</p>
                </div>

                <div id="telegram-login-container" className="flex justify-center mb-6 min-h-[40px]">
                    {/* Widget will be injected here */}
                </div>

                <div className="text-xs text-gray-400 mt-8">
                    {t('admin_login.copyright')}
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;
