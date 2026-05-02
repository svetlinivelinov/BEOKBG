type RawProduct = {
  category: string;
  title: string;
  description: string;
  url: string;
  image: string;
};

export type LocalizedProduct = RawProduct & {
  slug: string;
};

type LocaleText = {
  bg?: { title?: string; description?: string };
  en?: { title?: string; description?: string };
};

const overridesByUrl: Record<string, LocaleText> = {
  '/thermostatic-radiator-valve/': {
    bg: { title: 'Радиаторен актуатор', description: 'Термостатичен радиаторен вентил' },
    en: { title: 'Radiator Actuator', description: 'Thermostatic radiator valve' },
  },
  '/room-thermostat/': {
    bg: { title: 'Стаен термостат', description: 'Стаен термостат' },
    en: { title: 'Room Thermostat', description: 'Room thermostat' },
  },
  '/underfloor-heating-controller/': {
    bg: { title: 'Контролер за подово отопление', description: 'Контролер за подово отопление' },
    en: { title: 'Underfloor Heating Controller', description: 'Controller for underfloor heating systems' },
  },
  '/room-thermostat/underfloor-heating-thermostat/16a-underfloor-heating-thermostat.html': {
    bg: {
      title: 'Интелигентен WiFi подов термостат TGM50',
      description: 'Интелигентен WiFi подов термостат TGM50 за система за управление на подово отопление',
    },
    en: {
      title: 'Smart WiFi Floor Thermostat TGM50',
      description: 'Smart WiFi floor thermostat TGM50 for underfloor heating control systems',
    },
  },
  '/room-thermostat/gas-boiler-heating-thermostat/rf-wireless-gas-boiler-heating-thermostat-bot.html': {
    bg: {
      title: 'RF безжичен термостат за газов котел BOT-R8X-WIFI',
      description: 'RF безжичен термостат BOT-R8X-WIFI за отоплителни системи с газов котел',
    },
    en: {
      title: 'RF Wireless Gas Boiler Thermostat BOT-R8X-WIFI',
      description: 'RF wireless thermostat BOT-R8X-WIFI for gas boiler heating systems',
    },
  },
  '/room-thermostat/gas-boiler-heating-thermostat/bot-r3x-wifi-radio-frequency-wifi-thermostat.html': {
    bg: {
      title: 'BOT-R3X-WIFI радиочестотен WiFi термостат',
      description: 'BOT-R3X-WIFI радиочестотен WiFi термостат за котелна система',
    },
    en: {
      title: 'BOT-R3X-WIFI RF WiFi Thermostat',
      description: 'BOT-R3X-WIFI radio-frequency WiFi thermostat for boiler systems',
    },
  },
  '/room-thermostat/gas-boiler-heating-thermostat/wired-gas-boiler-thermostats-bot-r15w-zigbee.html': {
    bg: {
      title: 'Кабелен Zigbee термостат за газов котел BOT-R15W-Zigbee',
      description: 'Кабелен Zigbee термостат за системи с газов котел',
    },
    en: {
      title: 'Wired Zigbee Gas Boiler Thermostat BOT-R15W-Zigbee',
      description: 'Wired Zigbee thermostat for gas boiler heating systems',
    },
  },
  '/room-thermostat/gas-boiler-heating-thermostat/bot-w506-wifi-smart-thermostat-for-boiler.html': {
    bg: {
      title: 'BOT-W506-WIFI интелигентен термостат за котел',
      description: 'BOT-W506-WIFI интелигентен термостат за котелна система',
    },
    en: {
      title: 'BOT-W506-WIFI Smart Boiler Thermostat',
      description: 'BOT-W506-WIFI smart thermostat for boiler systems',
    },
  },
};

function slugify(value: string) {
  return value.replace(/\s+/g, '-').toLowerCase();
}

export function localizeProducts(raw: RawProduct[], locale: string): LocalizedProduct[] {
  return raw.map((item) => {
    const override = overridesByUrl[item.url]?.[locale as 'bg' | 'en'];
    const title = override?.title ?? item.title;
    const description = override?.description ?? item.description;
    return {
      ...item,
      title,
      description,
      slug: slugify(item.title),
    };
  });
}
