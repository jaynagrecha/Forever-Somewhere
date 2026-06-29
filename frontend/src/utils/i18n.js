export const STRINGS = {
  en: {
    dashboard: 'Forever, Somewhere',
    synced: 'Synced',
    offline: 'Offline mode',
    ourStory: 'Our Story',
    dailyQuestion: 'Daily question',
    randomMemory: 'Random memory',
    activity: 'Partner activity',
    moodBoard: 'Our season',
    quiz: 'Compatibility quiz',
    starMap: 'Star map',
  },
  hi: {
    dashboard: 'Forever, Somewhere',
    synced: 'सिंक हो गया',
    offline: 'ऑफ़लाइन',
    ourStory: 'हमारी कहानी',
    dailyQuestion: 'आज का सवाल',
    randomMemory: 'कोई भी याद',
    activity: 'पार्टनर की गतिविधि',
    moodBoard: 'हमारा मौसम',
    quiz: 'कम्पैटिबिलिटी क्विज़',
    starMap: 'तारों का नक्शा',
  },
  gu: {
    dashboard: 'Forever, Somewhere',
    synced: 'સિંક થયું',
    offline: 'ઑફલાઇન',
    ourStory: 'અમારી વાર્તા',
    dailyQuestion: 'આજનો પ્રશ્ન',
    randomMemory: 'રેન્ડમ યાદ',
    activity: 'પાર્ટનર એક્ટિવિટી',
    moodBoard: 'અમારું સીઝન',
    quiz: 'કમ્પેટિબિલિટી ક્વિઝ',
    starMap: 'તારાનો નકશો',
  },
};

export function t(locale, key) {
  return STRINGS[locale]?.[key] || STRINGS.en[key] || key;
}
