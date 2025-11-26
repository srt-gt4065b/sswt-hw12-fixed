/* ============================================================
   GALAGA LEADERBOARD ENGINE v2.0
============================================================ */

let allScores = [];
let filteredScores = [];
let currentSort = { column: "score", direction: "desc" };
let currentFilter = "all";

/* ============================================================
   페이지 로드 시 자동 실행
============================================================ */
window.addEventListener("load", async () => {
    await loadLeaderboard();
    attachSearchHandler();
    setupAutoRefresh();
});

/* ============================================================
   Load leaderboard from Firebase (or fallback)
============================================================ */
async function loadLeaderboard() {
    const tbody = document.getElementById("leaderboardBody");

    tbody.innerHTML = `<tr><td colspan="6" class="loading">Loading...</td></tr>`;

    try {
        const scores = await window.loadFirebaseScores(200);

        if (!scores || scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="no-data">No scores found.</td></tr>`;
            return;
        }

        allScores = scores;
        applyFilter("all");
        
    } catch (err) {
        console.error("❌ Failed to load leaderboard:", err);
        tbody.innerHTML = `<tr><td colspan="6" class="no-data">Error loading data</td></tr>`;
    }
}

/* ============================================================
   FILTER
============================================================ */
function applyFilter(filterType) {
    currentFilter = filterType;

    // UI 탭 상태 적용
    document.querySelectorAll(".filter-tab").forEach(tab => {
        tab.classList.remove("active");
    });
    const selected = document.querySelector(`[data-filter="${filterType}"]`);
    if (selected) selected.classList.add("active");

    let data = [...allScores];

    switch (filterType) {
        case "top":
            data = data.sort((a, b) => b.score - a.score).slice(0, 10);
            break;
        case "stage10":
            data = data.filter(s => s.stage >= 10);
            break;
        case "today":
            const today = new Date().toDateString();
            data = data.filter(s =>
                new Date(s.date || s.timestamp).toDateString() === today
            );
            break;
    }

    filteredScores = data;
    applySort(currentSort.column, true);
}

/* ============================================================
   SORTING
============================================================ */
function applySort(column, skipToggle = false) {
    if (!skipToggle) {
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
        } else {
            currentSort.column = column;
            currentSort.direction = column === "score" ? "desc" : "asc";
        }
    }

    // 기존 sort indicator 제거
    document.querySelectorAll("th").forEach(th => {
        th.classList.remove("sort-asc", "sort-desc");
    });

    const th = document.querySelector(`th[data-col="${column}"]`);
    if (th) {
        th.classList.add(
            currentSort.direction === "asc" ? "sort-asc" : "sort-desc"
        );
    }

    filteredScores.sort((a, b) => {
        let A, B;

        switch (column) {
            case "studentId":
                A = (a.studentId || "").toLowerCase();
                B = (b.studentId || "").toLowerCase();
                break;
            case "name":
                A = (a.playerName || "").toLowerCase();
                B = (b.playerName || "").toLowerCase();
                break;
            case "date":
                A = new Date(a.date || a.timestamp).getTime();
                B = new Date(b.date || b.timestamp).getTime();
                break;
            default:
                A = a[column] || 0;
                B = b[column] || 0;
        }

        if (currentSort.direction === "asc") return A > B ? 1 : -1;
        else return A < B ? 1 : -1;
    });

    renderTable();
}

/* ============================================================
   TABLE RENDER
============================================================ */
function renderTable() {
    const tbody = document.getElementById("leaderboardBody");
    const search = document.getElementById("searchBox").value.toLowerCase();

    let rows = filteredScores;

    // apply search
    if (search) {
        rows = rows.filter(s =>
            (s.studentId || "").toLowerCase().includes(search) ||
            (s.playerName || "").toLowerCase().includes(search)
        );
    }

    if (rows.length === 0) {
        tbody.innerHTML =
            `<tr><td colspan="6" class="no-data">No matching results.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows
        .map((s, idx) => {
            const rank = idx + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : "";

            return `
            <tr>
                <td class="${rankClass}">${rank <= 3 ? ["🥇","🥈","🥉"][rank-1] : rank}</td>
                <td class="student-id">${s.studentId}</td>
                <td>${s.playerName}</td>
                <td class="score">${s.score.toLocaleString()}</td>
                <td>${s.stage}</td>
                <td>${new Date(s.date || s.timestamp).toLocaleString()}</td>
            </tr>
        `;
        })
        .join("");
}

/* ============================================================
   SEARCH
============================================================ */
function attachSearchHandler() {
    const box = document.getElementById("searchBox");
    box.addEventListener("input", () => renderTable());
}

/* ============================================================
   CSV EXPORT
============================================================ */
function exportCSV() {
    const rows = [
        ["Rank", "Student ID", "Name", "Score", "Stage", "Date"],
        ...filteredScores.map((s, idx) => [
            idx + 1,
            s.studentId,
            s.playerName,
            s.score,
            s.stage,
            new Date(s.date || s.timestamp).toLocaleString()
        ])
    ];

    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "galaga_leaderboard.csv";
    a.click();
}

/* ============================================================
   AUTO REFRESH (30s)
============================================================ */
function setupAutoRefresh() {
    setInterval(async () => {
        await loadLeaderboard();
    }, 30000);
}

/* ============================================================
   버튼 이벤트 (event 객체 없음)
============================================================ */
window.applyFilter = applyFilter;
window.applySort = applySort;
window.exportCSV = exportCSV;

