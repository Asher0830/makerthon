import { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  'zh-TW': {
    // Common
    loading: '載入中...',
    logout: '登出帳號',
    back_home: '← 返回會員首頁',
    refresh: '重新整理',
    points: '點數',
    points_earned: '已累積點數',
    sponsor: '贊助我們',

    // Login
    login_title: 'Eco-Cup 會員登入',
    login_subtitle: '一秒借杯，環保無負擔',
    store_login_title: '店家管理後台',
    admin_login_title: '超級管理員後台',
    email: 'Email',
    password: '密碼',
    name: '姓名',
    store_id: '店家 ID',
    admin_account: '管理員帳號',
    login_btn: '登入',
    processing: '處理中...',
    no_account: '還沒有帳號嗎？',
    has_account: '已經有帳號了？',
    register_now: '立即註冊',
    back_to_login: '返回登入',
    connection_error: '無法連線到伺服器',

    // Dashboard - Home
    home: '首頁',
    hello: '您好，',
    member_center: '會員中心',
    personal_account: '個人帳戶',
    ad_title: '自備環保杯 加碼送點！',
    ad_subtitle: '每次借還皆可累積專屬回饋，快來參加！',
    my_cups: '我的杯子',
    no_cups: '目前沒有借出的杯子',
    overdue: '已逾期',
    days_remaining: '剩餘 {n} 天',
    borrow_store: '借出店家',
    borrow_time: '借出',
    unknown: '未知',

    // Dashboard - Member
    borrow_history: '借還歷史',
    no_history: '無歷史紀錄',
    returned: '✓ 已歸還',
    borrow_from: '借出',
    return_to: '歸還',
    cup_id: '杯號',

    // Navigation
    nav_home: '首頁',
    nav_member: '會員',

    // Scanner
    scan_title: '掃描 QRCode',
    scan_success: '掃描成功，處理中...',
    scan_member_ok: '會員登入成功，請進行掃杯 (UUID已傳送)',
    scan_fail: '處理失敗',

    // Store Dashboard
    store_backend: '店家後台',
    in_stock: '目前庫存',
    cups_in_stock: '在庫杯數',
    today_borrowed: '今日借出',
    today_borrow_count: '本日租借次數',
    today_returned: '今日歸還',
    today_return_count: '本日回收次數',
    overdue_unreturned: '逾期未還',
    overdue_from_store: '本店借出之逾期杯',
    contact_admin: '如需調整庫存或報修掃杯器，請聯繫超級管理員。',
    return_analysis: '還杯去向分析',
    no_analysis_data: '尚無還杯數據',

    // Admin Dashboard
    admin_system: '系統管理員',
    control_panel: '總控制台',
    total_users: '總使用者',
    total_cups: '總杯數',
    in_circulation: '流通中 / 在庫',
    total_overdue: '逾期總數',
    store_management: '合作店家管理',
    store_name: '店家名稱',
    stock: '庫存',
    status: '狀態',
    normal: '正常',
    refresh_data: '刷新數據',
    store_rankings: '店家排行榜',
    most_borrowed: '借出量最高',
    most_returned: '歸還量最高',
    rank_borrow: '借出',
    rank_return: '歸還',
    overdue_list: '逾期詳細清單',
    system_logs: '系統日誌',
    overview: '數據總覽',
    latest_system_logs: '最新系統操作紀錄',

    // Notification
    notif_permission: '通知已啟用！到期前會提醒您還杯。',
    notif_denied: '通知權限被拒絕，無法推播提醒。',

    // Pull to refresh
    pull_to_refresh: '下拉更新',
    release_to_refresh: '放開更新',
    refreshing: '更新中...',
  },

  'en': {
    // Common
    loading: 'Loading...',
    logout: 'Log Out',
    back_home: '← Back to Home',
    refresh: 'Refresh',
    points: 'Points',
    points_earned: 'Points Earned',
    sponsor: 'Sponsor Us',

    // Login
    login_title: 'Eco-Cup Login',
    login_subtitle: 'Borrow a cup, save the planet',
    store_login_title: 'Store Admin',
    admin_login_title: 'Super Admin',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    store_id: 'Store ID',
    admin_account: 'Admin Account',
    login_btn: 'Login',
    processing: 'Processing...',
    no_account: "Don't have an account?",
    has_account: 'Already have an account?',
    register_now: 'Register',
    back_to_login: 'Back to Login',
    connection_error: 'Cannot connect to server',

    // Dashboard - Home
    home: 'Home',
    hello: 'Hello, ',
    member_center: 'Member',
    personal_account: 'My Account',
    ad_title: 'Bring your own cup for bonus points!',
    ad_subtitle: 'Earn rewards with every borrow and return!',
    my_cups: 'My Cups',
    no_cups: 'No cups currently borrowed',
    overdue: 'Overdue',
    days_remaining: '{n} days left',
    borrow_store: 'Borrowed from',
    borrow_time: 'Borrowed',
    unknown: 'Unknown',

    // Dashboard - Member
    borrow_history: 'History',
    no_history: 'No history',
    returned: '✓ Returned',
    borrow_from: 'Borrowed',
    return_to: 'Returned',
    cup_id: 'Cup ID',

    // Navigation
    nav_home: 'Home',
    nav_member: 'Profile',

    // Scanner
    scan_title: 'Scan QRCode',
    scan_success: 'Scan successful, processing...',
    scan_member_ok: 'Member login successful, please scan cup',
    scan_fail: 'Processing failed',

    // Store Dashboard
    store_backend: 'Store Admin',
    in_stock: 'In Stock',
    cups_in_stock: 'Cups available',
    today_borrowed: 'Borrowed Today',
    today_borrow_count: 'Rentals today',
    today_returned: 'Returned Today',
    today_return_count: 'Returns today',
    overdue_unreturned: 'Overdue',
    overdue_from_store: 'Overdue cups from this store',
    contact_admin: 'Contact admin for stock adjustments or scanner repairs.',
    return_analysis: 'Return Destination Analysis',
    no_analysis_data: 'No return data yet',

    // Admin Dashboard
    admin_system: 'System Admin',
    control_panel: 'Control Panel',
    total_users: 'Total Users',
    total_cups: 'Total Cups',
    in_circulation: 'Borrowed / In Stock',
    total_overdue: 'Total Overdue',
    store_management: 'Store Management',
    store_name: 'Store Name',
    stock: 'Stock',
    status: 'Status',
    normal: 'Active',
    refresh_data: 'Refresh',
    store_rankings: 'Store Rankings',
    most_borrowed: 'Most Borrowed',
    most_returned: 'Most Returned',
    rank_borrow: 'Borrowed',
    rank_return: 'Returned',

    // Notification
    notif_permission: 'Notifications enabled! We will remind you before due dates.',
    notif_denied: 'Notification permission denied.',

    // Pull to refresh
    pull_to_refresh: 'Pull to refresh',
    release_to_refresh: 'Release to refresh',
    refreshing: 'Refreshing...',
    overdue_list: 'Overdue Details',
    system_logs: 'System Logs',
    overview: 'Overview',
    latest_system_logs: 'Latest System Logs',
  }
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('ecoCupLang') || 'zh-TW';
  });

  useEffect(() => {
    localStorage.setItem('ecoCupLang', lang);
  }, [lang]);

  const t = (key, params = {}) => {
    let text = translations[lang]?.[key] || translations['zh-TW']?.[key] || key;
    // Replace {n} style placeholders
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
    return text;
  };

  const toggleLang = () => {
    setLang(prev => prev === 'zh-TW' ? 'en' : 'zh-TW');
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
