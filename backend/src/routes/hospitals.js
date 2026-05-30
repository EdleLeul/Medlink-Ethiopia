// ─── hospitals.js ─────────────────────────────────────────────────────────────
const hospitalRouter = require('express').Router();
const { collections } = require('../config/firebase');
/**
 * GET /api/hospitals/search?lat=9.03&lng=38.74&radius=10
 * Returns hospitals within radius (km) of given coordinates.
 * Uses Firestore GeoPoint + in-app distance filtering.
 * For production, replace with a proper GeoHash or Algolia geo-search.
 */
hospitalRouter.get('/search', async (req, res, next) => {
  try {
    const { lat, lng, radius = 10, speciality } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    // Bounding box pre-filter (1 degree ≈ 111 km)
    const delta = radiusKm / 111;
    let query = collections.hospitals
      .where('lat', '>=', userLat - delta)
      .where('lat', '<=', userLat + delta);

    if (speciality) query = query.where('specialities', 'array-contains', speciality);

    const snap = await query.get();

    // Haversine distance calculation
    function haversine(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 +
                Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    const hospitals = snap.docs
      .map(d => {
        const h = d.data();
        const dist = haversine(userLat, userLng, h.lat, h.lng);
        return { id: d.id, ...h, distanceKm: Math.round(dist * 10) / 10 };
      })
      .filter(h => h.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({ hospitals });
  } catch (err) {
    next(err);
  }
});

module.exports = hospitalRouter;