const admin = require("firebase-admin");

let dbPromise;

function getDb() {
  if (!dbPromise) {
    dbPromise = Promise.resolve().then(() => {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      }
      return admin.firestore();
    });
  }
  return dbPromise;
}

const forecastCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCachedForecast(riderId) {
  const cached = forecastCache.get(riderId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.forecast;
  }
  forecastCache.delete(riderId);
  return null;
}

function setCachedForecast(riderId, forecast) {
  forecastCache.set(riderId, { forecast, timestamp: Date.now() });
}

function linearRegression(data) {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  data.forEach((y, x) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function predictEarnings(revenues) {
  if (revenues.length < 3) {
    return {
      predictedEarnings: revenues.reduce((sum, r) => sum + r.amount, 0) / Math.max(revenues.length, 1),
      confidence: 30,
      trend: "stable",
      weeklyBreakdown: [],
      recommendations: ["Need more data for accurate predictions. Continue logging transactions."],
    };
  }

  revenues.sort((a, b) => a.date.localeCompare(b.date));
  const amounts = revenues.map((r) => r.amount);
  const { slope, intercept } = linearRegression(amounts);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

  let trend = "stable";
  if (slope > avgAmount * 0.05) trend = "increasing";
  else if (slope < -avgAmount * 0.05) trend = "decreasing";

  const predictedEarnings = Math.max(0, slope * amounts.length + intercept);
  const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const confidence = Math.max(50, Math.min(95, 100 - (stdDev / (avgAmount || 1)) * 100));

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyData = daysOfWeek.map((day) => {
    const dayEarnings = revenues.filter((r) => daysOfWeek[new Date(r.date).getDay()] === day).map((r) => r.amount);
    const avgDayEarnings = dayEarnings.length > 0 ? dayEarnings.reduce((a, b) => a + b, 0) / dayEarnings.length : avgAmount;
    return {
      day,
      avgEarnings: Math.round(avgDayEarnings),
      predicted: Math.round(avgDayEarnings * (predictedEarnings / avgAmount || 1)),
    };
  });

  const recommendations = [];
  if (trend === "increasing") {
    recommendations.push("Your earnings are trending upward. Keep up the good work!");
    recommendations.push("Consider increasing your daily delivery targets.");
  } else if (trend === "decreasing") {
    recommendations.push("Earnings declining. Try adjusting your availability hours.");
    recommendations.push("Focus on peak delivery times for better earnings.");
  } else {
    recommendations.push("Earnings stable. Consider strategies to boost income.");
  }

  if (amounts.length >= 7) {
    const recentAvg = amounts.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const priorAvg = amounts.slice(-7, -3).reduce((a, b) => a + b, 0) / 4;
    if (recentAvg < priorAvg * 0.8) {
      recommendations.push("Recent performance dropped. Check if you're missing peak hours.");
    }
  }

  return {
    predictedEarnings: Math.round(predictedEarnings),
    confidence: Math.round(confidence),
    trend,
    weeklyBreakdown: weeklyData,
    recommendations,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Content-Type", "application/json");
    return res.status(405).send({ ok: false, error: "Method not allowed" });
  }

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    res.setHeader("Content-Type", "application/json");
    return res.status(400).send({ ok: false, error: "Invalid JSON" });
  }

  const riderId = typeof body?.riderId === "string" ? body.riderId.trim() : "";
  const days = typeof body?.days === "number" ? Math.min(Math.max(body.days, 1), 30) : 7;

  if (!riderId) {
    res.setHeader("Content-Type", "application/json");
    return res.status(400).send({ ok: false, error: "riderId is required" });
  }

  // Check cache first (reduces DB reads and compute time)
  const cachedForecast = getCachedForecast(riderId);
  if (cachedForecast) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=1800"); // 30 minutes
    return res.status(200).send({ ok: true, forecast: cachedForecast, cached: true });
  }

  try {
    const db = await getDb();
    const revenuesSnap = await db
      .collection("revenue")
      .where("rider_id", "==", riderId)
      .orderBy("order_completed_at", "desc")
      .limit(60)
      .get();

    const revenues = revenuesSnap.docs.map((doc) => {
      const data = doc.data();
      const date = (data.order_completed_at || data.created_at || "")?.split("T")[0] || new Date().toISOString().split("T")[0];
      return { amount: Number(data.amount) || 0, date };
    });

    const forecast = predictEarnings(revenues, days);
    setCachedForecast(riderId, forecast);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.status(200).send({ ok: true, forecast });
  } catch (err) {
    console.error("[forecast] error:", err);
    res.setHeader("Content-Type", "application/json");
    res.status(500).send({ ok: false, error: "forecast_failed", details: String(err) });
  }
};