/* Atmos — Open-Meteo (no API key) */

(function () {
  "use strict";

  // ---------- DOM ----------
  const el = (id) => document.getElementById(id);

  const searchForm = el("searchForm");
  const qInput = el("q");
  const suggestions = el("suggestions");

  const geoBtn = el("geoBtn");
  const unitC = el("unitC");
  const unitF = el("unitF");
  const themeBtn = el("themeBtn");
  const refreshBtn = el("refreshBtn");

  const locationName = el("locationName");
  const metaLine = el("metaLine");

  const tempNow = el("tempNow");
  const summaryNow = el("summaryNow");
  const feelsNow = el("feelsNow");
  const windNow = el("windNow");
  const humidityNow = el("humidityNow");
  const precipNow = el("precipNow");
  const uvNow = el("uvNow");
  const visNow = el("visNow");
  const pressNow = el("pressNow");

  const todayMin = el("todayMin");
  const todayMax = el("todayMax");
  const rangeFill = el("rangeFill");
  const sunLine = el("sunLine");
  const heroIcon = el("heroIcon");

  const comfortHint = el("comfortHint");
  const heatIndex = el("heatIndex");
  const dewPoint = el("dewPoint");
  const cloudNow = el("cloudNow");
  const popNow = el("popNow");

  const heatFill = el("heatFill");
  const dewFill = el("dewFill");
  const cloudFill = el("cloudFill");
  const popFill = el("popFill");

  const hourlyRow = el("hourlyRow");
  const dailyList = el("dailyList");
  const insights = el("insights");

  const saveBtn = el("saveBtn");
  const clearSavedBtn = el("clearSavedBtn");
  const savedChips = el("savedChips");
  const recentChips = el("recentChips");

  const loading = el("loading");
  const error = el("error");
  const errorText = el("errorText");
  const retryBtn = el("retryBtn");
  const useCacheBtn = el("useCacheBtn");

  const toast = el("toast");
  const toastText = el("toastText");
  const toastIcon = toast.querySelector(".toast__icon");
  const toastClose = el("toastClose");

  const modal = el("modal");
  const modalTitle = el("modalTitle");
  const modalBody = el("modalBody");

  // ---------- STATE / STORAGE ----------
  const LS = {
    units: "atmos.units",
    theme: "atmos.theme",
    saved: "atmos.saved",
    recent: "atmos.recent",
    last: "atmos.lastPayload"
  };

  const state = {
    units: "C",
    theme: "dark",
    place: null,
    lastPayload: null
  };

  // ---------- API ----------
  const GEO_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
  const REV_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/reverse";
  const WX_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

  // ---------- UTIL ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round = (n) => Math.round(n);
  const fmt1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : "—");

  const kmhToMph = (kmh) => kmh * 0.621371;
  const mmToIn = (mm) => mm / 25.4;
  const hPaToInHg = (hPa) => hPa * 0.0295299830714;
  const kmToMi = (km) => km * 0.621371;

  const cToF = (c) => (c * 9) / 5 + 32;

  function fmtTemp(c) {
    if (!Number.isFinite(c)) return "—";
    return state.units === "C" ? `${round(c)}°C` : `${round(cToF(c))}°F`;
  }
  function fmtWind(kmh) {
    if (!Number.isFinite(kmh)) return "—";
    return state.units === "C" ? `${round(kmh)} km/h` : `${round(kmhToMph(kmh))} mph`;
  }
  function fmtPrecip(mm) {
    if (!Number.isFinite(mm)) return "—";
    return state.units === "C" ? `${fmt1(mm)} mm` : `${fmt1(mmToIn(mm))} in`;
  }
  function fmtPressure(hPa) {
    if (!Number.isFinite(hPa)) return "—";
    return state.units === "C" ? `${round(hPa)} hPa` : `${fmt1(hPaToInHg(hPa))} inHg`;
  }
  function fmtVis(m) {
    if (!Number.isFinite(m)) return "—";
    const km = m / 1000;
    return state.units === "C" ? `${fmt1(km)} km` : `${fmt1(kmToMi(km))} mi`;
  }
  function windDirText(deg) {
    if (!Number.isFinite(deg)) return "—";
    const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
    const i = Math.round(deg / 22.5) % 16;
    return dirs[i];
  }
  function fmtTimeLocal(iso, timeZone, opts) {
    try {
      return new Intl.DateTimeFormat(undefined, { timeZone, ...opts }).format(new Date(iso));
    } catch {
      return "—";
    }
  }
  function fmtDay(iso, timeZone) {
    return fmtTimeLocal(iso, timeZone, { weekday: "short" });
  }
  function fmtFullDate(iso, timeZone) {
    return fmtTimeLocal(iso, timeZone, { weekday: "long", month: "short", day: "numeric" });
  }

  // ---------- UI helpers ----------
  function showLoading(on) { loading.hidden = !on; }
  function showError(on, message) {
    error.hidden = !on;
    if (on) errorText.textContent = message || "Unknown error.";
  }
  function setMeter(fillEl, pct) { fillEl.style.width = `${clamp(pct, 0, 100)}%`; }

  function toastShow(message, kind = "info") {
    toastText.textContent = message;
    toast.hidden = false;
    toastIcon.innerHTML = ({ info: iconInfo(), ok: iconCheck(), warn: iconWarn(), bad: iconBad() }[kind] || iconInfo());
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (toast.hidden = true), 3800);
  }

  function modalOpen(title, html) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function modalClose() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }
  modal.addEventListener("click", (e) => { if (e.target?.dataset?.close) modalClose(); });
  window.addEventListener("keydown", (e) => { if (!modal.hidden && e.key === "Escape") modalClose(); });

  // ---------- Storage ----------
  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function placeLabel(p) {
    if (!p) return "—";
    const parts = [p.name];
    if (p.admin1) parts.push(p.admin1);
    if (p.country) parts.push(p.country);
    return parts.join(", ");
  }
  function setPlace(p) { state.place = p; locationName.textContent = placeLabel(p); }

  // ---------- Prefs ----------
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(LS.theme, theme);
  }
  function renderAll(payload) {
    showError(false);
  // Hard guard: if API response is incomplete, don't crash the whole app.
  if (!payload || !payload.current || !payload.daily || !payload.hourly) {
    throw new Error("Weather payload missing required sections (current/daily/hourly).");
  }

  state.lastPayload = payload;

  const tz = payload.timezone || "auto";
  const c = payload.current;
  const d = payload.daily;

  // Header/meta
  metaLine.textContent =
    `${fmtFullDate(c.time, tz)} • Local time ${fmtTimeLocal(c.time, tz, { hour: "2-digit", minute: "2-digit" })}`;

  // Main current section
  tempNow.textContent = fmtTemp(c.temperature_2m);
  summaryNow.textContent = codeToText(c.weather_code);
  feelsNow.textContent = `Feels like ${fmtTemp(c.apparent_temperature)} • ${c.is_day ? "Day" : "Night"}`;

  windNow.textContent = `${fmtWind(c.wind_speed_10m)} ${windDirText(c.wind_direction_10m)}`;
  humidityNow.textContent = Number.isFinite(c.relative_humidity_2m) ? `${Math.round(c.relative_humidity_2m)}%` : "—";
  precipNow.textContent = fmtPrecip(c.precipitation ?? 0);
  uvNow.textContent = Number.isFinite(c.uv_index) ? (Number.isFinite(c.uv_index) ? c.uv_index.toFixed(1) : "—") : "—";
  visNow.textContent = fmtVis(c.visibility);
  pressNow.textContent = fmtPressure(c.pressure_msl);

  // Today range
  const minC = d.temperature_2m_min?.[0];
  const maxC = d.temperature_2m_max?.[0];
  renderHeroRange(minC, maxC, c.temperature_2m);

  // Sunrise/sunset
  const sr = d.sunrise?.[0];
  const ss = d.sunset?.[0];
  sunLine.textContent = (sr && ss)
    ? `Sunrise ${fmtTimeLocal(sr, tz, { hour: "2-digit", minute: "2-digit" })} • Sunset ${fmtTimeLocal(ss, tz, { hour: "2-digit", minute: "2-digit" })}`
    : "—";

  // Hero icon
  heroIcon.innerHTML = iconFor(c.weather_code, !!c.is_day);

  // Signals
  const dewC = calcDewPointC(c.temperature_2m, c.relative_humidity_2m);
  const hiC = calcHeatIndexC(c.temperature_2m, c.relative_humidity_2m);

  dewPoint.textContent = fmtTemp(dewC);
  heatIndex.textContent = fmtTemp(hiC);

  cloudNow.textContent = Number.isFinite(c.cloud_cover) ? `${Math.round(c.cloud_cover)}%` : "—";

  const nextPop = pickNextHour(payload, "precipitation_probability") ?? 0;
  popNow.textContent = `${Math.round(nextPop)}%`;

  setMeter(heatFill, clamp(((hiC - 20) / 25) * 100, 0, 100));
  setMeter(dewFill, clamp((dewC / 26) * 100, 0, 100));
  setMeter(cloudFill, clamp(c.cloud_cover ?? 0, 0, 100));
  setMeter(popFill, clamp(nextPop ?? 0, 0, 100));

  comfortHint.textContent = comfortLabel(dewC);

  // Forecast sections
  renderHourly(payload);
  renderDaily(payload);
  renderInsights(payload);

  // Cache (uses LS.last which in your file is "atmos.lastPayload")
  saveJSON(LS.last, {
    ts: Date.now(),
    place: state.place,
    payload: state.lastPayload,
    units: state.units
  });
}


  function applyUnits(units) {
    state.units = units;
    localStorage.setItem(LS.units, units);
    unitC.setAttribute("aria-pressed", units === "C" ? "true" : "false");
    unitF.setAttribute("aria-pressed", units === "F" ? "true" : "false");
    if (state.lastPayload) renderAll(state.lastPayload);
  }
  function initPrefs() {
    const u = localStorage.getItem(LS.units);
    const t = localStorage.getItem(LS.theme);
    applyUnits(u === "F" ? "F" : "C");
    if (t === "light" || t === "dark") applyTheme(t);
    else applyTheme(window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark");
  }

  // ---------- Fetch ----------
  async function fetchJSON(url, ctx) {
    let res;
    try { res = await fetch(url, { headers: { "Accept": "application/json" } }); }
    catch (e) { throw new Error(`[${ctx}] Fetch failed: ${e?.message || String(e)}`); }

    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`[${ctx}] HTTP ${res.status} ${res.statusText}: ${text.slice(0, 220)}`);
    try { return JSON.parse(text); }
    catch { throw new Error(`[${ctx}] Bad JSON: ${text.slice(0, 220)}`); }
  }

  async function geocodeSearch(query) {
    const url = new URL(GEO_ENDPOINT);
    url.searchParams.set("name", query);
    url.searchParams.set("count", "7");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    return await fetchJSON(url.toString(), "geocodeSearch");
  }

  async function reverseGeocode(lat, lon) {
    const url = new URL(REV_ENDPOINT);
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    return await fetchJSON(url.toString(), "reverseGeocode");
  }

  async function fetchWeather(lat, lon, timezone) {
    const url = new URL(WX_ENDPOINT);
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("timezone", timezone || "auto");

    url.searchParams.set("current",
      [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "is_day",
        "precipitation",
        "cloud_cover",
        "pressure_msl",
        "wind_speed_10m",
        "wind_direction_10m",
        "weather_code",
        "visibility",
        "uv_index"
      ].join(",")
    );

    url.searchParams.set("hourly",
      [
        "temperature_2m",
        "apparent_temperature",
        "precipitation_probability",
        "precipitation",
        "weather_code",
        "wind_speed_10m",
        "relative_humidity_2m",
        "uv_index",
        "cloud_cover"
      ].join(",")
    );

    url.searchParams.set("daily",
      [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "precipitation_probability_max",
        "wind_speed_10m_max",
        "sunrise",
        "sunset",
        "uv_index_max"
      ].join(",")
    );

    url.searchParams.set("forecast_days", "7");
    return await fetchJSON(url.toString(), "fetchWeather");
  }

  // ---------- Weather codes ----------
  function codeToText(code) {
    const map = new Map([
      [0, "Clear sky"], [1, "Mainly clear"], [2, "Partly cloudy"], [3, "Overcast"],
      [45, "Fog"], [48, "Rime fog"],
      [51, "Light drizzle"], [53, "Moderate drizzle"], [55, "Dense drizzle"],
      [56, "Freezing drizzle"], [57, "Dense freezing drizzle"],
      [61, "Slight rain"], [63, "Moderate rain"], [65, "Heavy rain"],
      [66, "Freezing rain"], [67, "Heavy freezing rain"],
      [71, "Slight snow"], [73, "Moderate snow"], [75, "Heavy snow"],
      [77, "Snow grains"],
      [80, "Rain showers"], [81, "Moderate showers"], [82, "Violent showers"],
      [85, "Snow showers"], [86, "Heavy snow showers"],
      [95, "Thunderstorm"], [96, "Storm w/ hail"], [99, "Severe storm w/ hail"]
    ]);
    return map.get(code) || "Unknown";
  }
  function codeToCategory(code) {
    if (code === 0) return "clear";
    if (code === 1 || code === 2) return "partly";
    if (code === 3) return "cloudy";
    if (code === 45 || code === 48) return "fog";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snow";
    if (code >= 95) return "storm";
    return "cloudy";
  }
  function iconFor(code, isDay) {
    const cat = codeToCategory(code);
    if (cat === "clear") return isDay ? iconSun() : iconMoon();
    if (cat === "partly") return isDay ? iconPartly() : iconPartlyNight();
    if (cat === "cloudy") return iconCloud();
    if (cat === "fog") return iconFog();
    if (cat === "rain") return iconRain();
    if (cat === "snow") return iconSnow();
    if (cat === "storm") return iconStorm();
    return iconCloud();
  }

  // ---------- Derived metrics ----------
  function calcDewPointC(tC, rh) {
    if (!Number.isFinite(tC) || !Number.isFinite(rh)) return NaN;
    const a = 17.625, b = 243.04;
    const gamma = Math.log(rh / 100) + (a * tC) / (b + tC);
    return (b * gamma) / (a - gamma);
  }
  function calcHeatIndexC(tC, rh) {
    if (!Number.isFinite(tC) || !Number.isFinite(rh)) return NaN;
    const tF = cToF(tC);
    if (tF < 80 || rh < 40) return tC;
    const hiF =
      -42.379 + 2.04901523 * tF + 10.14333127 * rh -
      0.22475541 * tF * rh - 0.00683783 * tF * tF -
      0.05481717 * rh * rh + 0.00122874 * tF * tF * rh +
      0.00085282 * tF * rh * rh - 0.00000199 * tF * tF * rh * rh;
    return (hiF - 32) * 5 / 9;
  }
  function comfortLabel(dewC) {
    if (!Number.isFinite(dewC)) return "—";
    if (dewC < 10) return "Dry / crisp air";
    if (dewC < 16) return "Comfortable";
    if (dewC < 20) return "Slightly humid";
    if (dewC < 24) return "Humid";
    return "Oppressive humidity";
  }

  // ---------- Rendering ----------
  function renderHeroRange(minC, maxC, nowC) {
    todayMin.textContent = `Min ${fmtTemp(minC)}`;
    todayMax.textContent = `Max ${fmtTemp(maxC)}`;
    const span = Math.max(1, maxC - minC);
    const pos = clamp(((nowC - minC) / span) * 100, 0, 100);
    rangeFill.style.width = `${pos}%`;
  }

  function inferIsDay(payload, isoTime) {
    const i = payload.daily.time.indexOf(isoTime.slice(0, 10));
    const idx = i >= 0 ? i : 0;
    const sr = payload.daily.sunrise?.[idx];
    const ss = payload.daily.sunset?.[idx];
    if (!sr || !ss) return true;
    const t = new Date(isoTime).getTime();
    return t >= new Date(sr).getTime() && t < new Date(ss).getTime();
  }

  function pickNextHour(payload, field) {
    const times = payload.hourly.time;
    const arr = payload.hourly[field];
    if (!times || !arr) return null;
    let idx = times.indexOf(payload.current.time);
    if (idx < 0) idx = 0;
    return arr[Math.min(idx + 1, arr.length - 1)];
  }


  function renderDaily(payload) {
    dailyList.innerHTML = "";
    const tz = payload.timezone;

    const time = payload.daily.time;
    const wcode = payload.daily.weather_code;
    const tmax = payload.daily.temperature_2m_max;
    const tmin = payload.daily.temperature_2m_min;
    const psum = payload.daily.precipitation_sum;
    const pmax = payload.daily.precipitation_probability_max;
    const wmax = payload.daily.wind_speed_10m_max;

    for (let i = 0; i < time.length; i++) {
      const row = document.createElement("div");
      row.className = "drow";
      row.innerHTML = `
        <div>
          <div class="drow__day">${i === 0 ? "Today" : fmtDay(time[i], tz)}</div>
          <div class="drow__sum">${codeToText(wcode[i])}</div>
        </div>
        <div class="drow__temps">${fmtTemp(tmax[i])} <span class="muted">/</span> ${fmtTemp(tmin[i])}</div>
        <div class="drow__extra">${round(pmax[i] ?? 0)}% • ${fmtPrecip(psum[i])}</div>
        <div class="drow__extra">${fmtWind(wmax[i])}</div>
      `;
      dailyList.appendChild(row);
    }
  }

  function renderInsights(payload) {
    insights.innerHTML = "";

    const d = payload.daily;
    const c = payload.current;

    const maxPop24 = Math.max(...(payload.hourly.precipitation_probability || []).slice(0, 24).map(v => v ?? 0));
    const todayPop = d.precipitation_probability_max?.[0] ?? 0;

    const tips = [];

    if (Math.max(todayPop, maxPop24) >= 60) {
      tips.push({ icon: iconUmbrella(), title: "Carry rain protection", text: `High precipitation risk today (up to ${round(Math.max(todayPop, maxPop24))}%).` });
    } else {
      tips.push({ icon: iconSpark(), title: "Low precipitation risk", text: `Peak probability in the next 24h is about ${round(maxPop24)}%.` });
    }

    const uvMax = d.uv_index_max?.[0];
    if (Number.isFinite(uvMax)) tips.push({ icon: iconSunSmall(), title: "UV", text: `UV peaks around ${fmt1(uvMax)} today.` });

    if (Number.isFinite(c.wind_speed_10m)) tips.push({ icon: iconWind(), title: "Wind", text: `Sustained wind around ${fmtWind(c.wind_speed_10m)}.` });

    tips.slice(0, 5).forEach((t) => {
      const node = document.createElement("div");
      node.className = "insight";
      node.innerHTML = `
        <div class="insight__icon" aria-hidden="true">${t.icon}</div>
        <div>
          <div class="insight__title">${t.title}</div>
          <div class="insight__text">${t.text}</div>
        </div>
      `;
      insights.appendChild(node);
    });
  }

  function renderHourly(payload) {
  hourlyRow.innerHTML = "";

  const tz = payload?.timezone || "auto";
  const times = payload?.hourly?.time;
  const temps = payload?.hourly?.temperature_2m;
  const app = payload?.hourly?.apparent_temperature;
  const pop = payload?.hourly?.precipitation_probability;
  const wcode = payload?.hourly?.weather_code;
  const wind = payload?.hourly?.wind_speed_10m;

  // If hourly isn't present, don't crash—show a message.
  if (!Array.isArray(times) || !times.length) {
    hourlyRow.innerHTML = `<div class="kpi__sub">Hourly forecast unavailable (API response missing hourly data).</div>`;
    return;
  }

  let start = 0;
  if (payload?.current?.time) {
    const idx = times.indexOf(payload.current.time);
    start = idx >= 0 ? idx : 0;
  }

  for (let i = start; i < Math.min(start + 24, times.length); i++) {
    const t = times[i];
    const isDay = inferIsDay(payload, t);

    const tile = document.createElement("div");
    tile.className = "htile";
    tile.innerHTML = `
      <div class="htile__time">${fmtTimeLocal(t, tz, { hour: "2-digit", minute: "2-digit" })}</div>
      <div class="htile__mid">
        <div class="htile__temp">${fmtTemp(temps?.[i])}</div>
        <div class="htile__icon">${iconFor(wcode?.[i], isDay)}</div>
      </div>
      <div class="htile__meta">
        <span>${Math.round(pop?.[i] ?? 0)}% rain</span>
        <span>${fmtWind(wind?.[i])}</span>
      </div>
      <div class="kpi__sub" style="margin-top:8px;">Feels ${fmtTemp(app?.[i])}</div>
    `;
    hourlyRow.appendChild(tile);
  }
}


  // ---------- Suggestions ----------
  function closeSuggestions() { suggestions.dataset.open = "false"; suggestions.innerHTML = ""; }
  function openSuggestions(items) {
    if (!items.length) return closeSuggestions();
    suggestions.innerHTML = "";
    suggestions.dataset.open = "true";

    items.forEach((p) => {
      const div = document.createElement("div");
      div.className = "suggestion";
      div.setAttribute("role", "option");
      div.innerHTML = `
        <div>
          <div class="suggestion__name">${escapeHtml(p.name)}</div>
          <div class="suggestion__meta">${escapeHtml([p.admin1, p.country].filter(Boolean).join(" • "))}</div>
        </div>
        <div class="suggestion__meta">${fmt1(p.latitude)}, ${fmt1(p.longitude)}</div>
      `;
      div.addEventListener("click", () => {
        closeSuggestions();
        qInput.value = placeLabel(p);
        resolveAndLoadPlace(p);
      });
      suggestions.appendChild(div);
    });
  }

  function debounce(fn, ms) {
    let t = null;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  let suggestAbort = null;
  const debouncedSuggest = debounce(async () => {
    const q = qInput.value.trim();
    if (q.length < 2) return closeSuggestions();

    try {
      if (suggestAbort) suggestAbort.abort();
      suggestAbort = new AbortController();

      const url = new URL(GEO_ENDPOINT);
      url.searchParams.set("name", q);
      url.searchParams.set("count", "6");
      url.searchParams.set("language", "en");
      url.searchParams.set("format", "json");

      const res = await fetch(url.toString(), { signal: suggestAbort.signal });
      if (!res.ok) return closeSuggestions();
      const data = await res.json();

      const items = (data.results || []).map(r => ({
        name: r.name,
        admin1: r.admin1 || "",
        country: r.country || "",
        latitude: r.latitude,
        longitude: r.longitude,
        timezone: r.timezone || "auto"
      }));

      openSuggestions(items);
    } catch (e) {
      if (String(e?.name) !== "AbortError") closeSuggestions();
    }
  }, 220);

  qInput.addEventListener("input", () => debouncedSuggest());
  qInput.addEventListener("focus", () => debouncedSuggest());
  document.addEventListener("click", (e) => { if (!searchForm.contains(e.target)) closeSuggestions(); });

  // ---------- Saved / Recent ----------
  function placeKey(p) {
    return `${p.name}|${p.admin1 || ""}|${p.country || ""}|${p.latitude}|${p.longitude}`;
  }
  function parseKey(key) {
    const [name, admin1, country, lat, lon] = key.split("|");
    return { name, admin1: admin1 || "", country: country || "", latitude: Number(lat), longitude: Number(lon), timezone: "auto" };
  }

  function renderSaved() {
    const list = loadJSON(LS.saved, []);
    savedChips.innerHTML = "";
    if (!list.length) { savedChips.innerHTML = `<div class="kpi__sub">No saved locations yet.</div>`; return; }

    list.forEach((key) => {
      const p = parseKey(key);
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.innerHTML = `<span>${escapeHtml(placeLabel(p))}</span><span class="chip__x" title="Remove">×</span>`;
      chip.addEventListener("click", (e) => {
        if (e.target?.classList?.contains("chip__x")) {
          saveJSON(LS.saved, list.filter(k => k !== key));
          renderSaved();
          toastShow("Removed from saved.", "info");
          return;
        }
        qInput.value = p.name;
        resolveAndLoadPlace(p);
      });
      savedChips.appendChild(chip);
    });
  }

  function renderRecent() {
    const list = loadJSON(LS.recent, []);
    recentChips.innerHTML = "";
    if (!list.length) { recentChips.innerHTML = `<div class="kpi__sub">Your recent searches will appear here.</div>`; return; }

    list.forEach((key) => {
      const p = parseKey(key);
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.innerHTML = `<span>${escapeHtml(placeLabel(p))}</span>`;
      chip.addEventListener("click", () => resolveAndLoadPlace(p));
      recentChips.appendChild(chip);
    });
  }

  function pushRecent(p) {
    const list = loadJSON(LS.recent, []);
    const key = placeKey(p);
    const next = [key, ...list.filter(x => x !== key)].slice(0, 10);
    saveJSON(LS.recent, next);
    renderRecent();
  }

  // ---------- Main flows ----------
  async function resolveAndLoadPlace(p) {
    const place = {
      name: p.name,
      admin1: p.admin1 || "",
      country: p.country || "",
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      timezone: p.timezone || "auto"
    };

    setPlace(place);
    pushRecent(place);
    await loadWeatherForPlace(place);
  }

  async function loadWeatherForPlace(place) {
    showError(false);
    showLoading(true);

    try {
      const wx = await fetchWeather(place.latitude, place.longitude, place.timezone);
      setPlace({ ...place, timezone: wx.timezone || place.timezone || "auto" });
      renderAll(wx);
      toastShow("Weather updated.", "ok");
    } catch (e) {
  console.error("loadWeatherForPlace failed:", e); // <-- ADD THIS

  const msg = !navigator.onLine
    ? "Offline: connect to the internet or use last saved data."
    : String(e?.message || e);
  showError(true, msg);
  toastShow("Failed to load weather.", "bad");
} finally {
      showLoading(false);
    }
  }

  async function loadBySearch(query) {
    const q = query.trim();
    if (!q) return;

    showError(false);
    showLoading(true);

    try {
      const geo = await geocodeSearch(q);
      const first = geo.results && geo.results[0];
      if (!first) {
        showError(true, `No results for “${q}”. Try “Rabat”, “Casablanca”, “Paris”.`);
        toastShow("No matching city found.", "warn");
        return;
      }
      await resolveAndLoadPlace(first);
      closeSuggestions();
      qInput.blur();
      toastShow("Location loaded.", "ok");
    } catch (e) {
      const msg = !navigator.onLine ? "Offline: connect to the internet or use last saved data." : String(e?.message || e);
      showError(true, msg);
      toastShow("Failed to search.", "bad");
    } finally {
      showLoading(false);
    }
  }

  async function loadByGeolocation() {
    if (!navigator.geolocation) {
      toastShow("Geolocation not supported by your browser.", "warn");
      return;
    }

    showError(false);
    showLoading(true);

    let pos;
    try {
      pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 9000,
          maximumAge: 300000
        });
      });
    } catch (err) {
      showLoading(false);
      const msg = err?.message || "Geolocation denied or unavailable.";
      showError(true, msg);
      toastShow(msg, "warn");
      return;
    }

    try {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      const rev = await reverseGeocode(lat, lon);
      const first = rev.results && rev.results[0];

      const place = first ? {
        name: first.name,
        country: first.country || "",
        admin1: first.admin1 || "",
        latitude: first.latitude,
        longitude: first.longitude,
        timezone: first.timezone || "auto"
      } : {
        name: "My location",
        country: "",
        admin1: "",
        latitude: lat,
        longitude: lon,
        timezone: "auto"
      };

      await resolveAndLoadPlace(place);
      toastShow("Using your location.", "ok");
    } catch (e) {
      showError(true, String(e?.message || e));
      toastShow("Failed to load location weather.", "bad");
    } finally {
      showLoading(false);
    }
  }

  // ---------- Buttons / events ----------
  searchForm.addEventListener("submit", (e) => { e.preventDefault(); loadBySearch(qInput.value); });
  geoBtn.addEventListener("click", () => loadByGeolocation());
  unitC.addEventListener("click", () => applyUnits("C"));
  unitF.addEventListener("click", () => applyUnits("F"));
  themeBtn.addEventListener("click", () => applyTheme(state.theme === "dark" ? "light" : "dark"));

  refreshBtn.addEventListener("click", () => {
    if (state.place) loadWeatherForPlace(state.place);
    else bootstrap();
  });

  retryBtn.addEventListener("click", () => {
    if (state.place) loadWeatherForPlace(state.place);
    else bootstrap();
  });

  useCacheBtn.addEventListener("click", () => {
    const cached = loadJSON(LS.last, null);
    if (!cached?.payload) {
      toastShow("No cached data available yet.", "warn");
      return;
    }
    if (cached.units) applyUnits(cached.units === "F" ? "F" : "C");
    if (cached.place) setPlace(cached.place);

    state.lastPayload = cached.payload;
    showError(false);
    renderAll(cached.payload);
    toastShow("Loaded last saved weather.", "info");
  });

  toastClose.addEventListener("click", () => (toast.hidden = true));

  saveBtn.addEventListener("click", () => {
    if (!state.place) return toastShow("Search a city first.", "warn");
    const list = loadJSON(LS.saved, []);
    const key = placeKey(state.place);
    if (list.includes(key)) return toastShow("Already saved.", "info");
    saveJSON(LS.saved, [key, ...list].slice(0, 12));
    renderSaved();
    toastShow("Saved location.", "ok");
  });

  clearSavedBtn.addEventListener("click", () => {
    saveJSON(LS.saved, []);
    renderSaved();
    toastShow("Saved locations cleared.", "info");
  });

  el("privacyLink").addEventListener("click", (e) => {
    e.preventDefault();
    modalOpen("Privacy", `
      <p>This site runs entirely in your browser.</p>
      <ul>
        <li>Preferences are stored locally on your device.</li>
        <li>Weather requests go to Open-Meteo (no API key).</li>
        <li>No tracking.</li>
      </ul>
    `);
  });

  el("aboutLink").addEventListener("click", (e) => {
    e.preventDefault();
    modalOpen("About", `
      <p><strong>Atmos</strong> is a static weather dashboard.</p>
      <p>Features: search with suggestions, geolocation, units + theme, hourly + 7-day, saved + recent, offline cache, and robust error handling.</p>
    `);
  });

  el("statusLink").addEventListener("click", (e) => {
    e.preventDefault();
    modalOpen("Status", `
      <p>If requests fail:</p>
      <ol>
        <li>Run from a local server (Live Server / localhost), not by double-clicking the HTML file.</li>
        <li>Disable adblock/privacy extensions for this site.</li>
        <li>Check DevTools → Network for blocked requests.</li>
      </ol>
    `);
  });

  // ---------- Boot ----------
  async function bootstrap() {
    initPrefs();
    renderSaved();
    renderRecent();

    const cached = loadJSON(LS.last, null);

if (cached?.payload?.hourly?.time && cached?.payload?.daily?.time) {
  if (cached.units) applyUnits(cached.units === "F" ? "F" : "C");
  if (cached.place) setPlace(cached.place);
  state.lastPayload = cached.payload;
  renderAll(cached.payload);
  toastShow("Loaded cached weather. Refreshing…", "info");
} else {
  // Cache is missing required structure; wipe it so it can't crash boot again.
  localStorage.removeItem(LS.last);
  metaLine.textContent = "Search a city or use your location.";
}


    const recent = loadJSON(LS.recent, []);
    if (recent.length) {
      await resolveAndLoadPlace(parseKey(recent[0]));
      return;
    }

    await loadBySearch("Casablanca");
  }

  // ---------- Helpers ----------
  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- Icons ----------
  function iconBase(path) { return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${path}</svg>`; }
  function iconSun() { return iconBase(`<path d="M12 18.2a6.2 6.2 0 1 0 0-12.4 6.2 6.2 0 0 0 0 12.4Z" stroke="currentColor" stroke-width="1.7"/><path d="M12 1.8v2.4M12 19.8v2.4M2 12h2.4M19.6 12H22M4.1 4.1l1.7 1.7M18.2 18.2l1.7 1.7M19.9 4.1l-1.7 1.7M5.8 18.2l-1.7 1.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`); }
  function iconMoon() { return iconBase(`<path d="M21 13.1A8.2 8.2 0 0 1 10.9 3a7.4 7.4 0 1 0 10.1 10.1Z" stroke="currentColor" stroke-width="1.7"/>`); }
  function iconCloud() { return iconBase(`<path d="M7.2 18.2c-2.3 0-4.2-1.9-4.2-4.2 0-2.1 1.6-3.9 3.7-4.1C7.5 7 9.7 5.4 12.4 5.4c3.3 0 6 2.7 6 6 2 .3 3.6 2.1 3.6 4.2 0 2.3-1.9 4.2-4.2 4.2H7.2Z" stroke="currentColor" stroke-width="1.7"/>`); }
  function iconPartly() { return iconBase(`<path d="M8.7 8.6A4.7 4.7 0 1 0 12 4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 1.9v1.5M12 8.9h1.5M6.5 6.4H5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7.4 19.1c-2.3 0-4.2-1.9-4.2-4.2 0-2.1 1.6-3.9 3.7-4.1C7.7 7.9 9.9 6.3 12.6 6.3c3.3 0 6 2.7 6 6 2 .3 3.6 2.1 3.6 4.2 0 2.3-1.9 4.2-4.2 4.2H7.4Z" stroke="currentColor" stroke-width="1.7"/>`); }
  function iconPartlyNight() { return iconBase(`<path d="M12.3 5.2A4.8 4.8 0 0 0 9 12.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7.4 19.1c-2.3 0-4.2-1.9-4.2-4.2 0-2.1 1.6-3.9 3.7-4.1C7.7 7.9 9.9 6.3 12.6 6.3c3.3 0 6 2.7 6 6 2 .3 3.6 2.1 3.6 4.2 0 2.3-1.9 4.2-4.2 4.2H7.4Z" stroke="currentColor" stroke-width="1.7"/>`); }
  function iconRain() { return iconBase(`<path d="M7.2 14.7c-2.3 0-4.2-1.9-4.2-4.2 0-2.1 1.6-3.9 3.7-4.1C7.5 3.5 9.7 2 12.4 2c3.3 0 6 2.7 6 6 2 .3 3.6 2.1 3.6 4.2 0 2.3-1.9 4.2-4.2 4.2H7.2Z" stroke="currentColor" stroke-width="1.7"/><path d="M8 18.5l-1.1 2.3M12 18.5l-1.1 2.3M16 18.5l-1.1 2.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`); }
  function iconSnow() { return iconBase(`<path d="M7.2 14.7c-2.3 0-4.2-1.9-4.2-4.2 0-2.1 1.6-3.9 3.7-4.1C7.5 3.5 9.7 2 12.4 2c3.3 0 6 2.7 6 6 2 .3 3.6 2.1 3.6 4.2 0 2.3-1.9 4.2-4.2 4.2H7.2Z" stroke="currentColor" stroke-width="1.7"/><path d="M9 18.1l-1.8 1.4M9 19.5l-1.8-1.4M12.5 18.1l-1.8 1.4M12.5 19.5l-1.8-1.4M16 18.1l-1.8 1.4M16 19.5l-1.8-1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`); }
  function iconFog() { return iconBase(`<path d="M6.7 10.6c.5-2.9 3-5.1 6.1-5.1 3.3 0 6 2.7 6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M3 13.3h18M4.7 16h14.6M6.7 18.7h10.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`); }
  function iconStorm() { return iconBase(`<path d="M7.2 13.7c-2.3 0-4.2-1.9-4.2-4.2 0-2.1 1.6-3.9 3.7-4.1C7.5 2.6 9.7 1 12.4 1c3.3 0 6 2.7 6 6 2 .3 3.6 2.1 3.6 4.2 0 2.3-1.9 4.2-4.2 4.2H7.2Z" stroke="currentColor" stroke-width="1.7"/><path d="M13 14.6l-3.2 5.6h3l-1 3.2 4.2-6h-3l1-2.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>`); }

  function iconInfo() { return iconBase(`<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" stroke-width="1.7"/><path d="M12 10.7v5.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 7.6h.01" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/>`); }
  function iconCheck() { return iconBase(`<path d="M20.5 6.7 10.2 17 5 11.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`); }
  function iconWarn() { return iconBase(`<path d="M12 2.8 22 20H2L12 2.8Z" stroke="currentColor" stroke-width="1.7"/><path d="M12 9v4.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 16.8h.01" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/>`); }
  function iconBad() { return iconBase(`<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" stroke-width="1.7"/><path d="M9.2 9.2 14.8 14.8M14.8 9.2 9.2 14.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`); }

  function iconUmbrella() { return iconBase(`<path d="M12 3c4.4 0 8 3.6 8 8H4c0-4.4 3.6-8 8-8Z" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v6.2a2.2 2.2 0 0 0 4.4 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`); }
  function iconSpark() { return iconBase(`<path d="M12 2l1.3 6.2L20 9.5l-6.2 1.3L12.5 17 11.2 10.8 5 9.5l6.2-1.3L12 2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>`); }
  function iconSunSmall() { return iconBase(`<path d="M12 16.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z" stroke="currentColor" stroke-width="1.7"/><path d="M12 2v2.1M12 19.9V22M2 12h2.1M19.9 12H22" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`); }
  function iconWind() { return iconBase(`<path d="M3 9.2h10.6a2.2 2.2 0 1 0-2.2-2.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M3 13h14.2a2.2 2.2 0 1 1-2.2 2.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M3 16.8h8.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`); }
  el("year").textContent = new Date().getFullYear();

  // ---------- Start ----------
  bootstrap();
  
})();
