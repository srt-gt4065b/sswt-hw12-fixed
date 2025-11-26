/* ============================================================
   Firebase Realtime DB – 안정화 모듈
   사용처: index.html / leaderboard.html
============================================================ */

// 전역 상태
window.firebaseReady = false;
window.useLocalBackup = false;
window.DB_MAX_RETRY = 2;

/* ============================================================
   Firebase 초기화
============================================================ */
const firebaseConfig = {
    apiKey: "AIzaSyDKHFod7Hr8qeUgUb052Ir3DCxF0ZRb6To",
    authDomain: "sswt2025fall.firebaseapp.com",
    databaseURL: "https://sswt2025fall-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sswt2025fall",
    storageBucket: "sswt2025fall.firebasestorage.app",
    messagingSenderId: "304733564282",
    appId: "1:304733564282:web:e8ec392e6fe4bf871dbac3",
    measurementId: "G-RRWD5Z2C16"
};

let app = null;
let database = null;

async function initFirebase() {
    try {
        console.log("🔥 Initializing Firebase...");

        const { initializeApp } = await import(
            "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"
        );
        const { getDatabase } = await import(
            "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"
        );

        app = initializeApp(firebaseConfig);
        database = getDatabase(app);

        window.firebaseReady = true;
        console.log("✅ Firebase initialized successfully!");

    } catch (err) {
        console.error("❌ Firebase initialization failed:", err);
        window.firebaseReady = false;
        window.useLocalBackup = true;
    }
}

await initFirebase();

/* ============================================================
   Local Storage 백업 모듈
============================================================ */
const LocalBackup = {
    key: "galagaScores",

    save(scoreObj) {
        const data = this.loadAll();
        data.push(scoreObj);
        localStorage.setItem(this.key, JSON.stringify(data));
        console.log("💾 Score saved locally (backup mode)");
    },

    loadAll() {
        const raw = localStorage.getItem(this.key);
        return raw ? JSON.parse(raw) : [];
    },

    getTop(limit = 100) {
        return this.loadAll()
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
};

/* ============================================================
   Firebase 점수 저장 함수
============================================================ */
window.saveScore = async function (score, stage, playerName, studentId) {
    const scoreObj = {
        studentId,
        playerName,
        score,
        stage,
        timestamp: Date.now(),
        date: new Date().toISOString()
    };

    // 백업 저장
    LocalBackup.save(scoreObj);

    // Firebase 비활성 상태라면 종료
    if (!window.firebaseReady) {
        console.warn("⚠️ Firebase unavailable — saved locally only.");
        return false;
    }

    try {
        const { ref, push } = await import(
            "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"
        );

        const scoresRef = ref(database, "scores");
        await push(scoresRef, scoreObj);

        console.log("✅ Score saved to Firebase!");
        return true;

    } catch (err) {
        console.error("❌ Firebase save error:", err);
        window.useLocalBackup = true;
        return false;
    }
};

/* ============================================================
   Firebase 점수 로딩
============================================================ */
window.loadFirebaseScores = async function (limit = 200, retry = 0) {
    if (!window.firebaseReady) {
        console.warn("⚠️ Firebase not ready, using local backup only.");
        return LocalBackup.getTop(limit);
    }

    try {
        const { ref, query, orderByChild, limitToLast, get } = await import(
            "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"
        );

        const scoresRef = ref(database, "scores");
        const q = query(scoresRef, orderByChild("score"), limitToLast(limit));

        const snapshot = await get(q);

        if (!snapshot.exists()) {
            console.warn("⚠️ Firebase returned no data.");
            return LocalBackup.getTop(limit);
        }

        const result = [];
        snapshot.forEach((child) => result.push(child.val()));

        console.log(`📥 Loaded ${result.length} scores from Firebase`);
        return result.sort((a, b) => b.score - a.score);

    } catch (err) {
        console.error("❌ Firebase load error:", err);

        if (retry < window.DB_MAX_RETRY) {
            console.log(`🔄 Retry load... (${retry + 1})`);
            return await window.loadFirebaseScores(limit, retry + 1);
        }

        return LocalBackup.getTop(limit);
    }
};

/* ============================================================
   리더보드 표시용 포맷터
============================================================ */
window.formatRankData = function (scores) {
    return scores.map((s, index) => ({
        rank: index + 1,
        studentId: s.studentId || "N/A",
        playerName: s.playerName || "Unknown",
        score: s.score,
        stage: s.stage,
        date: new Date(s.date || s.timestamp).toLocaleString()
    }));
};
