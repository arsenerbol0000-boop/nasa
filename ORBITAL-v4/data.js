/* ORBITAL v3 — game data. Orbits, stations and target regions are real; part numbers are simplified but keep real proportions. */
window.OD = (function () {
  const L = (ru, en) => ({ ru, en });

  // Real orbit parameters. Period, eclipse time, footprint and contact time are computed from these with real physics (sim.js).
  const ORBITS = {
    leo:   { alt: 500,   inc: 51.6, name: L('Наклонная низкая', 'Inclined LEO'), short: 'LEO 51.6°',
             desc: L('Как у МКС. Близко к Земле, но не видит полюса и быстро тормозится атмосферой.', 'Like the ISS. Close to Earth, but never sees the poles and decays fast.') },
    polar: { alt: 800,   inc: 90,   name: L('Полярная', 'Polar'), short: 'POLAR 90°',
             desc: L('Проходит над обоими полюсами. Каждый виток — новая полоса планеты.', 'Passes over both poles. Each orbit covers a new strip of the planet.') },
    sso:   { alt: 700,   inc: 98.2, name: L('Солнечно-синхронная', 'Sun-synchronous'), short: 'SSO 98.2°',
             desc: L('Плоскость орбиты поворачивается вслед за Солнцем — над каждым местом в одно и то же время суток.', 'The orbit plane turns with the Sun — over each place at the same local time.') },
    geo:   { alt: 35786, inc: 0, lon: 75, name: L('Геостационарная', 'Geostationary'), short: 'GEO 75°E',
             desc: L('Висит над точкой 75° в.д. (над Индийским океаном) и видит Азию, Африку и Европу без перерыва.', 'Hovers over 75°E and watches Asia, Africa and Europe non-stop.') }
  };

  // passive instruments can point ±45° off-nadir (agile satellite); active ones (radar, lidar) look straight down
  const INSTR = {
    imager:  { mass: 45, power: 80,  cost: 22, days: 18, gb: 4,   optical: true,  icon: 'cam',
      name: L('Мультиспектральная камера', 'Multispectral camera'), desc: L('Видимый и ближний ИК. Нужен дневной свет.', 'Visible & near-IR. Needs daylight.') },
    thermal: { mass: 55, power: 110, cost: 28, days: 22, gb: 2,   optical: false, icon: 'ir',
      name: L('Тепловой ИК-сканер', 'Thermal IR scanner'), desc: L('Видит тепло. Работает и ночью.', 'Sees heat. Works at night too.') },
    spectro: { mass: 50, power: 90,  cost: 26, days: 20, gb: 3,   optical: true,  icon: 'spec',
      name: L('Спектрометр', 'Spectrometer'), desc: L('Сотни цветовых каналов. Нужен свет.', 'Hundreds of colour bands. Needs light.') },
    radar:   { mass: 65, power: 140, cost: 30, days: 24, gb: 0.5, active: true,   icon: 'radar',
      name: L('Радарный альтиметр', 'Radar altimeter'), desc: L('Высота воды и льда. Смотрит только вниз, день и ночь.', 'Water & ice height. Nadir only, day and night.') },
    lidar:   { mass: 95, power: 250, cost: 45, days: 30, gb: 1.5, active: true,   icon: 'lidar',
      name: L('Лидар', 'Lidar'), desc: L('Лазерная высота льда. Очень точный и прожорливый.', 'Laser ice height. Very precise, very power-hungry.') }
  };

  const POWER = {
    s: { gen: 400,  batt: 300, mass: 12, cost: 4,  days: 6,  name: L('Малые панели', 'Small panels') },
    m: { gen: 750,  batt: 500, mass: 25, cost: 8,  days: 9,  name: L('Средние панели', 'Medium panels') },
    l: { gen: 1200, batt: 800, mass: 40, cost: 14, days: 14, name: L('Крылья', 'Big wings') }
  };

  // downlink rate in GB per minute of contact (S ≈ 4 Mbit/s, X ≈ 150 Mbit/s, Ka ≈ 600 Mbit/s)
  const RADIO = {
    s:  { rate: 0.03, power: 15, mass: 4,  cost: 2,  days: 4,  name: L('S-диапазон', 'S-band') },
    x:  { rate: 1.1,  power: 45, mass: 12, cost: 6,  days: 7,  name: L('X-диапазон', 'X-band') },
    ka: { rate: 4.5,  power: 80, mass: 22, cost: 12, days: 10, name: L('Ka-диапазон', 'Ka-band') }
  };

  // Real ground stations (NASA Near Space Network and partners)
  const STATIONS = {
    svalbard:  { lat: 78.23,  lon: 15.41,   name: 'Svalbard' },
    wallops:   { lat: 37.93,  lon: -75.47,  name: 'Wallops' },
    fairbanks: { lat: 64.86,  lon: -147.85, name: 'Fairbanks' },
    mcmurdo:   { lat: -77.84, lon: 166.67,  name: 'McMurdo' },
    hbk:       { lat: -25.89, lon: 27.69,   name: 'Hartebeesthoek' },
    santiago:  { lat: -33.15, lon: -70.67,  name: 'Santiago' },
    whitesands:{ lat: 32.50,  lon: -106.61, name: 'White Sands' },
    astana:    { lat: 51.17,  lon: 71.43,   name: 'Astana' }
  };
  const GROUND = {
    base: { cost: 0, st: ['svalbard', 'wallops'], name: L('Базовая сеть', 'Basic network'), desc: L('Свальбард + Уоллопс', 'Svalbard + Wallops') },
    ext:  { cost: 5, st: ['svalbard', 'wallops', 'fairbanks', 'mcmurdo', 'hbk', 'santiago', 'whitesands'], name: L('Сеть NASA NSN', 'NASA NSN network'), desc: L('7 станций по всему миру', '7 stations worldwide') }
  };
  const KZ_STATION = { cost: 3, name: L('+ своя станция в Астане', '+ own station in Astana') };

  const ROCKETS = {
    ride:   { cap: { leo: 0, polar: 0, sso: 220, geo: 0 }, cost: 6,  rel: 0.97, win: [45, 105],        name: L('Попутный запуск', 'Rideshare'), desc: L('Дёшево, только SSO, строгое расписание', 'Cheap, SSO only, fixed schedule') },
    light:  { cap: { leo: 320, polar: 230, sso: 240, geo: 0 }, cost: 9, rel: 0.93, win: [40, 55, 70, 85], name: L('Лёгкая ракета', 'Light rocket'), desc: L('Частые старты, надёжность пониже', 'Frequent launches, lower reliability') },
    medium: { cap: { leo: 2500, polar: 1800, sso: 1900, geo: 450 }, cost: 32, rel: 0.97, win: [50, 65, 80, 95], name: L('Средняя ракета', 'Medium rocket'), desc: L('Тяжёлый спутник или GEO', 'Heavy payloads or GEO') },
    heavy:  { cap: { leo: 16000, polar: 11000, sso: 12000, geo: 4500 }, cost: 62, rel: 0.99, win: [60, 90], name: L('Тяжёлая ракета', 'Heavy rocket'), desc: L('Надёжно и очень дорого', 'Reliable and very expensive') }
  };

  const BUS = { mass: 125, cost: 30, power: 70, days: 12, geoMass: 80 }; // platform; GEO needs an apogee motor
  const MEMORY_GB = 24;
  const TESTS = {
    vib:  { days: 5, cost: 1, name: L('Вибротест', 'Vibration test'), desc: L('Проверка тряски на старте. Без него может не раскрыться панель.', 'Shakes it like a launch. Without it a panel may not deploy.') },
    tvac: { days: 7, cost: 2, name: L('Термовакуум', 'Thermal vacuum'), desc: L('Космос в камере. Без него прибор может сбоить на орбите.', 'Space in a chamber. Without it an instrument may glitch in orbit.') }
  };

  // Target regions are real places. In flight, targets appear there at random times.
  const MISSIONS = {
    fire: {
      orbitHint: { leo: ['ok', L('Часто пролетает над средними широтами, где горит больше всего. Но одно и то же место видит лишь несколько раз в сутки.', 'Passes often over mid-latitudes where most fires burn. But it sees each place only a few times a day.')], polar: ['ok', L('Видит всю планету, но много времени тратит над льдами, где гореть нечему.', 'Sees the whole planet but wastes time over ice where nothing burns.')], sso: ['good', L('Облетает всю планету каждый день. Так летают спутники NASA с прибором VIIRS, которые ищут пожары.', 'Covers the whole planet daily. NASA satellites with the VIIRS fire sensor fly this way.')], geo: ['ok', L('Смотрит на Азию и Африку без перерыва, но пожары в Америке не увидит никогда. И ему нужна станция, которая его видит.', 'Stares at Asia and Africa non-stop, but never sees fires in the Americas. And it needs a station that can see it.')] },
      icon: 'fire', budget: 110, season: 60, date: '2027-07-01', ttl: 14, every: 2.6, r: 60,
      rel: { thermal: 1, imager: 0.5, spectro: 0.2 },
      name: L('Огненный дозор', 'Wildfire Watch'),
      goal: L('Находить лесные и степные пожары и доставлять снимки на Землю за 14 часов, пока огонь не разошёлся.', 'Find wildfires and get images to the ground within 14 hours, before they spread.'),
      tip: L('Пожары нужно доставлять быстро: важна не только съёмка, но и станции связи.', 'Speed matters: you need ground stations as much as cameras.'),
      places: [[52.5, 63.5, 'Kostanay'], [52.0, 76.0, 'Pavlodar'], [62.0, 129.0, 'Yakutia'], [51.0, 113.0, 'Transbaikal'], [52.0, -122.0, 'British Columbia'], [38.5, -121.0, 'California'], [-10.0, -63.0, 'Rondônia'], [-33.0, 150.0, 'New South Wales'], [38.1, 23.8, 'Attica'], [40.0, -8.0, 'Portugal'], [56.0, -115.0, 'Alberta'], [44.0, 79.0, 'Almaty region']],
      analog: { name: 'GOES-R · VIIRS · ECOSTRESS', text: L('GOES-R с геостационара обновляет снимок каждые 5–10 минут, VIIRS на полярных спутниках находит очаги в сотни метров, ECOSTRESS на МКС меряет температуру растений.', 'GOES-R refreshes every 5–10 min from GEO, VIIRS on polar satellites finds fires a few hundred metres across, ECOSTRESS on the ISS measures plant temperature.') }
    },
    crops: {
      orbitHint: { leo: ['ok', L('Пролетает над полем каждый раз в разное время суток — иногда ночью, когда камера слепа.', 'Passes at a different time of day each time — sometimes at night, when a camera is blind.')], polar: ['ok', L('Видит все поля, но освещение каждый раз разное.', 'Sees every field, but lighting differs each time.')], sso: ['good', L('Прилетает к каждому полю в одно и то же утреннее время — всегда светло, снимки легко сравнивать. Так летает Landsat.', 'Arrives over each field at the same morning time — always lit, easy to compare. Landsat flies this way.')], geo: ['bad', L('До Земли 36 000 км — отдельные поля почти не разглядеть.', 'Earth is 36,000 km away — single fields are barely visible.')] },
      icon: 'wheat', budget: 120, season: 55, date: '2027-06-01', ttl: 30, every: 3, r: 110,
      rel: { imager: 1, thermal: 0.7, spectro: 0.6 },
      name: L('Урожай степи', 'Steppe Harvest'),
      goal: L('Снимать поля пшеницы и находить засуху. Камере нужен дневной свет.', 'Image wheat fields and spot drought. Cameras need daylight.'),
      tip: L('Оптике нужен день над полем. Солнечно-синхронная орбита приходит в одно и то же время суток.', 'Optics need daylight over the field. A sun-synchronous orbit arrives at the same local time.'),
      places: [[53.2, 63.6, 'Kostanay'], [51.5, 70.0, 'Akmola'], [38.5, -98.5, 'Kansas'], [51.0, -106.0, 'Saskatchewan'], [49.6, 34.5, 'Poltava'], [30.9, 75.8, 'Punjab'], [-35.0, -61.0, 'Pampas'], [-32.0, 147.5, 'NSW wheatbelt'], [34.5, 113.6, 'Henan'], [45.0, 41.0, 'Stavropol'], [47.5, 2.0, 'Beauce']],
      analog: { name: 'Landsat 9 · Sentinel-2', text: L('Landsat 9 (NASA/USGS, 2021) снимает Землю с солнечно-синхронной орбиты 705 км и возвращается на то же место каждые 16 дней.', 'Landsat 9 (NASA/USGS, 2021) images Earth from a 705 km sun-synchronous orbit, revisiting each spot every 16 days.') }
    },
    seas: {
      orbitHint: { leo: ['good', L('Хороший выбор: настоящие спутники-альтиметры Jason-3 и Sentinel-6 летают на наклонных орбитах.', 'Good choice: real altimeter satellites Jason-3 and Sentinel-6 fly inclined orbits.')], polar: ['ok', L('Подойдёт, но тропические моря будет посещать реже.', 'Works, but visits tropical seas less often.')], sso: ['ok', L('Подойдёт для игры. В реальности на такой орбите приливы искажают измерения.', 'Fine for the game. In reality tides distort measurements on this orbit.')], geo: ['bad', L('Радар должен смотреть прямо вниз с низкой орбиты. С 36 000 км он бесполезен.', 'Radar must look straight down from low orbit. From 36,000 km it is useless.')] },
      icon: 'wave', budget: 125, season: 70, date: '2027-09-01', ttl: 40, every: 3.2, r: 300,
      rel: { radar: 1, lidar: 0.5, spectro: 0.2 },
      name: L('Подъём океана', 'Rising Seas'),
      goal: L('Измерять уровень моря радаром там, где угроза острее всего — от Мальдив до Каспия.', 'Measure sea level with radar where it matters most — from the Maldives to the Caspian.'),
      tip: L('Радар смотрит только вниз: трасса спутника должна пройти прямо над целью.', 'Radar looks straight down: the ground track must cross the target.'),
      places: [[3.2, 73.2, 'Maldives'], [20.0, 90.0, 'Bay of Bengal'], [-8.0, 179.0, 'Tuvalu'], [38.0, -68.0, 'Gulf Stream'], [0.0, -145.0, 'Niño 3.4'], [43.0, 15.0, 'Adriatic'], [42.0, 51.0, 'Caspian Sea'], [56.0, 3.0, 'North Sea'], [25.0, -90.0, 'Gulf of Mexico'], [-20.0, 57.5, 'Mauritius'], [10.0, 125.0, 'Philippine Sea']],
      analog: { name: 'Sentinel-6 · Jason-3', text: L('Sentinel-6 (NASA/ESA, 2020) меряет уровень океана радаром с орбиты 1336 км и наклонением 66°, продолжая ряд измерений с 1992 года.', 'Sentinel-6 (NASA/ESA, 2020) measures sea level by radar from a 1,336 km, 66° orbit, continuing a record from 1992.') }
    },
    ice: {
      orbitHint: { leo: ['bad', L('Эта орбита не поднимается выше 52° широты. Гренландию и Антарктиду спутник не увидит никогда!', 'This orbit never goes above 52° latitude. It will never see Greenland or Antarctica!')], polar: ['good', L('Проходит прямо над полюсами на каждом витке. Так летает ICESat-2.', 'Passes right over the poles every orbit. ICESat-2 flies this way.')], sso: ['ok', L('Достаёт до 82° широты — почти все ледники видны.', 'Reaches 82° latitude — most glaciers are visible.')], geo: ['bad', L('Висит над экватором — полюса с него не видны.', 'Hovers over the equator — the poles are out of view.')] },
      icon: 'ice', budget: 160, season: 75, date: '2027-07-15', ttl: 48, every: 3.5, r: 250,
      rel: { lidar: 1, radar: 0.7, imager: 0.3 },
      name: L('Тающие полюса', 'Melting Poles'),
      goal: L('Измерять высоту ледников Гренландии и Антарктиды. В июле в Антарктиде полярная ночь!', 'Measure glacier height in Greenland and Antarctica. In July, Antarctica is in polar night!'),
      tip: L('Орбита должна доставать до полюсов, а в Антарктиде темно — нужен активный прибор.', 'The orbit must reach the poles, and Antarctica is dark — you need an active instrument.'),
      places: [[69.2, -49.8, 'Jakobshavn'], [79.0, -22.0, 'Zachariae'], [80.7, -60.0, 'Petermann'], [-75.5, -106.8, 'Thwaites'], [-75.2, -100.0, 'Pine Island'], [-68.0, -62.0, 'Larsen C'], [-67.0, 116.0, 'Totten'], [79.8, 24.0, 'Austfonna'], [60.0, -140.5, 'Malaspina'], [-49.5, -73.4, 'Patagonia'], [43.05, 77.08, 'Tuyuksu']],
      analog: { name: 'ICESat-2 · CryoSat-2', text: L('ICESat-2 (NASA, 2018) несёт лазер ATLAS: 10 000 импульсов в секунду с орбиты ~500 км и наклонением 92°.', 'ICESat-2 (NASA, 2018) carries the ATLAS laser: 10,000 pulses a second from a ~500 km, 92° orbit.') }
    }
  };

  return { L, ORBITS, INSTR, POWER, RADIO, STATIONS, GROUND, KZ_STATION, ROCKETS, BUS, MEMORY_GB, TESTS, MISSIONS };
})();
