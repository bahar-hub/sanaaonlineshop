/* ============================================================
 * Admin Panel — Reports page behaviour
 * NEW FILE — replaces the old admin-dashboard-f.js.
 * Vanilla JS only. No API calls. Mock data only.
 *
 * Contains a small Jalali (Persian) calendar date-conversion
 * utility — needed only to compute month lengths / month names
 * for the month & year selectors. NOT a calendar picker; the
 * client explicitly asked to keep this to simple month/year
 * dropdowns.
 * ============================================================ */

(function () {
    "use strict";


    /* --------------------------------------------------------
     * Jalali <-> Gregorian conversion
     * (public-domain astronomical algorithm; round-trip tested)
     * -------------------------------------------------------- */

    function divF(a, b) { return ~~(a / b); }
    function modF(a, b) { return a - ~~(a / b) * b; }

    var JALALI_BREAKS_F = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
        1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

    function jalCalF(jy) {
        var bl = JALALI_BREAKS_F.length,
            gy = jy + 621,
            leapJ = -14,
            jp = JALALI_BREAKS_F[0],
            jm, jump, leapG, n, i, march, leap;

        for (i = 1; i < bl; i += 1) {
            jm = JALALI_BREAKS_F[i];
            jump = jm - jp;
            if (jy < jm) break;
            leapJ = leapJ + divF(jump, 33) * 8 + divF(modF(jump, 33), 4);
            jp = jm;
        }
        n = jy - jp;

        leapJ = leapJ + divF(n, 33) * 8 + divF(modF(n, 33) + 3, 4);
        if (modF(jump, 33) === 4 && jump - n === 4) leapJ += 1;

        leapG = divF(gy, 4) - divF((divF(gy, 100) + 1) * 3, 4) - 150;
        march = 20 + leapJ - leapG;

        if (jump - n < 6) n = n - jump + divF(jump + 4, 33) * 33;
        leap = modF(modF(n + 1, 33) - 1, 4);
        if (leap === -1) leap = 4;

        return { leap: leap, gy: gy, march: march };
    }

    function g2dF(gy, gm, gd) {
        var d = divF((gy + divF(gm - 8, 6) + 100100) * 1461, 4)
            + divF(153 * modF(gm + 9, 12) + 2, 5)
            + gd - 34840408;
        d = d - divF(divF(gy + 100100 + divF(gm - 8, 6), 100) * 3, 4) + 752;
        return d;
    }

    function d2gF(jdn) {
        var j, i, gd, gm, gy;
        j = 4 * jdn + 139361631;
        j = j + divF(divF(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
        i = divF(modF(j, 1461), 4) * 5 + 308;
        gd = divF(modF(i, 153), 5) + 1;
        gm = modF(divF(i, 153), 12) + 1;
        gy = divF(j, 1461) - 100100 + divF(8 - gm, 6);
        return [gy, gm, gd];
    }

    function toJalaliF(gy, gm, gd) {
        var jdn = g2dF(gy, gm, gd);
        var gy2 = d2gF(jdn)[0], jy = gy2 - 621, r, jdn1f, jd, jm, k;
        r = jalCalF(jy);
        jdn1f = g2dF(r.gy, 3, r.march);
        k = jdn - jdn1f;
        if (k >= 0) {
            if (k <= 185) {
                jm = 1 + divF(k, 31);
                jd = modF(k, 31) + 1;
                return [jy, jm, jd];
            }
            k -= 186;
        } else {
            jy -= 1;
            k += 179;
            if (r.leap === 1) k += 1;
        }
        jm = 7 + divF(k, 30);
        jd = modF(k, 30) + 1;
        return [jy, jm, jd];
    }

    function jalaliMonthLengthF(jy, jm) {
        if (jm <= 6) return 31;
        if (jm <= 11) return 30;
        return jalCalF(jy).leap === 0 ? 30 : 29;
    }


    /* --------------------------------------------------------
     * Helpers
     * -------------------------------------------------------- */

    var PERSIAN_DIGITS_F = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

    function toPersianDigitsF(value) {
        return String(value).replace(/[0-9]/g, function (d) {
            return PERSIAN_DIGITS_F[+d];
        });
    }

    function formatNumberF(value) {
        return value.toLocaleString("fa-IR");
    }

    var MONTH_NAMES_F = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
        "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

    var MONTH_ABBR_F = ["فرو", "ارد", "خرد", "تیر", "مرد", "شهر",
        "مهر", "آبان", "آذر", "دی", "بهمن", "اسف"];


    /* --------------------------------------------------------
     * Deterministic mock-data generator
     * (seeded so the same month/year always shows the same
     * numbers within one session — clearly mock, no backend)
     * -------------------------------------------------------- */

    function mulberry32F(seed) {
        return function () {
            seed |= 0;
            seed = (seed + 0x6D2B79F5) | 0;
            var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function generateMonthlyReportF(jy, jm) {
        var rand = mulberry32F(jy * 100 + jm);
        var dayCount = jalaliMonthLengthF(jy, jm);
        var dailyAvg = 3800000 + rand() * 2200000;

        var values = [];
        var total = 0;
        for (var d = 0; d < dayCount; d += 1) {
            var v = Math.max(300000, dailyAvg * (0.6 + rand() * 0.8));
            values.push(Math.round(v));
            total += v;
        }
        total = Math.round(total);

        var orders = Math.round(dayCount * (16 + rand() * 10));
        var invoices = Math.round(orders * (0.85 + rand() * 0.1));
        var newCustomers = Math.round(dayCount * (2 + rand() * 3));

        var prevJm = jm - 1, prevJy = jy;
        if (prevJm < 1) { prevJm = 12; prevJy -= 1; }
        var prevRand = mulberry32F(prevJy * 100 + prevJm);
        var prevDayCount = jalaliMonthLengthF(prevJy, prevJm);
        var prevTotal = (3800000 + prevRand() * 2200000) * prevDayCount;

        var changePercent = ((total - prevTotal) / prevTotal) * 100;

        return {
            total: total,
            orders: orders,
            invoices: invoices,
            newCustomers: newCustomers,
            changePercent: changePercent,
            changeDirection: changePercent >= 0 ? "up" : "down",
            chartValues: values,
            dayCount: dayCount
        };
    }

    function generateYearlyReportF(jy) {
        var monthlyTotals = [];
        var totalSales = 0, totalOrders = 0, totalInvoices = 0, totalNewCustomers = 0;

        for (var m = 1; m <= 12; m += 1) {
            var monthData = generateMonthlyReportF(jy, m);
            monthlyTotals.push(monthData.total);
            totalSales += monthData.total;
            totalOrders += monthData.orders;
            totalInvoices += monthData.invoices;
            totalNewCustomers += monthData.newCustomers;
        }

        var randPrev = mulberry32F((jy - 1) * 77);
        var prevTotal = totalSales * (0.78 + randPrev() * 0.28);
        var changePercent = ((totalSales - prevTotal) / prevTotal) * 100;

        return {
            total: Math.round(totalSales),
            orders: totalOrders,
            invoices: totalInvoices,
            newCustomers: totalNewCustomers,
            changePercent: changePercent,
            changeDirection: changePercent >= 0 ? "up" : "down",
            monthlyTotals: monthlyTotals
        };
    }


    /* --------------------------------------------------------
     * Month / Year selectors
     * -------------------------------------------------------- */

    function getTodayJalaliF() {
        var now = new Date();
        return toJalaliF(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    function buildMonthOptionsF(selectEl, currentJy, currentJm) {
        var y = currentJy, m = currentJm;
        var months = [];

        for (var i = 0; i < 12; i += 1) {
            months.unshift({ jy: y, jm: m });
            m -= 1;
            if (m < 1) { m = 12; y -= 1; }
        }

        selectEl.innerHTML = "";
        months.forEach(function (item) {
            var opt = document.createElement("option");
            opt.value = item.jy + "-" + item.jm;
            opt.textContent = MONTH_NAMES_F[item.jm - 1] + " " + toPersianDigitsF(item.jy);
            if (item.jy === currentJy && item.jm === currentJm) {
                opt.selected = true;
            }
            selectEl.appendChild(opt);
        });
    }

    function buildYearOptionsF(selectEl, currentJy) {
        selectEl.innerHTML = "";
        for (var y = currentJy; y >= currentJy - 3; y -= 1) {
            var opt = document.createElement("option");
            opt.value = String(y);
            opt.textContent = toPersianDigitsF(y);
            if (y === currentJy) {
                opt.selected = true;
            }
            selectEl.appendChild(opt);
        }
    }


    /* --------------------------------------------------------
     * Charts — inline SVG, no external library.
     * Monthly: line/area chart across the days of the month.
     * Yearly: bar chart across the 12 months.
     * -------------------------------------------------------- */

    var CHART_VIEW_WIDTH = 600;
    var CHART_VIEW_HEIGHT = 200;
    var CHART_PADDING = 12;

    function buildLineChartPathsF(values) {
        var max = Math.max.apply(null, values);
        var min = Math.min.apply(null, values);
        var range = max - min || 1;

        var usableWidth = CHART_VIEW_WIDTH - CHART_PADDING * 2;
        var usableHeight = CHART_VIEW_HEIGHT - CHART_PADDING * 2;
        var step = usableWidth / (values.length - 1 || 1);

        var points = values.map(function (value, index) {
            var x = CHART_PADDING + step * index;
            var y = CHART_PADDING + usableHeight - ((value - min) / range) * usableHeight;
            return [x, y];
        });

        var linePath = points
            .map(function (point, index) {
                return (index === 0 ? "M" : "L") + point[0].toFixed(1) + "," + point[1].toFixed(1);
            })
            .join(" ");

        var areaPath =
            linePath +
            " L" + points[points.length - 1][0].toFixed(1) + "," + (CHART_PADDING + usableHeight) +
            " L" + points[0][0].toFixed(1) + "," + (CHART_PADDING + usableHeight) +
            " Z";

        return { linePath: linePath, areaPath: areaPath };
    }

    function renderMonthlyChartF(report) {
        var lineEl = document.getElementById("adminMonthlyChartLineF");
        var areaEl = document.getElementById("adminMonthlyChartAreaF");
        var labelsEl = document.getElementById("adminMonthlyChartLabelsF");

        var paths = buildLineChartPathsF(report.chartValues);
        if (lineEl) lineEl.setAttribute("d", paths.linePath);
        if (areaEl) areaEl.setAttribute("d", paths.areaPath);

        if (labelsEl) {
            labelsEl.innerHTML = "";
            var midDay = Math.round(report.dayCount / 2);
            [1, midDay, report.dayCount].forEach(function (day) {
                var span = document.createElement("span");
                span.textContent = toPersianDigitsF(day);
                labelsEl.appendChild(span);
            });
        }
    }

    function renderYearlyChartF(report) {
        var svg = document.getElementById("adminYearlyChartSvgF");
        var labelsEl = document.getElementById("adminYearlyChartLabelsF");
        if (!svg) return;

        // clear previously rendered bars (keep <defs> if any)
        svg.querySelectorAll("[data-bar-f]").forEach(function (bar) {
            bar.remove();
        });

        var values = report.monthlyTotals;
        var max = Math.max.apply(null, values) || 1;

        var usableWidth = CHART_VIEW_WIDTH - CHART_PADDING * 2;
        var usableHeight = CHART_VIEW_HEIGHT - CHART_PADDING * 2;
        var gap = 8;
        var barWidth = (usableWidth - gap * (values.length - 1)) / values.length;

        values.forEach(function (value, index) {
            var barHeight = (value / max) * usableHeight;
            var x = CHART_PADDING + index * (barWidth + gap);
            var y = CHART_PADDING + usableHeight - barHeight;

            var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("data-bar-f", "1");
            rect.setAttribute("x", x.toFixed(1));
            rect.setAttribute("y", y.toFixed(1));
            rect.setAttribute("width", barWidth.toFixed(1));
            rect.setAttribute("height", Math.max(barHeight, 2).toFixed(1));
            rect.setAttribute("rx", "3");
            rect.setAttribute("fill", "#A61579");
            rect.setAttribute("fill-opacity", index === values.length - 1 ? "1" : "0.35");
            svg.appendChild(rect);
        });

        if (labelsEl) {
            labelsEl.innerHTML = "";
            MONTH_ABBR_F.forEach(function (label) {
                var span = document.createElement("span");
                span.textContent = label;
                labelsEl.appendChild(span);
            });
        }
    }


    /* --------------------------------------------------------
     * Rendering stat cards (shared between monthly/yearly)
     * -------------------------------------------------------- */

    function setChangeF(id, percent, direction) {
        var el = document.getElementById(id);
        if (!el) return;
        var textEl = el.querySelector("[data-change-text-f]");
        if (textEl) {
            textEl.textContent = Math.abs(percent).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) + "٪";
        }
        el.classList.toggle("is-down", direction === "down");
    }

    function renderMonthlyViewF(jy, jm) {
        var report = generateMonthlyReportF(jy, jm);

        document.getElementById("monthlySalesValueF").textContent = formatNumberF(report.total);
        document.getElementById("monthlyOrdersValueF").textContent = formatNumberF(report.orders);
        document.getElementById("monthlyInvoicesValueF").textContent = formatNumberF(report.invoices);
        document.getElementById("monthlyNewCustomersValueF").textContent = formatNumberF(report.newCustomers);
        setChangeF("monthlySalesChangeF", report.changePercent, report.changeDirection);

        document.getElementById("adminMonthlyChartTotalF").textContent = formatNumberF(report.total);

        renderMonthlyChartF(report);
    }

    function renderYearlyViewF(jy) {
        var report = generateYearlyReportF(jy);

        document.getElementById("yearlySalesValueF").textContent = formatNumberF(report.total);
        document.getElementById("yearlyOrdersValueF").textContent = formatNumberF(report.orders);
        document.getElementById("yearlyInvoicesValueF").textContent = formatNumberF(report.invoices);
        setChangeF("yearlySalesChangeF", report.changePercent, report.changeDirection);

        document.getElementById("adminYearlyChartTotalF").textContent = formatNumberF(report.total);

        renderYearlyChartF(report);
    }


    /* --------------------------------------------------------
     * Init
     * -------------------------------------------------------- */

    function initReportModeF() {
        var buttons = document.querySelectorAll("[data-report-mode-btn-f]");
        var monthlyView = document.getElementById("adminMonthlyViewF");
        var yearlyView = document.getElementById("adminYearlyViewF");

        if (!buttons.length) return;

        buttons.forEach(function (btn) {
            btn.addEventListener("click", function () {
                buttons.forEach(function (b) { b.classList.remove("is-active"); });
                btn.classList.add("is-active");

                var mode = btn.getAttribute("data-report-mode-btn-f");
                if (monthlyView) monthlyView.hidden = mode !== "monthly";
                if (yearlyView) yearlyView.hidden = mode !== "yearly";
            });
        });
    }

    function initSelectorsF() {
        var today = getTodayJalaliF();
        var todayJy = today[0], todayJm = today[1];

        var monthSelect = document.getElementById("adminMonthSelectF");
        var yearSelect = document.getElementById("adminYearSelectF");

        if (monthSelect) {
            buildMonthOptionsF(monthSelect, todayJy, todayJm);
            renderMonthlyViewF(todayJy, todayJm);

            monthSelect.addEventListener("change", function () {
                var parts = monthSelect.value.split("-");
                renderMonthlyViewF(parseInt(parts[0], 10), parseInt(parts[1], 10));
            });
        }

        if (yearSelect) {
            buildYearOptionsF(yearSelect, todayJy);
            renderYearlyViewF(todayJy);

            yearSelect.addEventListener("change", function () {
                renderYearlyViewF(parseInt(yearSelect.value, 10));
            });
        }
    }

    function initAdminReportsF() {
        initReportModeF();
        initSelectorsF();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAdminReportsF);
    } else {
        initAdminReportsF();
    }

})();