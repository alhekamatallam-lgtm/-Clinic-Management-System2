import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { UserGroupIcon, LockClosedIcon } from '@heroicons/react/24/solid';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { login, clinicLogo } = useApp();

  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
        setUsername(savedUsername);
        setRememberMe(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = login(username, password, rememberMe);
    if (!result.success) {
      setError(result.error || 'حدث خطأ غير متوقع.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 to-blue-500 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-8">
        <div className="text-center">
            {clinicLogo ? (
                <img src={clinicLogo} alt="شعار المستوصف" className="mx-auto h-24 w-auto object-contain" />
            ) : (
                <UserGroupIcon className="mx-auto h-16 w-16 text-teal-500"/>
            )}
          <h2 className="mt-6 text-3xl font-extrabold text-teal-800 dark:text-teal-300">
            مستوصف عيادات الراجحي التكافلي
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            نظام إدارة العيادات - يرجى تسجيل الدخول للمتابعة
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                اسم المستخدم
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <UserGroupIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none rounded-t-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm text-right dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-teal-500 dark:focus:border-teal-500"
                  placeholder="اسم المستخدم"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password-input" className="sr-only">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="password-input"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-b-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm text-right dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-teal-500 dark:focus:border-teal-500"
                  placeholder="كلمة المرور"
                />
              </div>
            </div>
          </div>
          
           <div className="flex items-center">
                <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="mr-2 block text-sm text-gray-900 dark:text-gray-300">
                    تذكرني
                </label>
            </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
            >
              تسجيل الدخول
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;