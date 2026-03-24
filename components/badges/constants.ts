export const NAVY = '#0A1124';
export const GOLD = '#C9A84C';
export const BG = '#F2F4F8';
export const APP_SCHEME = 'hanaraahti://';
export const WEB_URL = 'https://hanaraahti.app';

export interface BadgeConfig {
  key: string;
  icon: string;
  title: string;
  days: number;
  color: string;
  shareText: string;
  emoji: string;
}

export const BADGE_CONFIGS: BadgeConfig[] = [
  { key: 'weekly', icon: 'star', title: 'أسبوع', days: 7, color: '#4A90D9', emoji: '⭐', shareText: 'لقد أكملت 7️⃣ أيام متواصلة من قراءة الكتاب المقدس! 🙏\n\nأنا أستخدم تطبيق "هنا راحتي" لمساعدتي على البقاء ثابتاً في وقتي مع الله.\n\n#هنا_راحتي #الثبات #الكتاب_المقدس' },
  { key: 'biweekly', icon: 'calendar-check', title: 'أسبوعان', days: 14, color: '#00BCD4', emoji: '📅', shareText: 'لقد أكملت 1️⃣4️⃣ يوماً متواصلاً من قراءة الكتاب المقدس! 🎉\n\nشكراً لتطبيق "هنا راحتي" على مساعدتي في هذه الرحلة الروحية.\n\n#هنا_راحتي #الثبات #الكتاب_المقدس' },
  { key: 'monthly', icon: 'medal', title: 'شهر', days: 30, color: GOLD, emoji: '🥇', shareText: 'لقد أكملت شهراً كاملاً (3️⃣0️⃣ يوماً) من قراءة الكتاب المقدس! 🏆\n\nهذا إنجاز عظيم لي في رحلتي الروحية. شكراً "هنا راحتي"!\n\n#هنا_راحتي #الثبات #الكتاب_المقدس' },
  { key: 'twomonths', icon: 'lightning-bolt', title: '60 يوم', days: 60, color: '#FF6B6B', emoji: '⚡', shareText: 'لقد أكملت 6️⃣0️⃣ يوماً متواصلاً من قراءة الكتاب المقدس! ⚡\n\nالثبات والاستقامة في وقتي مع الله هو هدفي، وأنا أحقق هذا الحلم!\n\n#هنا_راحتي #الثبات #الكتاب_المقدس' },
  { key: 'quarterly', icon: 'crown', title: '3 أشهر', days: 90, color: '#9C27B0', emoji: '👑', shareText: 'لقد أكملت 9️⃣0️⃣ يوماً متواصلاً من قراءة الكتاب المقدس! 👑\n\nثلاثة أشهر من الثبات والقرب من الله. الحمد لله على هذه الرحمة!\n\n#هنا_راحتي #الثبات #الكتاب_المقدس' },
  { key: 'halfyear', icon: 'heart', title: '6 أشهر', days: 180, color: '#E91E63', emoji: '❤️', shareText: 'لقد أكملت 1️⃣8️⃣0️⃣ يوماً متواصلاً من قراءة الكتاب المقدس! ❤️\n\nستة أشهر من الثبات والإيمان. شكراً لكل من يدعمني في هذه الرحلة!\n\n#هنا_راحتي #الثبات #الكتاب_المقدس' },
  { key: 'yearly', icon: 'trophy', title: 'سنة', days: 365, color: '#E84393', emoji: '🏆', shareText: 'لقد أكملت سنة كاملة (3️⃣6️⃣5️⃣ يوماً) من قراءة الكتاب المقدس! 🏆\n\nهذا إنجاز كبير في حياتي الروحية. الحمد لله على الثبات والقوة!\n\n#هنا_راحتي #الثبات #الكتاب_المقدس' },
  { key: 'dedication', icon: 'book-heart', title: 'سنتان', days: 730, color: '#4CAF50', emoji: '🎖️', shareText: 'لقد أكملت سنتين كاملتين (7️⃣3️⃣0️⃣ يوماً) من قراءة الكتاب المقدس! 🎖️\n\nتفاني مستمر في العلاقة مع الله. الحمد لله على هذه الرحمة العظيمة!\n\n#هنا_راحتي #الثبات #الكتاب_المقدس' },
];
