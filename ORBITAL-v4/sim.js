/* ORBITAL v3 — real orbital mechanics, simplified only where noted. */
window.SIM = (function () {
  const RE = 6371, MU = 398600.4418, WE = 7.2921159e-5, J2 = 1.08263e-3;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;

  // Orbit constants from altitude/inclination: Kepler period + J2 nodal precession.
  function orbit(o) {
    const a = RE + o.alt, n = Math.sqrt(MU / a ** 3), inc = o.inc * D2R;
    const raanDot = -1.5 * n * J2 * (RE / a) ** 2 * Math.cos(inc);
    const eclFrac = Math.asin(RE / a) / Math.PI;              // worst-case (sun in orbit plane) shadow fraction
    const ftp = footprint(a);
    const vis = stationRange(a, 5);
    return { a, n, inc, raanDot, period: 2 * Math.PI / n, eclFrac, geo: o.alt > 30000, lon: o.lon || 0, ftpPassive: ftp, ftpActive: 0.25 * D2R, vis,
      passMin: Math.min(2 * vis / n / 60, 24 * 60) };
  }
  // Ground radius (central angle, rad) reachable by pointing 45° off-nadir; GEO limited to ~70° of the visible disc.
  function footprint(a) {
    const s = (a / RE) * Math.sin(45 * D2R);
    if (s >= 1) return 70 * D2R;
    return Math.asin(s) - 45 * D2R;
  }
  // Ground-station visibility radius (central angle) for minimum elevation eps.
  function stationRange(a, epsDeg) { const e = epsDeg * D2R; return Math.acos((RE / a) * Math.cos(e)) - e; }

  // Sub-satellite point (deg) at t seconds after epoch. raan0 chosen so SSO crosses ~10:30 local time.
  function subPoint(O, t, raan0, gmst0) {
    if (O.geo) return { lat: 0, lon: O.lon };
    const u = O.n * t, raan = raan0 + O.raanDot * t;
    const cu = Math.cos(u), su = Math.sin(u), ci = Math.cos(O.inc), si = Math.sin(O.inc);
    const x = Math.cos(raan) * cu - Math.sin(raan) * su * ci;
    const y = Math.sin(raan) * cu + Math.cos(raan) * su * ci;
    const z = su * si;
    const gmst = gmst0 + WE * t;
    return { lat: Math.asin(z) * R2D, lon: wrap(Math.atan2(y, x) * R2D - gmst * R2D) };
  }
  const wrap = (l) => ((l + 540) % 360) - 180;

  // Sun: declination from day of year, subsolar longitude from UTC time (equation of time ignored, < 4°).
  function sun(epochMs, t) {
    const d = new Date(epochMs + t * 1000);
    const start = Date.UTC(d.getUTCFullYear(), 0, 0);
    const doy = (d - start) / 864e5;
    const dec = -23.44 * Math.cos(2 * Math.PI * (doy + 10) / 365.25);
    const hours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
    const lon = wrap(-15 * (hours - 12));
    return { lat: dec, lon, v: vec(dec, lon) };
  }
  const vec = (lat, lon) => { const a = lat * D2R, b = lon * D2R; return [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)]; };
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  // Great-circle central angle (rad)
  function gc(lat1, lon1, lat2, lon2) { return Math.acos(Math.max(-1, Math.min(1, dot(vec(lat1, lon1), vec(lat2, lon2))))); }
  // Cylindrical Earth shadow
  function inShadow(O, p, s) {
    const r = vec(p.lat, p.lon), k = dot(r, s.v);
    if (k >= 0) return false;
    const perp = Math.sqrt(Math.max(0, 1 - k * k)) * O.a;
    return perp < RE;
  }
  // Sun elevation (deg) at a ground point
  const sunElev = (lat, lon, s) => Math.asin(dot(vec(lat, lon), s.v)) * R2D;

  // Points of a small circle (for footprints/visibility rings), returns [lat, lon] list
  function ring(lat, lon, ang, n = 72) {
    const out = [], la = lat * D2R, lo = lon * D2R;
    for (let i = 0; i < n; i++) {
      const b = (i / n) * 2 * Math.PI;
      const la2 = Math.asin(Math.sin(la) * Math.cos(ang) + Math.cos(la) * Math.sin(ang) * Math.cos(b));
      const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(ang) * Math.cos(la), Math.cos(ang) - Math.sin(la) * Math.sin(la2));
      out.push([la2 * R2D, wrap(lo2 * R2D)]);
    }
    return out;
  }
  // raan0 so that SSO-like orbits cross the equator northbound at ~10:30 local solar time at epoch
  function raanFor(epochMs, gmst0) { const s = sun(epochMs, 0); return (s.lon * D2R + gmst0) + (-1.5 * 15) * D2R + Math.PI; }

  return { RE, MU, D2R, R2D, orbit, subPoint, sun, gc, inShadow, sunElev, ring, wrap, raanFor, vec, dot };
})();
