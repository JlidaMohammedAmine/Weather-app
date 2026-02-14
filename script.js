/**
 * WeatherNow - OpenWeather implementation
 * 1) Create a free API key: https://openweathermap.org/api
 * 2) Put it below.
 */

const API_KEY = "7f9cf1d38a046e7c465971fe793874a9"; // <-- required

const els = {
  form: document.getElementById("searchForm"),
  cityInput: document.getElementById("cityInput"),
  geoBtn: document.getElementById("geoBtn"),
  status: document.getElementById("status"),
  unitChips: [...document.querySelectorAll(".chip[data-unit]")],

  placeName: document.getElementById("placeName"),
  placeMeta: document.getElementById("placeMeta"),
  conditionBadge: document.getElementById("conditionBadge"),

  tempNow: document.getElementById("tempNow"),
  tempUnit: document.getElementById("tempUnit"),
  feelsLike: document.getElementById("feelsLike"),
  bigIcon: document.getElementById("bigIcon"),
  bigDesc: document.getElementById("bigDesc"),

  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  pressure: document.getElementById("pressure"),
  visibility: document.getElementById("visibility"),

  forecastRow: document.getElementById("forecastRow"),
  daysList: document.getElementById("daysList"),
};

const state = {
  unit: "metric", // metric=°C, imperial=°F
  lastQuery: null, // { type: 'city', value } or { type:'coords', lat, lon }
};

function setStatus(msg) {
  els.status.textContent = msg || "";
}

function setUnit(unit) {
  state.unit = unit;
  els.tempUnit.textContent = unit === "metric" ? "°C" : "°F";

  els.unitChips.forEach((b) => {
    const pressed = b.dataset.unit === unit;
    b.setAttribute("aria-pressed", pressed ? "true" : "false");
  });

  // If something is already displayed, re-fetch in new unit
  if (state.lastQuery) refresh();
}

function requireKey() {
  if (!API_KEY || API_KEY.includes("PASTE_YOUR")) {
    setStatus("Add your OpenWeather API key in script.js (API_KEY).");
    return false;
  }
  return true;
}

function formatLocalTimeFromUnix(unixSeconds, tzOffsetSeconds) {
  const ms = (unixSeconds + tzOffsetSeconds) * 1000;
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDayNameFromUnix(unixSeconds, tzOffsetSeconds) {
  const ms = (unixSeconds + tzOffsetSeconds) * 1000;
  const d = new Date(ms);
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return names[d.getUTCDay()];
}

function iconFromOpenWeather(code) {
  // OpenWeather icon codes like "01d", "02n"
  // Use emoji fallback for clean UI.
  const map = {
    "01d": "☀️",
    "01n": "🌙",
    "02d": "🌤️",
    "02n": "☁️",
    "03d": "☁️",
    "03n": "☁️",
    "04d": "☁️",
    "04n": "☁️",
    "09d": "🌧️",
    "09n": "🌧️",
    "10d": "🌦️",
    "10n": "🌧️",
    "11d": "⛈️",
    "11n": "⛈️",
    "13d": "❄️",
    "13n": "❄️",
    "50d": "🌫️",
    "50n": "🌫️",
  };
  return map[code] || "⛅";
}

function windUnit() {
  return state.unit === "metric" ? "m/s" : "mph";
}

function visibilityUnit() {
  return state.unit === "metric" ? "km" : "mi";
}

function toVisibility(visMeters) {
  if (visMeters == null) return "—";
  if (state.unit === "metric") return `${Math.round(visMeters / 1000)} km`;
  return `${Math.round(visMeters / 1609)} mi`;
}

function roundTemp(t) {
  if (t == null || Number.isNaN(t)) return "—";
  return Math.round(t);
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${txt ? `: ${txt}` : ""}`);
  }
  return res.json();
}

async function geocodeCity(city) {
  const q = encodeURIComponent(city);
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${q}&limit=1&appid=${API_KEY}`;
  const data = await fetchJSON(url);
  if (!Array.isArray(data) || data.length === 0) throw new Error("City not found.");
  const g = data[0];
  return { name: g.name, country: g.country, lat: g.lat, lon: g.lon, state: g.state };
}

async function reverseGeocode(lat, lon) {
  const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
  const data = await fetchJSON(url);
  if (!Array.isArray(data) || data.length === 0) return null;
  const g = data[0];
  return { name: g.name, country: g.country, state: g.state };
}

async function fetchWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${API_KEY}`;
  return fetchJSON(url);
}

async function fetchForecast(lat, lon) {
  // 5 day / 3-hour forecast
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${API_KEY}`;
  return fetchJSON(url);
}

function renderCurrent(weather, placeLabel) {
  const cond = weather.weather?.[0];
  const main = weather.main || {};
  const wind = weather.wind || {};

  els.placeName.textContent = placeLabel || "—";

  const tz = weather.timezone ?? 0;
  const now = formatLocalTimeFromUnix(weather.dt, tz);

  const extra = [];
  if (weather.sys?.country) extra.push(weather.sys.country);
  extra.push(`Local time ${now}`);
  els.placeMeta.textContent = extra.join(" • ");

  els.conditionBadge.textContent = cond?.main || "—";
  els.tempNow.textContent = roundTemp(main.temp);
  els.feelsLike.textContent = roundTemp(main.feels_like);

  const icon = iconFromOpenWeather(cond?.icon);
  els.bigIcon.textContent = icon;
  els.bigDesc.textContent = cond?.description ? capitalize(cond.description) : "—";

  els.humidity.textContent = main.humidity != null ? `${main.humidity}%` : "—";
  els.wind.textContent = wind.speed != null ? `${Math.round(wind.speed)} ${windUnit()}` : "—";
  els.pressure.textContent = main.pressure != null ? `${main.pressure} hPa` : "—";
  els.visibility.textContent = toVisibility(weather.visibility);
}

function renderHourly(forecast) {
  const tz = forecast.city?.timezone ?? 0;
  const list = Array.isArray(forecast.list) ? forecast.list : [];

  // next 4 points (~12 hours)
  const next = list.slice(0, 4);

  els.forecastRow.innerHTML = next
    .map((p, idx) => {
      const time = idx === 0 ? "Now" : formatLocalTimeFromUnix(p.dt, tz);
      const temp = roundTemp(p.main?.temp);
      const icon = iconFromOpenWeather(p.weather?.[0]?.icon);
      return `
        <div class="pill">
          <span class="pill__time">${escapeHtml(time)}</span>
          <span class="pill__icon" aria-hidden="true">${icon}</span>
          <span class="pill__temp">${temp}${state.unit === "metric" ? "°" : "°"}</span>
        </div>
      `;
    })
    .join("");
}

function groupDaily(forecast) {
  // OpenWeather forecast: 3h steps. We'll group by day name and compute min/max.
  const tz = forecast.city?.timezone ?? 0;
  const list = Array.isArray(forecast.list) ? forecast.list : [];

  const byDay = new Map();
  for (const p of list) {
    const day = formatDayNameFromUnix(p.dt, tz);
    const entry = byDay.get(day) || { temps: [], icons: [], descs: [] };

    const t = p.main?.temp;
    if (typeof t === "number") entry.temps.push(t);

    const w = p.weather?.[0];
    if (w?.icon) entry.icons.push(w.icon);
    if (w?.main) entry.descs.push(w.main);

    byDay.set(day, entry);
  }

  // Keep first 5 unique days
  const days = Array.from(byDay.entries()).slice(0, 5).map(([day, entry], idx) => {
    const min = entry.temps.length ? Math.round(Math.min(...entry.temps)) : null;
    const max = entry.temps.length ? Math.round(Math.max(...entry.temps)) : null;

    // pick most frequent icon if possible
    const iconCode = mostFrequent(entry.icons) || "02d";
    const icon = iconFromOpenWeather(iconCode);

    const desc = mostFrequent(entry.descs) || "—";
    const label = idx === 0 ? "Today" : day;

    return { label, icon, desc, min, max };
  });

  return days;
}

function renderDaily(days) {
  els.daysList.innerHTML = days
    .map((d) => {
      return `
        <div class="day">
          <span class="day__name">${escapeHtml(d.label)}</span>
          <span class="day__mid"><span aria-hidden="true">${d.icon}</span> ${escapeHtml(d.desc)}</span>
          <span class="day__hi">${d.max != null ? `${d.max}°` : "—"}</span>
          <span class="day__lo">${d.min != null ? `${d.min}°` : "—"}</span>
        </div>
      `;
    })
    .join("");
}

function mostFrequent(arr) {
  if (!arr || arr.length === 0) return null;
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  let best = null;
  let bestCount = -1;
  for (const [k, v] of m.entries()) {
    if (v > bestCount) {
      best = k;
      bestCount = v;
    }
  }
  return best;
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadByCity(city) {
  if (!requireKey()) return;
  const q = (city || "").trim();
  if (!q) {
    setStatus("Type a city name first.");
    return;
  }

  setStatus("Loading…");
  els.geoBtn.disabled = true;

  try {
    const geo = await geocodeCity(q);
    state.lastQuery = { type: "coords", lat: geo.lat, lon: geo.lon, label: `${geo.name}${geo.state ? ", " + geo.state : ""}` };

    const [w, f] = await Promise.all([fetchWeather(geo.lat, geo.lon), fetchForecast(geo.lat, geo.lon)]);

    const label = `${geo.name}${geo.state ? ", " + geo.state : ""}`;
    const place = `${label}${geo.country ? ", " + geo.country : ""}`;

    renderCurrent(w, place);
    renderHourly(f);
    renderDaily(groupDaily(f));

    setStatus("");
  } catch (e) {
    setStatus(e?.message || "Something went wrong.");
  } finally {
    els.geoBtn.disabled = false;
  }
}

async function loadByCoords(lat, lon) {
  if (!requireKey()) return;

  setStatus("Loading…");
  els.geoBtn.disabled = true;

  try {
    const place = await reverseGeocode(lat, lon);
    state.lastQuery = { type: "coords", lat, lon, label: place?.name || "My location" };

    const [w, f] = await Promise.all([fetchWeather(lat, lon), fetchForecast(lat, lon)]);

    const label = place ? `${place.name}${place.state ? ", " + place.state : ""}${place.country ? ", " + place.country : ""}` : "My location";
    renderCurrent(w, label);
    renderHourly(f);
    renderDaily(groupDaily(f));

    setStatus("");
  } catch (e) {
    setStatus(e?.message || "Something went wrong.");
  } finally {
    els.geoBtn.disabled = false;
  }
}

function refresh() {
  const q = state.lastQuery;
  if (!q) return;
  if (q.type === "coords") loadByCoords(q.lat, q.lon);
}

function handleGeo() {
  if (!navigator.geolocation) {
    setStatus("Geolocation not supported in this browser.");
    return;
  }

  setStatus("Requesting location…");
  els.geoBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      loadByCoords(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      setStatus(err.message || "Location permission denied.");
      els.geoBtn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Events
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  loadByCity(els.cityInput.value);
});

els.geoBtn.addEventListener("click", handleGeo);

els.unitChips.forEach((btn) => {
  btn.addEventListener("click", () => setUnit(btn.dataset.unit));
});

// Default
setUnit("metric");

document.getElementById("year").textContent = new Date().getFullYear();

