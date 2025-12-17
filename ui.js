// =====================================================
// TauriPets - UI Rendering Functions
// =====================================================

/**
 * Show file upload section
 */
function showFileUpload() {
    document.getElementById('fileSection').style.display = 'block';
    document.getElementById('pasteSection').style.display = 'none';
    document.getElementById('toggleFile').classList.add('active');
    document.getElementById('togglePaste').classList.remove('active');
}

/**
 * Show paste area section
 */
function showPasteArea() {
    document.getElementById('fileSection').style.display = 'none';
    document.getElementById('pasteSection').style.display = 'block';
    document.getElementById('toggleFile').classList.remove('active');
    document.getElementById('togglePaste').classList.add('active');
}

/**
 * Show copy feedback toast
 */
function showCopyFeedback() {
    const f = document.getElementById('copyFeedback');
    f.classList.add('show');
    setTimeout(() => f.classList.remove('show'), 2500);
}

/**
 * Render personal best card
 */
function renderPersonalBest() {
    const card = document.getElementById('personalBestCard');
    const content = document.getElementById('personalBestContent');
    const pb = loadPersonalBest();

    if (!pb) {
        card.classList.add('empty');
        content.innerHTML = '<p style="color: #666; margin: 20px 0;">Load your collection to see your score!</p>';
        return;
    }

    card.classList.remove('empty');
    content.innerHTML =
        '<div class="pb-score">' + pb.score.toLocaleString() + '</div>' +
        '<div class="pb-details">' +
        '<div class="pb-detail"><div class="value">' + pb.pets + '</div><div class="label">Unique Pets</div></div>' +
        '<div class="pb-detail"><div class="value">' + pb.level25 + '</div><div class="label">Level 25</div></div>' +
        '<div class="pb-detail"><div class="value">' + (pb.rare || 0) + '</div><div class="label">Rare+</div></div>' +
        '</div>' +
        '<div class="pb-meta">' + pb.player + '-' + pb.realm + ' • Best: ' + pb.date + '</div>' +
        '<div class="submit-section">' +
        '<button class="submit-btn primary" onclick="submitScore()" ' + (!currentScoreData ? 'disabled' : '') + '>🏆 Submit Score to Leaderboard</button>' +
        '</div>';
}

/**
 * Get achievement badges for a player based on their stats
 */
function getAchievementBadges(pets, level25, rare, epic) {
    const badges = [];
    
    // Collection milestones
    if (pets >= 500) badges.push({ icon: '👑', title: 'Insane Collector (500+ pets)', color: '#a335ee' });
    else if (pets >= 250) badges.push({ icon: '💎', title: 'Obsessed Collector (250+ pets)', color: '#0070dd' });
    else if (pets >= 100) badges.push({ icon: '📦', title: 'Dedicated Collector (100+ pets)', color: '#1eff00' });
    else if (pets >= 50) badges.push({ icon: '🎁', title: 'Collector (50+ pets)', color: '#fff' });
    
    // Level 25 achievements
    if (level25 >= 50) badges.push({ icon: '⭐', title: 'Elite Trainer (50+ level 25)', color: '#ffd700' });
    else if (level25 >= 25) badges.push({ icon: '🌟', title: 'Pro Trainer (25+ level 25)', color: '#c0c0c0' });
    else if (level25 >= 10) badges.push({ icon: '✨', title: 'Trainer (10+ level 25)', color: '#cd7f32' });
    
    // Quality achievements
    if (epic >= 10) badges.push({ icon: '💜', title: 'Epic Collector (10+ epic)', color: '#a335ee' });
    else if (rare >= 25) badges.push({ icon: '💚', title: 'Quality Hunter (25+ rare)', color: '#1eff00' });
    
    return badges;
}

/**
 * Render leaderboard table
 */
async function renderLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    const empty = document.getElementById('leaderboardEmpty');

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;">Loading...</td></tr>';
    empty.style.display = 'none';

    LEADERBOARD_DATA = await fetchLeaderboard();

    if (LEADERBOARD_DATA.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    tbody.innerHTML = LEADERBOARD_DATA.map((entry, index) => {
        const rank = index + 1;
        let trophy = '', rankClass = '';

        if (rank === 1) { trophy = '🥇'; rankClass = 'rank-1'; }
        else if (rank === 2) { trophy = '🥈'; rankClass = 'rank-2'; }
        else if (rank === 3) { trophy = '🥉'; rankClass = 'rank-3'; }

        const date = entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'N/A';
        
        // Get achievement badges
        const badges = getAchievementBadges(entry.pets, entry.level25, entry.rare || 0, entry.epic || 0);
        const badgesHTML = badges.map(b => 
            '<span class="achievement-badge" style="color:' + b.color + '" title="' + b.title + '">' + b.icon + '</span>'
        ).join('');

        return '<tr>' +
            '<td class="rank ' + rankClass + '"><span class="trophy">' + trophy + '</span>' + rank + '</td>' +
            '<td class="player-name clickable" onclick="viewPlayerCollection(\'' + entry.player + '\', \'' + entry.realm + '\')">' +
            entry.player + '-' + entry.realm + badgesHTML + '<span class="view-icon">👁️</span></td>' +
            '<td class="score">' + entry.score.toLocaleString() + '</td>' +
            '<td>' + entry.pets + '</td>' +
            '<td>' + entry.level25 + '</td>' +
            '<td class="date">' + date + '</td>' +
            '</tr>';
    }).join('');
}

/**
 * Display my collection tab
 */
function displayMyCollection() {
    if (!playerData) return;

    // Show UI elements
    document.getElementById('playerInfo').classList.add('visible');
    document.getElementById('progressContainer').classList.add('visible');
    document.getElementById('statsDashboard').classList.add('visible');
    document.getElementById('myFilters').style.display = 'flex';

    // Set player info
    document.getElementById('playerName').textContent = playerData.playerName + ' - ' + playerData.realmName;
    document.getElementById('exportDate').textContent = 'Exported: ' + (playerData.exportDate || 'Unknown');

    // Calculate stats
    const pets = playerData.pets || [];
    const level25 = pets.filter(p => p.level === 25).length;
    const rare = pets.filter(p => (typeof p.quality === 'number' ? p.quality : (p.qualityID || 0)) >= 3).length;
    const epic = pets.filter(p => (typeof p.quality === 'number' ? p.quality : (p.qualityID || 0)) >= 4).length;
    const favorites = pets.filter(p => p.favorite).length;

    // Update stats
    document.getElementById('totalPets').textContent = pets.length;
    document.getElementById('level25Pets').textContent = level25;
    document.getElementById('rarePets').textContent = rare;
    document.getElementById('epicPets').textContent = epic;
    document.getElementById('favoritePets').textContent = favorites;

    // Update progress bar
    const totalPossible = playerData.totalPets || playerData.maxPets || ALL_PETS_DATABASE.length;
    const ownedCount = playerData.ownedPets || pets.length;
    const percentage = Math.min(100, (ownedCount / totalPossible * 100)).toFixed(1);

    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('progressText').textContent = ownedCount + ' / ' + totalPossible + ' (' + percentage + '%)';

    // Calculate and display score
    const scoreData = calculateScore(pets);
    displayScore(scoreData);

    // Render pets
    renderMyPets();
    setupMyFilters();
}

/**
 * Get filtered pets for My Collection
 */
function getMyFilteredPets() {
    if (!playerData || !playerData.pets) return [];

    let pets = [...playerData.pets];

    // Search filter
    const search = document.getElementById('mySearchInput').value.toLowerCase();
    if (search) {
        pets = pets.filter(p =>
            (p.speciesName && p.speciesName.toLowerCase().includes(search)) ||
            (p.customName && p.customName.toLowerCase().includes(search))
        );
    }

    // Quality filter
    const quality = document.getElementById('myQualityFilter').value;
    if (quality) {
        const minQuality = parseInt(quality);
        pets = pets.filter(p => (typeof p.quality === 'number' ? p.quality : (p.qualityID || 0)) >= minQuality);
    }

    // Level filter
    const level = document.getElementById('myLevelFilter').value;
    if (level) pets = pets.filter(p => p.level >= parseInt(level));

    // Family filter
    const family = document.getElementById('myFamilyFilter').value;
    if (family) pets = pets.filter(p => (p.petType || p.familyID) === parseInt(family));

    // Sort: favorites first, then level, then quality
    pets.sort((a, b) => {
        if (a.favorite !== b.favorite) return b.favorite ? 1 : -1;
        if (a.level !== b.level) return (b.level || 0) - (a.level || 0);
        const aQ = typeof a.quality === 'number' ? a.quality : (a.qualityID || 0);
        const bQ = typeof b.quality === 'number' ? b.quality : (b.qualityID || 0);
        if (aQ !== bQ) return bQ - aQ;
        return (a.speciesName || '').localeCompare(b.speciesName || '');
    });

    return pets;
}

/**
 * Render my pets grid
 */
function renderMyPets() {
    const grid = document.getElementById('myPetGrid');
    const pets = getMyFilteredPets();

    document.getElementById('myPetCount').textContent = 'Showing ' + pets.length + ' pets';
    document.getElementById('myNoResults').style.display = pets.length === 0 ? 'block' : 'none';

    grid.innerHTML = pets.map(pet => {
        const familyId = pet.petType || pet.familyID || 0;
        const family = families[familyId] || { name: pet.family || 'Unknown', icon: '❓' };
        let qualityNum = typeof pet.quality === 'number' ? pet.quality : (pet.qualityID || 0);
        let qualityName = qualities[qualityNum] || 'Unknown';

        return '<div class="pet-card quality-' + qualityNum + '">' +
            '<div class="pet-icon">' + family.icon + '</div>' +
            '<div class="pet-info">' +
            '<div class="pet-name quality-' + qualityNum + '">' +
            (pet.favorite ? '<span class="favorite">⭐</span>' : '') +
            (pet.speciesName || pet.name || 'Unknown Pet') +
            (pet.breed && pet.breed !== 'Unknown' ? '<span style="color:#888;font-size:0.75rem">(' + pet.breed + ')</span>' : '') +
            '</div>' +
            (pet.customName ? '<div class="custom-name">"' + pet.customName + '"</div>' : '') +
            '<div class="pet-details">Level ' + (pet.level || 1) + ' ' + qualityName + ' ' + family.name + '</div>' +
            '<div class="pet-stats">' +
            '<span class="stat-health">❤️ ' + (pet.health || 0) + '</span>' +
            '<span class="stat-power">⚔️ ' + (pet.power || 0) + '</span>' +
            '<span class="stat-speed">⚡ ' + (pet.speed || 0) + '</span>' +
            '</div>' +
            '</div></div>';
    }).join('');
}

/**
 * Setup my collection filters
 */
function setupMyFilters() {
    document.getElementById('mySearchInput').addEventListener('input', renderMyPets);
    document.getElementById('myQualityFilter').addEventListener('change', renderMyPets);
    document.getElementById('myLevelFilter').addEventListener('change', renderMyPets);
    document.getElementById('myFamilyFilter').addEventListener('change', renderMyPets);
}

/**
 * Populate zone filter dropdown
 */
function populateZoneFilter() {
    const zones = [...new Set(ALL_PETS_DATABASE.map(p => p.zone).filter(z => z))].sort();
    const select = document.getElementById('allZoneFilter');

    zones.forEach(zone => {
        const option = document.createElement('option');
        option.value = zone;
        option.textContent = zone;
        select.appendChild(option);
    });
}

/**
 * Get filtered pets for All Pets Database
 */
function getAllFilteredPets() {
    let pets = [...ALL_PETS_DATABASE];

    // Search filter
    const search = document.getElementById('allSearchInput').value.toLowerCase();
    if (search) pets = pets.filter(p => p.name.toLowerCase().includes(search));

    // Zone filter
    const zone = document.getElementById('allZoneFilter').value;
    if (zone) pets = pets.filter(p => p.zone === zone);

    // Source filter
    const source = document.getElementById('allSourceFilter').value;
    if (source) pets = pets.filter(p => p.source === source);

    // Family filter
    const family = document.getElementById('allFamilyFilter').value;
    if (family) pets = pets.filter(p => p.family === parseInt(family));

    // Missing only filter
    const showMissingOnly = document.getElementById('showMissingOnly').checked;
    if (showMissingOnly && ownedSpeciesIDs.size > 0) {
        pets = pets.filter(p => !ownedSpeciesIDs.has(p.speciesID));
    }

    // Sort: owned first, then by zone, then by name
    pets.sort((a, b) => {
        const aOwned = ownedSpeciesIDs.has(a.speciesID);
        const bOwned = ownedSpeciesIDs.has(b.speciesID);
        if (aOwned !== bOwned) return bOwned ? 1 : -1;
        if (a.zone !== b.zone) return (a.zone || '').localeCompare(b.zone || '');
        return a.name.localeCompare(b.name);
    });

    return pets;
}

/**
 * Render all pets grid
 */
function renderAllPets() {
    const grid = document.getElementById('allPetGrid');
    const pets = getAllFilteredPets();

    const ownedCount = pets.filter(p => ownedSpeciesIDs.has(p.speciesID)).length;
    const statusText = ownedSpeciesIDs.size > 0
        ? 'Showing ' + pets.length + ' pets (' + ownedCount + ' owned, ' + (pets.length - ownedCount) + ' missing)'
        : 'Showing ' + pets.length + ' pets (upload your collection to track progress!)';

    document.getElementById('allPetCount').textContent = statusText;
    document.getElementById('allNoResults').style.display = pets.length === 0 ? 'block' : 'none';

    grid.innerHTML = pets.map(pet => {
        const family = families[pet.family] || { name: 'Unknown', icon: '❓' };
        const isOwned = ownedSpeciesIDs.has(pet.speciesID);
        const sourceClass = 'source-' + pet.source;
        const sourceLabel = sourceLabels[pet.source] || pet.source;
        
        // Generate helpful tip for missing pets
        let howToGet = '';
        if (!isOwned) {
            if (pet.source === 'vendor') howToGet = '💰 Can be purchased from a vendor';
            else if (pet.source === 'wild') howToGet = '🌿 Found in the wild - go catch it!';
            else if (pet.source === 'drop') howToGet = '⚔️ Drops from enemies';
            else if (pet.source === 'quest') howToGet = '📜 Reward from a quest';
            else if (pet.source === 'achievement') howToGet = '🏆 Earned through an achievement';
            else if (pet.source === 'profession') howToGet = '🔨 Created through a profession';
            else if (pet.source === 'promotion') howToGet = '🎁 Special promotional pet';
            else if (pet.source === 'event') howToGet = '🎉 Available during special events';
            else if (pet.source === 'tcg') howToGet = '🃏 Trading Card Game loot';
        }

        return '<div class="pet-card ' + (isOwned ? 'owned' : 'missing') + '">' +
            '<div class="pet-icon">' + family.icon + '</div>' +
            '<div class="pet-info">' +
            '<div class="pet-name" style="color: ' + (isOwned ? '#00ff88' : '#aaa') + '">' +
            (isOwned ? '<span class="owned-check">✓</span>' : '<span class="missing-icon">❌</span>') +
            pet.name +
            '<span class="source-badge ' + sourceClass + '">' + sourceLabel + '</span>' +
            '</div>' +
            '<div class="pet-details">' + family.name + (pet.isWild ? ' • Wild Pet' : '') + '</div>' +
            '<div class="pet-location">📍 ' + (pet.sourceText || pet.zone || 'Unknown') + '</div>' +
            (howToGet ? '<div class="pet-tip">' + howToGet + '</div>' : '') +
            '</div></div>';
    }).join('');
}

/**
 * Setup all pets filters
 */
function setupAllFilters() {
    document.getElementById('allSearchInput').addEventListener('input', renderAllPets);
    document.getElementById('allZoneFilter').addEventListener('change', renderAllPets);
    document.getElementById('allSourceFilter').addEventListener('change', renderAllPets);
    document.getElementById('allFamilyFilter').addEventListener('change', renderAllPets);
    document.getElementById('showMissingOnly').addEventListener('change', renderAllPets);
}
