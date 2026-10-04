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

    console.log("ADMIN REPORTS JS LOADED");
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


    function countNewCustomersF(jy, jm) {
    var dates = window.adminCustomerJoinDates || [];

    return dates.filter(function (dateString) {
        var date = new Date(dateString);

        if (isNaN(date.getTime())) {
            return false;
        }

        var jalali = toJalaliF(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate()
        );

        return jalali[0] === jy && jalali[1] === jm;
    }).length;
}

    function countNewCustomersYearF(jy) {
    var dates = window.adminCustomerJoinDates || [];

    return dates.filter(function (dateString) {
        var date = new Date(dateString);

        if (isNaN(date.getTime())) {
            return false;
        }

        var jalali = toJalaliF(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate()
        );

        return jalali[0] === jy;
    }).length;
}
    

    function renderMonthlyViewF(jy, jm) {
    var orders = window.adminReportOrders || [];

    var paidOrders = orders.filter(function (order) {
        if (!order.is_paid) {
            return false;
        }

        var date = new Date(order.registered_at);

        if (isNaN(date.getTime())) {
            return false;
        }

        var jalali = toJalaliF(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate()
        );

        return jalali[0] === jy && jalali[1] === jm;
    });

    var totalSales = paidOrders.reduce(function (sum, order) {
        return sum + Number(order.total_irr || 0);
    }, 0);

    var orderCount = paidOrders.length;

    var newCustomers = countNewCustomersF(jy, jm);

    var totalInvoices = paidOrders.length;

    var totalItemsSold = paidOrders.reduce(function (sum, order) {
        return sum + Number(order.items_sold || 0);
    }, 0);

    document.getElementById("monthlySalesValueF").textContent =
        formatNumberF(totalSales);

    document.getElementById("monthlyItemsSoldValueF").textContent =
        formatNumberF(totalItemsSold);

    document.getElementById("monthlyInvoicesValueF").textContent =
        formatNumberF(totalInvoices);

    document.getElementById("monthlyNewCustomersValueF").textContent =
        formatNumberF(newCustomers);

    document.getElementById("adminMonthlyChartTotalF").textContent =
        formatNumberF(totalSales);


    var dailyTotals = [];

var dayCount =
    jm <= 6
        ? 31
        : jm <= 11
            ? 30
            : 29;

for (var day = 1; day <= dayCount; day += 1) {
    var dayTotal = paidOrders
        .filter(function (order) {
            var date = new Date(order.registered_at);

            if (isNaN(date.getTime())) {
                return false;
            }

            var jalali = toJalaliF(
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate()
            );

            return (
                jalali[0] === jy &&
                jalali[1] === jm &&
                jalali[2] === day
            );
        })
        .reduce(function (sum, order) {
            return sum + Number(order.total_irr || 0);
        }, 0);

    dailyTotals.push(dayTotal);
}

    renderMonthlyChartF({
    chartValues: dailyTotals,
    dayCount: dayCount
});

    renderMonthlyProfitF(paidOrders, jy, jm);

    /*
     * فعلاً نمودار را نگه می‌داریم تا در قدم بعد
     * داده واقعی روزانه را به آن وصل کنیم.
     */
    
}

    function renderYearlyViewF(jy) {
    var orders = window.adminReportOrders || [];

    var yearlyOrders = orders.filter(function (order) {
        if (!order.is_paid) {
            return false;
        }

        var date = new Date(order.registered_at);

        if (isNaN(date.getTime())) {
            return false;
        }

        var jalali = toJalaliF(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate()
        );

        return jalali[0] === jy;
    });

    var totalSales = yearlyOrders.reduce(function (sum, order) {
        return sum + Number(order.total_irr || 0);
    }, 0);

        var orderCount = yearlyOrders.length;
    var newCustomers = countNewCustomersYearF(jy);

    // TODO(بک‌اند): همان توضیح بخش ماهانه — این دو مقدار placeholder‌اند.
    var totalInvoices = yearlyOrders.length;

    var totalItemsSold = yearlyOrders.reduce(function (sum, order) {
        return sum + Number(order.items_sold || 0);
    }, 0);

    document.getElementById("yearlySalesValueF").textContent =
        formatNumberF(totalSales);

    document.getElementById("yearlyItemsSoldValueF").textContent =
        formatNumberF(totalItemsSold);

    document.getElementById("yearlyInvoicesValueF").textContent =
        formatNumberF(totalInvoices);

    document.getElementById("yearlyNewCustomersValueF").textContent =
        formatNumberF(newCustomers);

    document.getElementById("adminYearlyChartTotalF").textContent =
        formatNumberF(totalSales);

    /*
     * فعلاً نمودار را از داده واقعی سال تغذیه می‌کنیم.
     */
    var monthlyTotals = [];

for (var month = 1; month <= 12; month += 1) {
    var monthTotal = yearlyOrders
        .filter(function (order) {
            var date = new Date(order.registered_at);

            if (isNaN(date.getTime())) {
                return false;
            }

            var jalali = toJalaliF(
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate()
            );

            return (
                jalali[0] === jy &&
                jalali[1] === month
            );
        })
        .reduce(function (sum, order) {
            return sum + Number(order.total_irr || 0);
        }, 0);

    monthlyTotals.push(monthTotal);
}

    renderYearlyChartF({
        monthlyTotals: monthlyTotals
    });

    renderYearlyProfitF(yearlyOrders, jy);
}




    /* --------------------------------------------------------
     * Admin profit (فقط سود ادمین)
     * Data: order.admin_profit_irr / order.profit_by_currency,
     * computed by Django from each item's admin percentage.
     * -------------------------------------------------------- */

    var CURRENCY_LABELS_F = {
        USD: "دلار آمریکا",
        CAD: "دلار کانادا",
        EUR: "یورو",
        TRY: "لیر",
        AED: "درهم",
        GBP: "پوند"
    };

    function orderJalaliF(order) {
        var date = new Date(order.registered_at);

        if (isNaN(date.getTime())) {
            return null;
        }

        return toJalaliF(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }

    function sumProfitByCurrencyF(orders) {
        var result = {};

        orders.forEach(function (order) {
            var parts = order.profit_by_currency || {};

            Object.keys(parts).forEach(function (code) {
                result[code] = (result[code] || 0) + Number(parts[code] || 0);
            });
        });

        return result;
    }

    function renderProfitListF(listEl, rows, emptyText) {
        if (!listEl) return;

        listEl.innerHTML = "";

        if (!rows.length) {
            var empty = document.createElement("li");
            empty.className = "admin-reports-f__profit-empty-f";
            empty.textContent = emptyText;
            listEl.appendChild(empty);
            return;
        }

        rows.forEach(function (row) {
            var li = document.createElement("li");
            var label = document.createElement("span");
            var value = document.createElement("span");

            label.textContent = row.label;
            value.textContent = formatNumberF(Math.round(row.value)) + " ریال";

            li.appendChild(label);
            li.appendChild(value);
            listEl.appendChild(li);
        });
    }

    function renderProfitLineChartF(svg, labelsEl, values, dayCount) {
        if (!svg) return;

        svg.innerHTML = "";

        var NS = "http://www.w3.org/2000/svg";
        var paths = buildLineChartPathsF(values.length > 1 ? values : [0, 0]);

        var defs = document.createElementNS(NS, "defs");
        defs.innerHTML =
            '<linearGradient id="adminProfitGradientF" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#A61579" stop-opacity="0.22"/>' +
            '<stop offset="100%" stop-color="#A61579" stop-opacity="0"/>' +
            "</linearGradient>";
        svg.appendChild(defs);

        var area = document.createElementNS(NS, "path");
        area.setAttribute("d", paths.areaPath);
        area.setAttribute("fill", "url(#adminProfitGradientF)");
        svg.appendChild(area);

        var line = document.createElementNS(NS, "path");
        line.setAttribute("d", paths.linePath);
        line.setAttribute("fill", "none");
        line.setAttribute("stroke", "#A61579");
        line.setAttribute("stroke-width", "2.5");
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("stroke-linejoin", "round");
        svg.appendChild(line);

        if (labelsEl) {
            labelsEl.innerHTML = "";
            [1, Math.round(dayCount / 2), dayCount].forEach(function (day) {
                var span = document.createElement("span");
                span.textContent = toPersianDigitsF(day);
                labelsEl.appendChild(span);
            });
        }
    }

    function renderProfitBarChartF(svg, labelsEl, values) {
        if (!svg) return;

        svg.innerHTML = "";

        var NS = "http://www.w3.org/2000/svg";
        var max = Math.max.apply(null, values) || 1;
        var usableWidth = CHART_VIEW_WIDTH - CHART_PADDING * 2;
        var usableHeight = CHART_VIEW_HEIGHT - CHART_PADDING * 2;
        var gap = 8;
        var barWidth = (usableWidth - gap * (values.length - 1)) / values.length;

        values.forEach(function (value, index) {
            var barHeight = (value / max) * usableHeight;
            var rect = document.createElementNS(NS, "rect");

            rect.setAttribute("x", (CHART_PADDING + index * (barWidth + gap)).toFixed(1));
            rect.setAttribute("y", (CHART_PADDING + usableHeight - barHeight).toFixed(1));
            rect.setAttribute("width", barWidth.toFixed(1));
            rect.setAttribute("height", Math.max(barHeight, 2).toFixed(1));
            rect.setAttribute("rx", "3");
            rect.setAttribute("fill", "#A61579");
            rect.setAttribute("fill-opacity", value > 0 ? "0.85" : "0.2");

            var tip = document.createElementNS(NS, "title");
            tip.textContent =
                MONTH_NAMES_F[index] + ": " + formatNumberF(Math.round(value)) + " ریال";
            rect.appendChild(tip);

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

    function currencyRowsF(byCurrency) {
        return Object.keys(byCurrency)
            .filter(function (code) { return byCurrency[code] > 0; })
            .sort(function (a, b) { return byCurrency[b] - byCurrency[a]; })
            .map(function (code) {
                return { label: CURRENCY_LABELS_F[code] || code, value: byCurrency[code] };
            });
    }

    function renderMonthlyProfitF(paidOrders, jy, jm) {
        var totalEl = document.getElementById("adminMonthlyProfitTotalF");
        if (!totalEl) return;

        var dayCount = jalaliMonthLengthF(jy, jm);
        var daily = [];

        for (var d = 0; d < dayCount; d += 1) {
            daily.push(0);
        }

        var total = 0;

        paidOrders.forEach(function (order) {
            var jalali = orderJalaliF(order);
            var profit = Number(order.admin_profit_irr || 0);

            total += profit;

            if (jalali && jalali[2] >= 1 && jalali[2] <= dayCount) {
                daily[jalali[2] - 1] += profit;
            }
        });

        totalEl.textContent = formatNumberF(Math.round(total));

        renderProfitLineChartF(
            document.getElementById("adminMonthlyProfitChartSvgF"),
            document.getElementById("adminMonthlyProfitChartLabelsF"),
            daily,
            dayCount
        );

        renderProfitListF(
            document.getElementById("adminMonthlyProfitByCurrencyF"),
            currencyRowsF(sumProfitByCurrencyF(paidOrders)),
            "در این ماه سودی ثبت نشده است."
        );

        var dayRows = [];

        daily.forEach(function (value, index) {
            if (value > 0) {
                dayRows.push({
                    label: toPersianDigitsF(index + 1) + " " + MONTH_NAMES_F[jm - 1],
                    value: value
                });
            }
        });

        renderProfitListF(
            document.getElementById("adminMonthlyProfitByPeriodF"),
            dayRows,
            "در این ماه سودی ثبت نشده است."
        );
    }

    function renderYearlyProfitF(yearlyOrders, jy) {
        var totalEl = document.getElementById("adminYearlyProfitTotalF");
        if (!totalEl) return;

        var monthly = [];

        for (var m = 0; m < 12; m += 1) {
            monthly.push(0);
        }

        var total = 0;

        yearlyOrders.forEach(function (order) {
            var jalali = orderJalaliF(order);
            var profit = Number(order.admin_profit_irr || 0);

            total += profit;

            if (jalali) {
                monthly[jalali[1] - 1] += profit;
            }
        });

        totalEl.textContent = formatNumberF(Math.round(total));

        renderProfitBarChartF(
            document.getElementById("adminYearlyProfitChartSvgF"),
            document.getElementById("adminYearlyProfitChartLabelsF"),
            monthly
        );

        renderProfitListF(
            document.getElementById("adminYearlyProfitByCurrencyF"),
            currencyRowsF(sumProfitByCurrencyF(yearlyOrders)),
            "در این سال سودی ثبت نشده است."
        );

        renderProfitListF(
            document.getElementById("adminYearlyProfitByPeriodF"),
            monthly.map(function (value, index) {
                return { label: MONTH_NAMES_F[index], value: value };
            }),
            ""
        );
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