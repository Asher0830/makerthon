import { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  'zh-TW': {
    // Common
    loading: '正在努力載入中...',
    logout: '登出帳號',
    back_home: '← 回到會員首頁',
    refresh: '重整一下',
    points: '點數',
    points_earned: '我的小樹點',
    sponsor: '贊助這項計畫',

    // Login
    login_title: 'Eco-Cup 會員登入',
    login_subtitle: '一秒借杯，開啟你的環保生活 ✨',
    store_login_title: '店家管理後台',
    admin_login_title: '超級管理員中心',
    email: '電子郵件',
    password: '登入密碼',
    name: '怎麼稱呼您？',
    store_id: '門市編號',
    admin_account: '管理員帳號',
    login_btn: '開始環保生活',
    processing: '請稍等一下下...',
    no_account: '還沒有帳號嗎？',
    has_account: '已經是老朋友了？',
    register_now: '立即加入我們',
    back_to_login: '回去登入頁',
    connection_error: '哎呀！好像連不上伺服器呢',

    // Dashboard - Home
    home: '首頁',
    hello: '嗨，{name}！',
    member_center: '個人中心',
    personal_account: '帳戶設定',
    ad_title: '帶上自己的杯子，點數加碼送！',
    ad_subtitle: '每次借還都在為地球盡一份力，快來累積回饋吧！',
    my_cups: '手邊的杯杯',
    no_cups: '目前手邊沒有杯子喔，去借一個吧！',
    overdue: '天啊！過期了',
    days_remaining: '剩餘 {n} 天',
    borrow_store: '借出門市',
    borrow_time: '借出時間',
    unknown: '不小心弄丟資料了',

    // Dashboard - Member
    borrow_history: '我的環保足跡',
    no_history: '還沒有紀錄呢，期待你的第一次借杯！',
    returned: '✓ 已順利歸還',
    borrow_from: '從這裡借出',
    return_to: '還到了這裡',
    cup_id: '杯杯編號',

    // Navigation
    nav_home: '生活首頁',
    nav_member: '個人檔案',

    // Scanner
    scan_title: '掃描 QR Code',
    scan_success: '驗證成功！正在為您準備杯杯...',
    scan_member_ok: '找到你了！請對準機器上的 QR Code 掃描',
    scan_fail: '嗚嗚，掃描出了一點問題',

    // Store Dashboard
    store_backend: '店家小天地',
    in_stock: '目前庫存',
    cups_in_stock: '店內杯杯數',
    today_borrowed: '今日借出',
    today_borrow_count: '今天借出了幾次？',
    today_returned: '今日歸還',
    today_return_count: '今天收回了幾次？',
    overdue_unreturned: '還沒回家的杯子',
    overdue_from_store: '從本店借出但還沒回來的',
    contact_admin: '需要調整庫存嗎？請呼叫超級管理員喔！',
    return_analysis: '杯子都去哪兒了？',
    no_analysis_data: '還沒有還杯紀錄可以分析呢',

    // Admin Dashboard
    admin_system: '系統管理員',
    control_panel: '總控制台',
    total_users: '夥伴總數',
    total_cups: '杯子總數',
    in_circulation: '旅途中 / 休息中',
    total_overdue: '還沒回家的總數',
    store_management: '夥伴門市管理',
    store_name: '門市名稱',
    stock: '目前數量',
    status: '運作狀態',
    normal: '正常運作中',
    refresh_data: '更新數據',
    store_rankings: '門市人氣排行榜',
    most_borrowed: '借出最踴躍',
    most_returned: '歸還最主動',
    rank_borrow: '借出',
    rank_return: '歸還',
    overdue_list: '逾期戰犯名單',
    system_logs: '系統悄悄話',
    overview: '數據一眼看',
    latest_system_logs: '系統裡發生了什麼事？',

    // Notification
    notif_permission: '提醒功能已開啟！快到期時我會偷偷告訴你。',
    notif_denied: '通知被擋住了，這樣我沒辦法提醒你喔。',

    // Pull to refresh
    pull_to_refresh: '下拉更新一下',
    release_to_refresh: '放開手，我要更新囉',
    refreshing: '正在變身中...',
  },

  'en': {
    // Common
    loading: 'Loading...',
    logout: 'Log Out',
    back_home: '← Back to Home',
    refresh: 'Refresh',
    points: 'Points',
    points_earned: 'Eco Points',
    sponsor: 'Sponsor Us',

    // Login
    login_title: 'Eco-Cup Login',
    login_subtitle: 'Borrow a cup, embrace green life ✨',
    store_login_title: 'Store Admin',
    admin_login_title: 'Super Admin',
    email: 'Email',
    password: 'Password',
    name: 'What should we call you?',
    store_id: 'Store ID',
    admin_account: 'Admin Account',
    login_btn: 'Start Green Life',
    processing: 'Just a second...',
    no_account: "Don't have an account?",
    has_account: 'Already a friend?',
    register_now: 'Join Us',
    back_to_login: 'Back to Login',
    connection_error: 'Oops! Connection lost',

    // Dashboard - Home
    home: 'Home',
    hello: 'Hi, {name}!',
    member_center: 'Member',
    personal_account: 'Account',
    ad_title: 'Bring your own cup for bonus points!',
    ad_subtitle: 'Save the planet with every borrow and return!',
    my_cups: 'My Cups',
    no_cups: "No cups with you? Go borrow one!",
    overdue: 'Oh no! Overdue',
    days_remaining: '{n} days left to return',
    borrow_store: 'Borrowed from',
    borrow_time: 'Borrowed at',
    unknown: 'Data lost',

    // Dashboard - Member
    borrow_history: 'My Green Footprints',
    no_history: 'No records yet. Looking forward to your first borrow!',
    returned: '✓ Returned successfully',
    borrow_from: 'Borrowed from',
    return_to: 'Returned to',
    cup_id: 'Cup ID',

    // Navigation
    nav_home: 'Home',
    nav_member: 'Profile',

    // Scanner
    scan_title: 'Scan QR Code',
    scan_success: 'Success! Preparing your cup...',
    scan_member_ok: 'Found you! Please scan the QR on the machine',
    scan_fail: 'Something went wrong with the scan',

    // Store Dashboard
    store_backend: 'Store Corner',
    in_stock: 'In Stock',
    cups_in_stock: 'Cups here',
    today_borrowed: 'Borrowed Today',
    today_borrow_count: 'Rentals today',
    today_returned: 'Returned Today',
    today_return_count: 'Returns today',
    overdue_unreturned: 'Missing Cups',
    overdue_from_store: 'Overdue from this store',
    contact_admin: 'Need help? Call the Super Admin!',
    return_analysis: 'Where did they go?',
    no_analysis_data: 'No data to analyze yet',

    // Admin Dashboard
    admin_system: 'System Admin',
    control_panel: 'Control Center',
    total_users: 'Total Partners',
    total_cups: 'Total Cups',
    in_circulation: 'Traveling / Resting',
    total_overdue: 'Total Missing',
    store_management: 'Partner Stores',
    store_name: 'Store Name',
    stock: 'Count',
    status: 'Status',
    normal: 'Operating Normally',
    refresh_data: 'Refresh',
    store_rankings: 'Popularity Ranking',
    most_borrowed: 'Most Borrowed',
    most_returned: 'Most Returned',
    rank_borrow: 'Borrowed',
    rank_return: 'Returned',
    overdue_list: 'The Overdue List',
    system_logs: 'System Whispers',
    overview: 'Overview',
    latest_system_logs: "What's happening?",

    // Notification
    notif_permission: 'Notifications on! I will remind you before they are due.',
    notif_denied: 'Notifications denied. I cannot remind you this way.',

    // Pull to refresh
    pull_to_refresh: 'Pull to refresh',
    release_to_refresh: 'Release to update',
    refreshing: 'Transforming...',
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
    // Replace {n} or {name} style placeholders
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
