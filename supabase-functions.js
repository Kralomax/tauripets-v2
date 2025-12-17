// =====================================================
// TauriPets - Supabase Database Functions
// =====================================================

/**
 * Save collection to Supabase
 */
async function saveCollectionToSupabase(playerName, realmName, pets, score) {
    try {
        const { data: existing } = await supabaseClient
            .from('collections')
            .select('id')
            .eq('player', playerName)
            .eq('realm', realmName)
            .single();

        const collectionData = {
            player: playerName,
            realm: realmName,
            pets: pets,
            score: score,
            updated_at: new Date().toISOString()
        };

        let result;
        if (existing) {
            result = await supabaseClient
                .from('collections')
                .update(collectionData)
                .eq('id', existing.id);
        } else {
            result = await supabaseClient
                .from('collections')
                .insert(collectionData);
        }

        return !result.error;
    } catch (err) {
        console.error('Failed to save collection:', err);
        return false;
    }
}

/**
 * Load collection from Supabase
 */
async function loadCollectionFromSupabase(playerName, realmName) {
    try {
        const { data, error } = await supabaseClient
            .from('collections')
            .select('*')
            .eq('player', playerName)
            .eq('realm', realmName)
            .single();

        return error ? null : data;
    } catch (err) {
        return null;
    }
}

/**
 * Fetch leaderboard data
 */
async function fetchLeaderboard() {
    try {
        const { data, error } = await supabaseClient
            .from('Leaderboard')
            .select('*')
            .order('score', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Leaderboard fetch error:', error);
            return [];
        }
        
        console.log('Leaderboard data:', data);
        return data || [];
    } catch (err) {
        console.error('Leaderboard fetch exception:', err);
        return [];
    }
}

/**
 * Submit score to leaderboard
 */
async function submitScore() {
    if (!currentScoreData || !playerData) {
        alert('Please load your collection first!');
        return;
    }

    const data = {
        player: playerData.playerName,
        realm: playerData.realmName,
        score: currentScoreData.total,
        pets: currentScoreData.stats.uniqueCount,
        level25: currentScoreData.stats.level25Count,
        rare: currentScoreData.stats.rareCount,
        epic: currentScoreData.stats.epicCount
    };

    // Generate collection fingerprint from pet data
    const petList = playerData.pets || [];
    const sortedPets = petList
        .map(p => `${p.speciesID || 0}-${p.level || 1}-${(typeof p.quality === 'number' ? p.quality : (p.qualityID || 0))}`)
        .sort()
        .join(',');
    const collectionId = btoa(sortedPets).substring(0, 64);

    if (!confirm('Submit your score?\n\nPlayer: ' + data.player + '-' + data.realm +
        '\nScore: ' + data.score.toLocaleString() +
        '\nPets: ' + data.pets +
        '\nLevel 25: ' + data.level25)) {
        return;
    }

    try {
        console.log('Collection ID:', collectionId);
        console.log('Current player:', data.player);
        
        // FIRST: Check if this exact collection already exists under a different character (prevents multi-char submissions)
        const { data: duplicateCheck } = await supabaseClient
            .from('Leaderboard')
            .select('id, score, player, realm, collection_id')
            .eq('collection_id', collectionId)
            .maybeSingle();

        console.log('Duplicate check result:', duplicateCheck);

        if (duplicateCheck) {
            if (duplicateCheck.player !== data.player) {
                // Same collection, different character name - ASK TO REPLACE
                if (!confirm('⚠️ This collection is already on the leaderboard as:\n\n' +
                    duplicateCheck.player + '-' + duplicateCheck.realm + ' (Score: ' + duplicateCheck.score.toLocaleString() + ')\n\n' +
                    'Replace with ' + data.player + '-' + data.realm + '?')) {
                    return;
                }
                
                // Delete the old entry
                await supabaseClient
                    .from('Leaderboard')
                    .delete()
                    .eq('id', duplicateCheck.id);
                
                console.log('Deleted old entry for:', duplicateCheck.player);
            }
            // If it's the same player name, allow it (they're updating their own score)
        }

        // SECOND: Check if this specific player already has a score
        const { data: existing } = await supabaseClient
            .from('Leaderboard')
            .select('id, score, player, realm, collection_id')
            .eq('player', data.player)
            .eq('realm', data.realm)
            .maybeSingle();

        if (existing && existing.score >= data.score) {
            alert('Your current leaderboard score (' + existing.score.toLocaleString() + ') is higher or equal!');
            return;
        }

        // If player already exists, update; otherwise insert
        if (existing) {
            result = await supabaseClient
                .from('Leaderboard')
                .update({
                    realm: data.realm,
                    score: data.score,
                    pets: data.pets,
                    level25: data.level25,
                    rare: data.rare,
                    epic: data.epic,
                    collection_id: collectionId,
                    created_at: new Date()
                })
                .eq('player', data.player)
                .eq('realm', data.realm);
        } else {
            result = await supabaseClient
                .from('Leaderboard')
                .insert({
                    player: data.player,
                    realm: data.realm,
                    score: data.score,
                    pets: data.pets,
                    level25: data.level25,
                    rare: data.rare,
                    epic: data.epic,
                    collection_id: collectionId,
                    created_at: new Date()
                });
        }

        console.log('Upsert result:', result);

        if (result.error) {
            console.error('Upsert error:', result.error);
            alert('Error submitting: ' + result.error.message);
            return;
        }

        showCopyFeedback();
        document.getElementById('copyFeedback').textContent = '✓ Score submitted!';
        await renderLeaderboard();
    } catch (err) {
        console.error('Submit exception:', err);
        alert('Error submitting score: ' + (err.message || 'Unknown error'));
    }
}

/**
 * View player collection in modal
 */
async function viewPlayerCollection(playerName, realmName, showAll = false) {
    const modal = document.getElementById('collectionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = playerName + '-' + realmName + "'s Collection";
    modalBody.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">Loading collection...</div>';
    modal.style.display = 'flex';

    const collection = await loadCollectionFromSupabase(playerName, realmName);

    if (!collection || !collection.pets || collection.pets.length === 0) {
        modalBody.innerHTML = '<div style="text-align:center;padding:40px;">' +
            '<p style="color:#ff6b6b;font-size:1.2em;">❌ Collection not found</p>' +
            '<p style="color:#888;margin-top:10px;">This player hasn\'t uploaded their collection yet.</p></div>';
        return;
    }

    const pets = collection.pets;
    let level25 = 0, rareCount = 0, epicCount = 0;
    const familiesOwned = new Set();

    pets.forEach(pet => {
        if (pet.level === 25) level25++;
        if (pet.quality >= 3) rareCount++;
        if (pet.quality >= 4) epicCount++;
        if (pet.petType) familiesOwned.add(pet.petType);
    });

    pets.sort((a, b) => (b.level !== a.level) ? b.level - a.level : b.quality - a.quality);

    // Comparison logic - find pets they have that you don't
    let comparisonHTML = '';
    if (ownedSpeciesIDs.size > 0) {
        const theirPetIDs = new Set(pets.map(p => p.speciesID));
        const yourPetIDs = ownedSpeciesIDs;
        
        const theyHaveYouDont = pets.filter(p => !yourPetIDs.has(p.speciesID));
        const youHaveTheyDont = [...yourPetIDs].filter(id => !theirPetIDs.has(id));
        
        comparisonHTML = '<div class="comparison-section">' +
            '<h4 style="color:#ffaa00;margin:10px 0;">📊 Comparison</h4>' +
            '<div style="display:flex;gap:20px;margin:10px 0;">' +
            '<div class="comparison-stat"><span class="value" style="color:#ff6b6b;">' + theyHaveYouDont.length + '</span> pets they have that you don\'t</div>' +
            '<div class="comparison-stat"><span class="value" style="color:#00ff88;">' + youHaveTheyDont.length + '</span> pets you have that they don\'t</div>' +
            '</div>' +
            (theyHaveYouDont.length > 0 ? 
                '<button class="modal-btn" onclick="showMissingPetsFromPlayer(\'' + playerName + '\', \'' + realmName + '\')" style="margin-top:10px;">🔍 Show Pets You\'re Missing</button>' 
                : '') +
            '</div>';
    }

    // Determine how many pets to show
    const petsToShow = showAll ? pets : pets.slice(0, 50);
    const hasMore = pets.length > 50 && !showAll;

    modalBody.innerHTML =
        '<div class="modal-stats">' +
        '<div class="modal-stat"><div class="value">' + pets.length + '</div><div class="label">Pets</div></div>' +
        '<div class="modal-stat"><div class="value">' + level25 + '</div><div class="label">Lv 25</div></div>' +
        '<div class="modal-stat"><div class="value">' + rareCount + '</div><div class="label">Rare+</div></div>' +
        '<div class="modal-stat"><div class="value">' + familiesOwned.size + '</div><div class="label">Families</div></div>' +
        '<div class="modal-stat score"><div class="value">' + (collection.score ? collection.score.toLocaleString() : 'N/A') + '</div><div class="label">Score</div></div>' +
        '</div>' +
        comparisonHTML +
        '<div class="modal-pets">' +
        petsToShow.map(pet => {
            const qc = ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary'][pet.quality] || 'common';
            const fi = families[pet.petType]?.icon || '❓';
            return '<div class="modal-pet ' + qc + '">' +
                '<span class="pet-icon">' + fi + '</span>' +
                '<span class="pet-name">' + (pet.speciesName || 'Unknown') + '</span>' +
                '<span class="pet-level">Lv ' + pet.level + '</span></div>';
        }).join('') +
        '</div>' +
        (hasMore ? '<button class="modal-btn show-more-btn" onclick="viewPlayerCollection(\'' + playerName + '\', \'' + realmName + '\', true)" style="margin-top:15px;">📜 Show All ' + pets.length + ' Pets</button>' : '') +
        '<div class="modal-updated">Last updated: ' + (collection.updated_at ? new Date(collection.updated_at).toLocaleDateString() : 'Unknown') + '</div>';
}

function closeModal() {
    document.getElementById('collectionModal').style.display = 'none';
}

/**
 * Show pets that another player has but you don't
 */
async function showMissingPetsFromPlayer(playerName, realmName) {
    const collection = await loadCollectionFromSupabase(playerName, realmName);
    if (!collection || !collection.pets) return;
    
    const theirPets = collection.pets.filter(p => !ownedSpeciesIDs.has(p.speciesID));
    
    if (theirPets.length === 0) {
        alert('You have all the pets they have!');
        return;
    }
    
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = 'Pets ' + playerName + ' has that you don\'t (' + theirPets.length + ')';
    
    theirPets.sort((a, b) => {
        if (a.speciesName && b.speciesName) return a.speciesName.localeCompare(b.speciesName);
        return 0;
    });
    
    modalBody.innerHTML = '<div class="modal-missing-pets">' +
        theirPets.map(pet => {
            const qc = ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary'][pet.quality] || 'common';
            const fi = families[pet.petType]?.icon || '❓';
            
            // Find this pet in the database to get source info
            const dbPet = ALL_PETS_DATABASE.find(p => p.speciesID === pet.speciesID);
            const sourceInfo = dbPet ? (dbPet.sourceText || dbPet.zone || 'Unknown') : 'Unknown';
            
            return '<div class="modal-pet missing-highlight ' + qc + '">' +
                '<span class="pet-icon">' + fi + '</span>' +
                '<div class="pet-details-column">' +
                '<span class="pet-name">' + (pet.speciesName || 'Unknown') + '</span>' +
                '<span class="pet-source">📍 ' + sourceInfo + '</span>' +
                '</div>' +
                '<span class="pet-level">Lv ' + pet.level + '</span></div>';
        }).join('') +
        '</div>' +
        '<button class="modal-btn" onclick="viewPlayerCollection(\'' + playerName + '\', \'' + realmName + '\')" style="margin-top:15px;">← Back to Full Collection</button>';
}
