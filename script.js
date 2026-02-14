// WeatherNow starter logic.
// This is intentionally API-agnostic: you can plug OpenWeather, WeatherAPI, Meteostat, etc.

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
};

const state = {
  unit: "metric", // metric => °C, imperial => °F
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
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function fakeWeather(city) {
  // Demo-only: remove once you connect a real API.
  const temp = clamp(Math.round(12 + Math.random() * 18), -10, 45);
  const feels = temp + (Math.random() > 0.5 ? 1 : -1) * Math.round(Math.random() * 3);
  const conditions = [
    { badge: "Clear", icon: "☀️", desc: "Clear sky" },
    { badge: "Clouds", icon: "⛅", desc: "Partly cloudy" },
    { badge: "Rain", icon: "🌧️", desc: "Light rain" },
    { badge: "Wind", icon: "💨", desc: "Breezy" },
  ];
  const c = conditions[Math.floor(Math.random() * conditions.length)];

  return {
    place: city,
    meta: "Demo data (connect an API to make it real)",
    temp,
    feelsLike: feels,
    condition: c.badge,
    icon: c.icon,
    desc: c.desc,
    humidity: `${clamp(Math.round(35 + Math.random() * 50), 10, 100)}%`,
    wind: `${clamp(Math.round(2 + Math.random() * 10), 0, 30)} ${state.unit === "metric" ? "m/s" : "mph"}`,
    pressure: `${clamp(Math.round(1000 + Math.random() * 30), 980, 1050)} hPa`,
    visibility: `${clamp(Math.round(5 + Math.random() * 10), 1, 20)} km`,
  };
}

function render(data) {
  els.placeName.textContent = data.place;
  els.placeMeta.textContent = data.meta;

  els.conditionBadge.textContent = data.condition;

  els.tempNow.textContent = data.temp;
  els.feelsLike.textContent = data.feelsLike;

  els.bigIcon.textContent = data.icon;
  els.bigDesc.textContent = data.desc;

  els.humidity.textContent = data.humidity;
  els.wind.textContent = data.wind;
  els.pressure.textContent = data.pressure;
  els.visibility.textContent = data.visibility;
}

async function handleSearch(city) {
  const q = (city || "").trim();
  if (!q) {
    setStatus("Type a city name first.");
    return;
  }

  setStatus("Loading…");

  // Replace this with real fetch logic later.
  // Example (pseudo):
  // const res = await fetch(`https://api...&q=${encodeURIComponent(q)}&units=${state.unit}&key=...`);
  // const json = await res.json(); map->render()

  await new Promise((r) => setTimeout(r, 350));
  const demo = fakeWeather(q);
  render(demo);
  setStatus("");
}

function handleGeo() {
  if (!navigator.geolocation) {
    setStatus("Geolocation not supported in this browser.");
    return;
  }

  setStatus("Requesting location…");
  els.geoBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      // In real implementation, use pos.coords.latitude / longitude to query your API.
      // For now: just show demo output.
      const lat = pos.coords.latitude.toFixed(2);
      const lon = pos.coords.longitude.toFixed(2);

      await new Promise((r) => setTimeout(r, 300));
      const demo = fakeWeather(`My location (${lat}, ${lon})`);
      demo.meta = "Demo data (use lat/lon with a real API)";
      render(demo);

      setStatus("");
      els.geoBtn.disabled = false;
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
  handleSearch(els.cityInput.value);
});

els.geoBtn.addEventListener("click", handleGeo);

els.unitChips.forEach((btn) => {
  btn.addEventListener("click", () => {
    setUnit(btn.dataset.unit);
    // Optional: re-run search if already showing a city
    const currentCity = els.placeName.textContent;
    if (currentCity && currentCity !== "—") handleSearch(currentCity);
  });
});

// Default
setUnit("metric");
