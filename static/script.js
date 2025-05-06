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
let hls = null;

searchBtn.addEventListener("click", function () {
    const searchQuery = radioSearch.value;
    if (searchQuery) {
        fetchRadioInfo(searchQuery);
    }
});

playPauseBtn.addEventListener("click", () => {
    if (isPlaying) {
        stopPlayer();
    } else {
        startPlayer();
    }
});

async function fetchRadioInfo(radioName) {
    try {
        // Busca a rádio pela pesquisa
        const response = await fetch(`https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(radioName)}&order=clickcount`);
        const stations = await response.json();

        if (stations.length > 0) {
            // Pegamos a primeira rádio que for encontrada
            const selectedRadio = stations[0];

            // Atualizamos o áudio e as informações da rádio
            currentRadio = selectedRadio;
            currentRadioName.textContent = `${selectedRadio.name} (${selectedRadio.country})`;
            listenerCount.textContent = `👂 ${selectedRadio.clickcount} ouvintes`;

            // Verifica se o link é m3u8
            if (selectedRadio.url_resolved && selectedRadio.url_resolved.includes(".m3u8")) {
                startHLSPlayer(selectedRadio.url_resolved);
            } else if (selectedRadio.url_resolved) {
                startHTML5Player(selectedRadio.url_resolved);
            } else {
                alert("Link de stream inválido para a rádio.");
            }

            // Atualizamos a interface com a música tocando, artista, etc.
            fetchMetadata(selectedRadio.url_resolved);
        } else {
            alert("Rádio não encontrada.");
        }
    } catch (error) {
        console.error("Erro ao buscar rádio:", error);
    }
}

function startHTML5Player(streamUrl) {
    player.src = streamUrl;
    player.play();
    playIcon.classList.replace("fa-play", "fa-pause");
    isPlaying = true;
}

function startHLSPlayer(streamUrl) {
    // Para streams m3u8, usamos o HLS.js
    if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(player);
        player.play();
        playIcon.classList.replace("fa-play", "fa-pause");
        isPlaying = true;
    } else {
        alert("Seu navegador não suporta HLS para este stream.");
    }
}

function stopPlayer() {
    if (hls) {
        hls.destroy();
    }
    player.pause();
    playIcon.classList.replace("fa-pause", "fa-play");
    isPlaying = false;
}

async function fetchMetadata(streamUrl) {
    try {
        // Buscar metadados da música em execução na rádio
        const metaRes = await fetch(`https://radio-metadata-api-main.vercel.app/radio_info/?radio_url=${encodeURIComponent(streamUrl)}`);
        const metaData = await metaRes.json();

        const artist = metaData.artist || "-";
        const song = metaData.song || "-";
        artistSpan.textContent = artist;
        songSpan.textContent = song;
        currentRadioName.textContent += ` – ${song}`;

        // Buscar capa no iTunes
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist + " " + song)}&media=music&limit=1`);
        const itunesData = await itunesRes.json();
        const cover = itunesData.results[0]?.artworkUrl100?.replace("100x100", "300x300") || "https://placehold.co/300x300?text=Sem+Capa";
        albumCover.src = cover;

        // Buscar letra
        const lyricsRes = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`);
        const lyricsData = await lyricsRes.json();
        lyricsArea.value = lyricsData.lyrics || "Letra não encontrada.";
    } catch (err) {
        console.error("Erro ao buscar metadados:", err);
        artistSpan.textContent = "-";
        songSpan.textContent = "-";
        albumCover.src = "https://placehold.co/300x300?text=Sem+Capa";
        lyricsArea.value = "Erro ao buscar letra.";
    }
}

