const player = new Audio();
const searchBtn = document.getElementById("searchBtn");
const radioSearch = document.getElementById("radioSearch");
const playPauseBtn = document.getElementById("playPauseBtn");
const playIcon = document.getElementById("playIcon");
const currentRadioName = document.getElementById("currentRadioName");
const listenerCount = document.getElementById("listenerCount");
const artistSpan = document.getElementById("artist");
const songSpan = document.getElementById("song");
const albumCover = document.getElementById("albumCover");
const lyricsArea = document.getElementById("lyrics");

let isPlaying = false;
let currentRadio = null;
let currentArtist = "";
let currentSong = "";
let hls = null;
let metadataInterval = null;

searchBtn.addEventListener("click", () => {
    const query = radioSearch.value.trim();
    if (query) {
        fetchRadioInfo(query);
    }
});

playPauseBtn.addEventListener("click", () => {
    if (isPlaying) {
        stopPlayer();
    } else {
        startPlayer();
    }
});

function stopPlayer() {
    if (hls) {
        hls.destroy();
        hls = null;
    }
    player.pause();
    playIcon.classList.replace("fa-pause", "fa-play");
    isPlaying = false;
}

function startPlayer() {
    if (player.src) {
        player.play();
        playIcon.classList.replace("fa-play", "fa-pause");
        isPlaying = true;
    }
}

function startHTML5Player(url) {
    stopPlayer();
    player.src = url;
    startPlayer();
}

function startHLSPlayer(url) {
    stopPlayer();
    if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(player);
        startPlayer();
    } else {
        alert("Seu navegador não suporta HLS.");
    }
}

async function fetchRadioInfo(name) {
    try {
        const res = await fetch(`https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(name)}&order=clickcount`);
        const data = await res.json();
        if (data.length === 0) return alert("Rádio não encontrada.");

        currentRadio = data[0];
        currentRadioName.textContent = `${currentRadio.name} (${currentRadio.country})`;
        listenerCount.textContent = `👂 ${currentRadio.clickcount} ouvintes`;

        if (currentRadio.url_resolved.includes(".m3u8")) {
            startHLSPlayer(currentRadio.url_resolved);
        } else {
            startHTML5Player(currentRadio.url_resolved);
        }

        if (metadataInterval) clearInterval(metadataInterval);
        await fetchMetadata();
        metadataInterval = setInterval(fetchMetadata, 10000);
    } catch (err) {
        console.error("Erro ao buscar rádio:", err);
    }
}

async function fetchMetadata() {
    if (!currentRadio) return;

    try {
        const streamUrl = currentRadio.url_resolved;
        const res = await fetch(`https://radio-metadata-api-main.vercel.app/radio_info/?radio_url=${encodeURIComponent(streamUrl)}`);
        const data = await res.json();

        const newArtist = data.artist?.trim() || "Desconhecido";
        const newSong = data.song?.trim() || "Desconhecido";

        if (newArtist === currentArtist && newSong === currentSong) return;

        currentArtist = newArtist;
        currentSong = newSong;

        artistSpan.textContent = newArtist;
        songSpan.textContent = newSong;
        currentRadioName.textContent = `${currentRadio.name} (${currentRadio.country}) – ${newSong}`;

        if (newArtist === "Desconhecido" || newSong === "Desconhecido") {
            albumCover.src = "https://placehold.co/300x300?text=Sem+Capa";
        } else {
            const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(newArtist + " " + newSong)}&media=music&limit=1`);
            const itunesData = await itunesRes.json();
            const cover = itunesData.results[0]?.artworkUrl100?.replace("100x100", "300x300") || "https://placehold.co/300x300?text=Sem+Capa";
            albumCover.src = cover;
        }
        

        const lyricsRes = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(newArtist)}/${encodeURIComponent(newSong)}`);
        const lyricsData = await lyricsRes.json();
        lyricsArea.value = lyricsData.lyrics || "Letra não encontrada.";
    } catch (err) {
        console.error("Erro ao buscar metadados:", err);
        artistSpan.textContent = "Desconhecido";
        songSpan.textContent = "Desconhecido";
        albumCover.src = "https://placehold.co/300x300?text=Sem+Capa";
        lyricsArea.value = "Letra não encontrada.";
    }
}
