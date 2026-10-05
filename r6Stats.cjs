const {R6Client} = require("r6-data.js");
require("dotenv").config();

const r6 = new R6Client({apiKey: process.env.R6_API_KEY});

function getSiegeRank(rankNum) {
  // Validate input type and value range
  if (typeof rankNum !== "number" || isNaN(rankNum) || rankNum < 1) {
    return "Unranked";
  }

  // Siege rank tiers in ascending order
  const tiers = [
    "Copper",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Emerald",
    "Diamond",
  ];

  // Each standard tier has 5 divisions (V to I)
  const DIVISIONS_PER_TIER = 5;

  // Anything above Diamond I (Rank 35) defaults to Champion
  if (rankNum > tiers.length * DIVISIONS_PER_TIER) {
    return "Champion";
  }

  // Convert 1-based index to 0-based for math mapping
  const zeroBasedIndex = rankNum - 1;

  // Calculate which tier the index falls into
  const tierIndex = Math.floor(zeroBasedIndex / DIVISIONS_PER_TIER);
  const tierName = tiers[tierIndex];

  // Calculate the division number (progressing from 5 down to 1)
  const divisionNum =
    DIVISIONS_PER_TIER - (zeroBasedIndex % DIVISIONS_PER_TIER);

  return `${tierName} ${divisionNum}`;
}

async function withRetry(fn, attempts = 3, delayMs = 1500) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.response?.status;
      const retriable =
        status === 504 ||
        status === 502 ||
        status === 503 ||
        err.code === "ECONNRESET";
      if (!retriable || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
}

// Create an async function
async function fetchR6Stats(username, platform = "uplay") {
  try {
    const profile = await withRetry(() =>
      r6.players.getProfile({
        nameOnPlatform: username,
        platformType: platform,
        platform_families: "pc",
      }),
    );

    if (!profile.account) {
      const trackerUrl = `https://r6.tracker.network/r6siege/profile/ubi/${username}/overview`;
      return `Couldn't fetch stats for "${username}" via Ubisoft API. Try ${trackerUrl}`;
    }

    const firstPlatform = profile.stats.platform_families_full_profiles[0];
    const rankedBoard = firstPlatform.board_ids_full_profiles.find(
      (b) => b.board_id === "ranked",
    );
    const rankedData = rankedBoard.full_profiles[0];
    const profileData = rankedData.profile;

    const rank = getSiegeRank(profileData.rank);
    const peakRank = getSiegeRank(profileData.max_rank);
    const wl = (profileData.wins / profileData.losses).toFixed(2);
    const kd = (profileData.kills / profileData.deaths).toFixed(2);

    const result = `${profile.player.nameOnPlatform} | S${rankedData.season_id} | Rank: ${rank} | Peak: ${peakRank} | W/L: ${wl} (${profileData.wins}/${profileData.losses}) | K/D: ${kd} (${profileData.kills}/${profileData.deaths}) | Level: ${profile.account.level}`;

    // Keep the console logs for debugging if you want
    console.log("Fetched stats for:", username);
    console.log(result);

    return result;
  } catch (error) {
    console.error(`Error fetching stats for ${username}:`, error);
    return null;
  }
}
fetchR6Stats("PsycoName", "uplay");
module.exports = {fetchR6Stats};
