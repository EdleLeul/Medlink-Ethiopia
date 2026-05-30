import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX  = 'medlink_cache_';
const CACHE_META    = 'medlink_cache_meta';
const MAX_AGE_DAYS  = 30; // Cache expires after 30 days

/**
 * Sanitises a URL into a safe storage key.
 * e.g. http://10.0.2.2:5000/api/records/ML-123/allergies
 *      → medlink_cache_records_ML123_allergies
 */
function urlToKey(url) {
  return CACHE_PREFIX + url
    .replace(/https?:\/\/[^/]+\/api\/?/, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 100);
}

/**
 * Saves an API response to AsyncStorage.
 * @param {string} url - The full API URL
 * @param {*}      data - The response data object
 */
export async function saveCache(url, data) {
  try {
    const key     = urlToKey(url);
    const payload = JSON.stringify({
      data,
      savedAt:   new Date().toISOString(),
      url,
    });
    await AsyncStorage.setItem(key, payload);

    // Update cache metadata (list of all cached keys + timestamps)
    const metaRaw = await AsyncStorage.getItem(CACHE_META);
    const meta    = metaRaw ? JSON.parse(metaRaw) : {};
    meta[key]     = { url, savedAt: new Date().toISOString() };
    await AsyncStorage.setItem(CACHE_META, JSON.stringify(meta));
  } catch (e) {
    console.warn('Cache save failed:', e.message);
  }
}

/**
 * Loads a cached API response.
 * Returns { data, savedAt, isCache: true } or null if not found.
 * @param {string} url
 */
export async function loadCache(url) {
  try {
    const key  = urlToKey(url);
    const raw  = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Check if cache is older than MAX_AGE_DAYS
    const savedAt = new Date(parsed.savedAt);
    const ageDays = (Date.now() - savedAt) / (1000 * 60 * 60 * 24);
    if (ageDays > MAX_AGE_DAYS) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return { ...parsed, isCache: true };
  } catch (e) {
    console.warn('Cache load failed:', e.message);
    return null;
  }
}

/**
 * Clears all cached data for a patient (called on logout).
 */
export async function clearAllCache() {
  try {
    const metaRaw = await AsyncStorage.getItem(CACHE_META);
    if (!metaRaw) return;
    const meta = JSON.parse(metaRaw);
    const keys = Object.keys(meta);
    await AsyncStorage.multiRemove([...keys, CACHE_META]);
  } catch (e) {
    console.warn('Cache clear failed:', e.message);
  }
}

/**
 * Returns metadata about all cached items.
 * Used to show the patient what data is available offline.
 */
export async function getCacheMeta() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_META);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Preloads and caches all critical patient data.
 * Called once on login when internet is available.
 * @param {Function} apiFn - The api module (passed to avoid circular imports)
 * @param {string}   patientID
 */
export async function preloadPatientData(apiFn, patientID) {
  const RECORD_TYPES = [
    'consultations', 'diagnoses', 'medications', 'labResults',
    'radiology', 'allergies', 'vaccinations', 'vitals',
    'surgicalHistory', 'familyHistory', 'referrals', 'doctorNotes'
  ];

  try {
    console.log('Preloading offline cache for', patientID);
    await Promise.allSettled([
      // Patient profile
      apiFn.getPatient('me').then(r => saveCache('/api/patients/me', r.data)),
      // Children
      apiFn.getChildren().then(r => saveCache('/api/children', r.data)),
      // Appointments
      apiFn.getAppointments(patientID).then(r =>
        saveCache(`/api/appointments/${patientID}`, r.data)),
      // All 12 EMR types
      ...RECORD_TYPES.map(type =>
        apiFn.getRecords(patientID, type).then(r =>
          saveCache(`/api/records/${patientID}/${type}`, r.data))
      ),
    ]);
    console.log('Offline cache preload complete');
  } catch (e) {
    console.warn('Preload partial failure:', e.message);
  }
}