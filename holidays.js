// Bayerische Feiertage (berechnet, gelten für beliebige Jahre) und Schulferien
// (amtlich: Bekanntmachung des Kultusministeriums, BayMBl. 2022 Nr. 747, Schuljahre bis 2029/2030).
// Ab Herbst 2030 gibt es noch keine amtlichen Ferientermine: dort neue Zeilen in FERIEN ergänzen.
const Kalender = (() => {
  // Mariä Himmelfahrt (15.8.) ist in Bayern nur in Gemeinden mit überwiegend katholischer
  // Bevölkerung Feiertag. Auf false setzen, falls er bei euch kein Feiertag ist.
  const MARIA_HIMMELFAHRT = true;

  const p = n => String(n).padStart(2, '0');
  const f = d => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const plus = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  function ostern(y) {                       // Gaußsche Osterformel
    const a = y % 19, b = Math.floor(y / 100), c = y % 100;
    const d = Math.floor(b / 4), e = b % 4, g = Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const t = h + l - 7 * m + 114;
    return new Date(y, Math.floor(t / 31) - 1, (t % 31) + 1);
  }

  const cache = {};
  function feiertage(y) {
    if (cache[y]) return cache[y];
    const o = ostern(y), m = {};
    const add = (d, n) => { m[f(d)] = n; };
    add(new Date(y, 0, 1), 'Neujahr');
    add(new Date(y, 0, 6), 'Heilige Drei Könige');
    add(plus(o, -2), 'Karfreitag');
    add(plus(o, 1), 'Ostermontag');
    add(new Date(y, 4, 1), 'Tag der Arbeit');
    add(plus(o, 39), 'Christi Himmelfahrt');
    add(plus(o, 50), 'Pfingstmontag');
    add(plus(o, 60), 'Fronleichnam');
    if (MARIA_HIMMELFAHRT) add(new Date(y, 7, 15), 'Mariä Himmelfahrt');
    add(new Date(y, 9, 3), 'Tag der Deutschen Einheit');
    add(new Date(y, 10, 1), 'Allerheiligen');
    add(new Date(y, 11, 25), '1. Weihnachtstag');
    add(new Date(y, 11, 26), '2. Weihnachtstag');
    return (cache[y] = m);
  }

  // [Name, erster Ferientag, letzter Ferientag]
  const FERIEN = [
    ['Sommerferien',      '2024-07-29', '2024-09-09'],
    ['Herbstferien',      '2024-10-28', '2024-10-31'],
    ['Weihnachtsferien',  '2024-12-23', '2025-01-03'],
    ['Faschingsferien',   '2025-03-03', '2025-03-07'],
    ['Osterferien',       '2025-04-14', '2025-04-25'],
    ['Pfingstferien',     '2025-06-10', '2025-06-20'],
    ['Sommerferien',      '2025-08-01', '2025-09-15'],
    ['Herbstferien',      '2025-11-03', '2025-11-07'],
    ['Weihnachtsferien',  '2025-12-22', '2026-01-05'],
    ['Faschingsferien',   '2026-02-16', '2026-02-20'],
    ['Osterferien',       '2026-03-30', '2026-04-10'],
    ['Pfingstferien',     '2026-05-26', '2026-06-05'],
    ['Sommerferien',      '2026-08-03', '2026-09-14'],
    ['Herbstferien',      '2026-11-02', '2026-11-06'],
    ['Weihnachtsferien',  '2026-12-24', '2027-01-08'],
    ['Faschingsferien',   '2027-02-08', '2027-02-12'],
    ['Osterferien',       '2027-03-22', '2027-04-02'],
    ['Pfingstferien',     '2027-05-18', '2027-05-28'],
    ['Sommerferien',      '2027-08-02', '2027-09-13'],
    ['Herbstferien',      '2027-11-02', '2027-11-05'],
    ['Weihnachtsferien',  '2027-12-24', '2028-01-07'],
    ['Faschingsferien',   '2028-02-28', '2028-03-03'],
    ['Osterferien',       '2028-04-10', '2028-04-21'],
    ['Pfingstferien',     '2028-06-06', '2028-06-16'],
    ['Sommerferien',      '2028-07-31', '2028-09-11'],
    ['Herbstferien',      '2028-10-30', '2028-11-03'],
    ['Weihnachtsferien',  '2028-12-23', '2029-01-05'],
    ['Faschingsferien',   '2029-02-12', '2029-02-16'],
    ['Osterferien',       '2029-03-26', '2029-04-06'],
    ['Pfingstferien',     '2029-05-22', '2029-06-01'],
    ['Sommerferien',      '2029-07-30', '2029-09-10'],
    ['Herbstferien',      '2029-10-29', '2029-11-02'],
    ['Weihnachtsferien',  '2029-12-24', '2030-01-04'],
    ['Faschingsferien',   '2030-03-04', '2030-03-08'],
    ['Osterferien',       '2030-04-15', '2030-04-26'],
    ['Pfingstferien',     '2030-06-11', '2030-06-21'],
    ['Sommerferien',      '2030-07-29', '2030-09-09'],
  ];

  // Buß- und Bettag: Mittwoch vor dem 23. November, in Bayern für Schüler unterrichtsfrei
  function bussUndBettag(y) {
    const d = new Date(y, 10, 22);
    while (d.getDay() !== 3) d.setDate(d.getDate() - 1);
    return f(d);
  }

  return {
    // Name des gesetzlichen Feiertags oder null
    feiertag(ds) { return feiertage(+ds.slice(0, 4))[ds] || null; },
    // { name, start } der Schulferien oder null
    ferien(ds) {
      for (const [name, von, bis] of FERIEN) if (ds >= von && ds <= bis) return { name, start: von };
      const b = bussUndBettag(+ds.slice(0, 4));
      return ds === b ? { name: 'Buß- und Bettag (schulfrei)', start: b } : null;
    }
  };
})();
