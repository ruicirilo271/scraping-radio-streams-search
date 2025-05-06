const player = new Audio();
const searchBtn = document.getElementById("searchBtn");
const radioSearch = document.getElementById("radioSearch");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const currentRadioName = document.getElementById("currentRadioName");
const listenerCount = document.getElementById("listenerCount");
const artistSpan = document.getElementById("artist");
const songSpan = document.getElementById("song");
const albumCover = document.getElementById("albumCover");
const lyricsArea = document.getElementById("lyrics");
const radioList = document.getElementById("radioList");
const favoritesList = document.getElementById("favoritesList");

let metadataInterval = null;
let currentRadio = null;
let currentArtist = "";
let currentSong = "";
let hls = null;

searchBtn.addEventListener("click", () => {
    const query = radioSearch.value.trim();
    if (query) searchRadios(query);
});

playBtn.addEventListener("click", () => {
    if (player.src) player.play();
});

pauseBtn.addEventListener("click", () => {
    player.pause();
});

function createRadioButton(radio, isFavorite = false) {
    const btn = document.createElement("div");
    btn.className = "flex items-center justify-between bg-white p-3 rounded-lg shadow hover:bg-blue-50 transition";

    const left = document.createElement("div");
    left.innerHTML = `
        <img src="https://flagcdn.com/24x18/${radio.countrycode?.toLowerCase() || "pt"}.png" class="inline mr-2" />
        <button class="text-left text-gray-700 hover:underline">${radio.name} (${radio.country})</button>
    `;

    left.querySelector("button").onclick = () => selectRadio(radio);

    const favBtn = document.createElement("button");
    favBtn.innerHTML = isFavorite ? "❌" : "⭐";
    favBtn.className = "text-xl text-yellow-500 hover:text-yellow-700";
    favBtn.onclick = () => toggleFavorite(radio);

    btn.appendChild(left);
    btn.appendChild(favBtn);
    return btn;
}

async function searchRadios(query) {
    try {
        const res = await fetch(`https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(query)}&order=clickcount`);
        const data = await res.json();

        radioList.innerHTML = "";
        if (data.length === 0) {
            radioList.innerHTML = "<p class='text-red-600'>Nenhuma rádio encontrada.</p>";
            return;
        }

        data.forEach(radio => radioList.appendChild(createRadioButton(radio)));
    } catch (err) {
        console.error("Erro ao buscar rádios:", err);
    }
}

function selectRadio(radio) {
    currentRadio = radio;
    currentRadioName.textContent = `${radio.name} (${radio.country})`;
    listenerCount.textContent = `👂 ${radio.clickcount} ouvintes`;

    if (hls) {
        hls.destroy();
        hls = null;
    }

    if (radio.url_resolved.includes(".m3u8") && Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(radio.url_resolved);
        hls.attachMedia(player);
        player.play();
    } else {
        player.src = radio.url_resolved;
        player.play();
    }

    if (metadataInterval) clearInterval(metadataInterval);
    fetchMetadata();
    metadataInterval = setInterval(fetchMetadata, 10000);
}

async function fetchMetadata() {
    if (!currentRadio) return;

    try {
        const url = `https://radio-metadata-api-main.vercel.app/radio_info/?radio_url=${encodeURIComponent(currentRadio.url_resolved)}`;
        const response = await fetch(url);
        const data = await response.json();

        let artist = data.artist || "Desconhecido";
        let song = data.song || "Desconhecido";

        if (artist !== currentArtist || song !== currentSong) {
            currentArtist = artist;
            currentSong = song;
            artistSpan.textContent = artist;
            songSpan.textContent = song;

            fetchAlbumCover(artist, song);
            fetchLyrics(artist, song);
        }

    } catch (err) {
        console.error("Erro ao buscar metadados:", err);
    }
}

async function fetchAlbumCover(artist, song) {
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist + " " + song)}&entity=song&limit=1`);
        const data = await res.json();
        const cover = data.results?.[0]?.artworkUrl100?.replace("100x100", "300x300");
        albumCover.src = cover || "https://placehold.co/300x300?text=Sem+Capa";
    } catch {
        albumCover.src = "https://placehold.co/300x300?text=Sem+Capa";
    }
}

async function fetchLyrics(artist, song) {
    try {
        const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`);
        const data = await res.json();
        lyricsArea.value = data.lyrics || "Letra não encontrada.";
    } catch {
        lyricsArea.value = "Letra não encontrada.";
    }
}

function toggleFavorite(radio) {
    let favs = JSON.parse(localStorage.getItem("favorites") || "[]");

    const exists = favs.find(r => r.stationuuid === radio.stationuuid);
    if (exists) {
        favs = favs.filter(r => r.stationuuid !== radio.stationuuid);
    } else {
        favs.push(radio);
    }

    localStorage.setItem("favorites", JSON.stringify(favs));
    loadFavorites();
}

function loadFavorites() {
    const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
    favoritesList.innerHTML = "";
    favs.forEach(radio => favoritesList.appendChild(createRadioButton(radio, true)));
}

loadFavorites();
