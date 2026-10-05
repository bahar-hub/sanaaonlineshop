/* ============================================================
 * Admin Panel — Order Management
 * Standalone Orders Page
 * Vanilla JS only
 * Orders are loaded from Django / database
 * (FIXED: numeric inputs are now parsed with parseNumericInputF)
 * ============================================================ */

(function () {

    "use strict";

    const CURRENCY_FIELD_MAP_F = {
        USD: "unitPriceUsd",
        EUR: "unitPriceEur",
        TRY: "unitPriceTry",
        GBP: "unitPriceGbp",
        AED: "unitPriceAed",
        CAD: "unitPriceCad"
    };

    /* ============================================================
     * EXCHANGE RATES
     * ============================================================ */

    var EXCHANGE_RATES_F = {
        USD: { label: "دلار", rate: 605000 },
        TRY: { label: "لیر", rate: 18000 },
        EUR: { label: "یورو", rate: 655000 },
        GBP: { label: "پوند", rate: 765000 },
        AED: { label: "درهم امارات", rate: 165000 },
        CAD: { label: "دلار کانادا", rate: 440000 }
    };


    // درصدهای پیش‌فرض هر واحد پول (واسطه / ادمین / تکس).
    // مجموع این سه، «درصد افزایش کل» است که روی نرخ ارز اعمال می‌شود؛
    // اما فقط «درصد ادمین» به‌عنوان سود پروژه حساب و نمایش داده می‌شود.
    // مقادیر روی هر آیتم ذخیره می‌شوند و با چک‌باکس «ویرایش درصدها»
    // قابل تغییر هستند، پس فاکتورهای قبلی هیچ‌وقت عوض نمی‌شوند.
    var DEFAULT_PERCENTS_F = {
        EUR: { broker: 15, admin: 10, tax: 0 },
        USD: { broker: 20, admin: 10, tax: 12 },
        CAD: { broker: 20, admin: 10, tax: 12 },
        TRY: { broker: 10, admin: 10, tax: 0 },
        AED: { broker: 15, admin: 10, tax: 0 },
        GBP: { broker: 0, admin: 0, tax: 0 }
    };

    var DEFAULT_MARKUP_F = {};

    Object.keys(DEFAULT_PERCENTS_F).forEach(function (code) {
        var parts = DEFAULT_PERCENTS_F[code];
        DEFAULT_MARKUP_F[code] = parts.broker + parts.admin + parts.tax;
    });


    /* ============================================================
     * ORDERS DATA — injected by Django via json_script
     * ============================================================ */

    var ordersF = [];

    var ordersDataElementF = document.getElementById("orders-data-f");

    if (ordersDataElementF) {
        try {
            var parsedOrdersF = JSON.parse(ordersDataElementF.textContent);
            ordersF = Array.isArray(parsedOrdersF) ? parsedOrdersF : [];
        } catch (error) {
            console.error("Could not parse orders data:", error);
            ordersF = [];
        }
    }


    function findOrderByNumberF(orderNumber) {
        return ordersF.find(function (order) {
            return order.number === orderNumber;
        });
    }


    function replaceOrderF(savedOrder) {
        var index = ordersF.findIndex(function (order) {
            return Number(order.id) === Number(savedOrder.id);
        });

        if (index === -1) {
            ordersF.unshift(savedOrder);
        } else {
            ordersF[index] = savedOrder;
        }
    }


    function buildOrderUrlF(template, orderId) {
        if (!template) {
            return "";
        }
        return template.replace("/0/", "/" + orderId + "/");
    }


    function getCsrfTokenF() {
        var input = document.querySelector('input[name="csrfmiddlewaretoken"]');
        return input ? input.value : "";
    }


    function fetchJsonF(url, options) {

        return fetch(url, options).then(function (response) {

            return response.text().then(function (text) {

                var data = {};

                try {
                    data = JSON.parse(text);
                } catch (error) {
                    console.error("Invalid JSON response:", text);
                }

                if (!response.ok) {
                    throw new Error(
                        data.message || ("خطای سرور: " + response.status)
                    );
                }

                return data;
            });
        });
    }


    var openEditOrderModalF = null;


    /* ============================================================
     * STATUS MAPS
     * ============================================================ */

    var ORDER_STATUS_F = {
        registered: { label: "ثبت‌شده", color: "neutral" },
        preparing: { label: "در حال آماده‌سازی", color: "warning" },
        shipped_to_iran: { label: "ارسال به ایران", color: "info" },
        shipped_to_customer: { label: "ارسال به مشتری", color: "primary" },
        delivered: { label: "تحویل داده‌شده", color: "success" },
        cancelled: { label: "لغوشده", color: "danger" }
    };


    var PAYMENT_STATUS_F = {
        paid: { label: "پرداخت‌شده", color: "success" },
        pending: { label: "در انتظار پرداخت", color: "warning" },
        failed: { label: "پرداخت ناموفق", color: "danger" },
        partial: { label: "پرداخت ناقص", color: "warning" },
        cancelled: { label: "لغوشده", color: "danger" }
    };


    var INVOICE_STATUS_F = {
        issued: { label: "صادرشده", color: "success" },
        sent: { label: "ارسال‌شده", color: "primary" },
        waiting: { label: "در انتظار صدور", color: "warning" },
        error: { label: "خطا در تولید فاکتور", color: "danger" }
    };


    /* ============================================================
     * HELPERS
     * ============================================================ */

    // Numeric input/display helpers:
    // - Display numbers with thousands separators.
    // - Keep the underlying input value plain while the user edits.
    // - Support Persian/Arabic digits and both Persian/English separators.
    // IMPORTANT: always read numeric inputs with parseNumericInputF(),
    // never Number(input.value) — the displayed value is Persian-formatted.
    function normalizeNumericInputValueF(value) {

        var text = String(value == null ? "" : value).trim();

        var persianDigits = "۰۱۲۳۴۵۶۷۸۹";
        var arabicDigits = "٠١٢٣٤٥٦٧٨٩";

        text = text.replace(/[۰-۹]/g, function (digit) {
            return String(persianDigits.indexOf(digit));
        });

        text = text.replace(/[٠-٩]/g, function (digit) {
            return String(arabicDigits.indexOf(digit));
        });

        // Remove thousands separators/spaces, keep decimal separator.
        // FIX: was /[٬,\\s]/g (matched a literal backslash and "s").
        text = text
            .replace(/[٬,\s]/g, "")
            .replace(/٫/g, ".");

        // Keep only the first decimal point and valid numeric characters.
        var negative = text.charAt(0) === "-";
        text = text.replace(/-/g, "").replace(/[^0-9.]/g, "");

        var firstDot = text.indexOf(".");
        if (firstDot !== -1) {
            text =
                text.slice(0, firstDot + 1) +
                text.slice(firstDot + 1).replace(/\./g, "");
        }

        return (negative ? "-" : "") + text;
    }


    function parseNumericInputF(value) {

        var normalized = normalizeNumericInputValueF(value);

        if (!normalized || normalized === "-" || normalized === ".") {
            return 0;
        }

        var number = Number(normalized);

        return Number.isFinite(number) ? number : 0;
    }


    function formatNumericInputDisplayF(input) {

        if (!input) {
            return;
        }

        var raw = normalizeNumericInputValueF(input.value);

        if (!raw || raw === "-") {
            return;
        }

        var number = Number(raw);

        if (!Number.isFinite(number)) {
            return;
        }

        var hasDecimal = raw.indexOf(".") !== -1;

        var fractionDigits =
            hasDecimal
                ? Math.min((raw.split(".")[1] || "").length, 6)
                : 0;

        input.value = number.toLocaleString("fa-IR", {
            useGrouping: true,
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        });
    }


    function prepareNumericInputF(input) {

        if (!input || input.dataset.numericFormattingF === "1") {
            return;
        }

        input.dataset.numericFormattingF = "1";

        // type=number cannot display thousands separators reliably.
        if (input.type === "number") {
            input.type = "text";
            input.inputMode = "decimal";
        }

        input.addEventListener("focus", function () {
            input.value = normalizeNumericInputValueF(input.value);
        });

        input.addEventListener("blur", function () {
            formatNumericInputDisplayF(input);
        });

        input.addEventListener("change", function () {
            formatNumericInputDisplayF(input);
        });

        formatNumericInputDisplayF(input);
    }


    function prepareAllNumericInputsF(root) {

        var scope = root || document;

        scope
            .querySelectorAll(
                'input[type="number"], ' +
                '.admin-order-item-f__price, ' +
                '.admin-order-item-f__markup, ' +
                '.admin-order-item-f__broker, ' +
                '.admin-order-item-f__admin, ' +
                '.admin-order-item-f__tax, ' +
                '.admin-order-item-f__exchange-rate, ' +
                '.admin-order-item-f__qty, ' +
                '.admin-order-item-f__service-cost, ' +
                '#adminNewOrderShippingF'
            )
            .forEach(function (input) {
                prepareNumericInputF(input);
            });
    }


    function formatNumberF(value) {
        return Math.round(Number(value) || 0).toLocaleString("fa-IR");
    }


    // Mirrors orders/services.py round_invoice_total_up(): the final
    // payable amount is always rounded UP to the nearest 10,000 rials.
    function roundInvoiceTotalUpF(value) {
        var step = 10000;
        return Math.ceil((Number(value) || 0) / step) * step;
    }


    function formatForeignF(value) {
        return (Number(value) || 0).toLocaleString(
            "fa-IR",
            { maximumFractionDigits: 2 }
        );
    }


    function currencyLabelF(code) {
        return EXCHANGE_RATES_F[code]
            ? EXCHANGE_RATES_F[code].label
            : (code || "");
    }


    function moneyHtmlF(value, currencyLabel) {

        var label = currencyLabel || "ریال";

        return (
            '<span class="invoice-money-f" dir="rtl">' +
                '<bdi class="invoice-money-f__number" dir="ltr">' +
                    formatNumberF(value) +
                '</bdi>' +
                '<span class="invoice-money-f__label"> ' + label + '</span>' +
            '</span>'
        );
    }


    function currentJalaliDateF() {
        try {
            return new Intl.DateTimeFormat(
                "fa-IR-u-ca-persian",
                { year: "numeric", month: "2-digit", day: "2-digit" }
            ).format(new Date());
        } catch (error) {
            return "";
        }
    }


    function baseUnitPriceF(product) {

        if (typeof product.basePrice === "number") {
            return product.basePrice;
        }
        if (typeof product.unitPriceUsd === "number") {
            return product.unitPriceUsd;
        }
        if (typeof product.unitPriceEur === "number") {
            return product.unitPriceEur;
        }
        if (typeof product.unitPriceTry === "number") {
            return product.unitPriceTry;
        }
        if (typeof product.unitPriceGbp === "number") {
            return product.unitPriceGbp;
        }
        if (typeof product.unitPriceAed === "number") {
            return product.unitPriceAed;
        }

        return 0;
    }


    function unitPriceF(product) {
        if (typeof product.finalUnitPrice === "number") {
            return product.finalUnitPrice;
        }

        var base = baseUnitPriceF(product);
        var markup = Number(product.markupPercent) || 0;
        return base * (1 + markup / 100);
    }


    function orderTotalsF(order) {

        // One source of truth: the same calculation used by the invoice
        // (and by OrderItem.line_total_irr in Django). Foreign price never
        // changes; markup is applied to the exchange rate.
        var calc = buildInvoiceCalcFromOrderF(order);

        var baseAmount = calc.lines.reduce(function (sum, line) {
            return sum + line.lineForeign;
        }, 0);

        var codes = Object.keys(calc.byCurrency);

        var baseText = codes
            .map(function (code) {
                return (
                    formatForeignF(calc.byCurrency[code]) +
                    " " +
                    currencyLabelF(code)
                );
            })
            .join(" + ");

        var currencyText =
            codes.length > 1
                ? "چند ارزی"
                : currencyLabelF(codes[0] || order.currency);

        var totalRial = roundInvoiceTotalUpF(
            calc.itemsRial -
            (Number(order.discountRial) || 0) +
            (Number(order.shippingRial) || 0)
        );

        return {
            baseAmount: baseAmount,
            baseText: baseText,
            currencyText: currencyText,
            multiCurrency: codes.length > 1,
            productsRial: calc.itemsRial,
            totalRial: totalRial,
            profitRial: calc.profitRial,
            lines: calc.lines,
            rate:
                calc.lines.length
                    ? calc.lines[0].rate
                    : (
                        EXCHANGE_RATES_F[order.currency]
                            ? EXCHANGE_RATES_F[order.currency].rate
                            : 0
                    )
        };
    }


    function badgeHtmlF(statusMap, key) {

        var entry = statusMap[key];

        if (!entry) {
            return "";
        }

        return (
            '<span class="admin-badge-f admin-badge-f--' +
            entry.color +
            '-f">' +
            entry.label +
            "</span>"
        );
    }


    function sheetRowF(label, value) {
        return (
            '<div class="admin-orders-f__sheet-row">' +
            "<span>" + label + "</span>" +
            "<span>" + value + "</span>" +
            "</div>"
        );
    }


    function sheetBadgeRowF(label, badgeHtml) {
        return (
            '<div class="admin-orders-f__sheet-row admin-orders-f__sheet-row--badge-f">' +
            "<span>" + label + "</span>" +
            badgeHtml +
            "</div>"
        );
    }


    /* ============================================================
     * TOAST
     * ============================================================ */

    function showToastF(message, type) {

        var region = document.getElementById("adminToastRegionF");

        if (!region) {
            return;
        }

        var toast = document.createElement("div");

        toast.className =
            "admin-toast-f" +
            (type ? " admin-toast-f--" + type + "-f" : "");

        toast.innerHTML =
            (
                type === "error"
                    ?
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                    '<circle cx="12" cy="12" r="9"/>' +
                    '<path d="M12 8v5M12 16h.01" stroke-linecap="round"/>' +
                    "</svg>"
                    :
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                    '<path d="m5 13 4 4 10-10" stroke-linecap="round" stroke-linejoin="round"/>' +
                    "</svg>"
            ) +
            "<span>" + message + "</span>";

        region.appendChild(toast);

        window.setTimeout(function () {
            toast.remove();
        }, 3200);
    }


    /* ============================================================
     * TABLE
     * ============================================================ */

    function productSummaryF(order) {

        var first = order.products[0].name;

        if (order.products.length > 1) {
            return (
                first +
                "<small>+ " +
                formatNumberF(order.products.length - 1) +
                " محصول دیگر</small>"
            );
        }

        return (
            first +
            "<small>تعداد: " +
            formatNumberF(order.products[0].qty) +
            "</small>"
        );
    }


    function actionButtonsHtmlF(orderNumber) {
        return (
            '<button type="button" class="admin-icon-btn-f" ' +
            'data-view-order-f="' + orderNumber + '" ' +
            'aria-label="مشاهده جزئیات سفارش ' + orderNumber + '" ' +
            'title="مشاهده جزئیات">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/>' +
            "</svg>" +
            "</button>" +

            '<button type="button" class="admin-icon-btn-f" ' +
            'data-admin-invoice-order-f="' + orderNumber + '" ' +
            'title="مشاهده فاکتور ادمین">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
            '<path d="M6 2h9l3 3v17H6z" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M9 13h6M9 17h6M9 9h3" stroke-linecap="round"/>' +
            '</svg>' +
            '</button>' +

            '<button type="button" class="admin-icon-btn-f admin-icon-btn-f--download-f" ' +
            'data-download-order-f="' + orderNumber + '" ' +
            'aria-label="دانلود PDF سفارش ' + orderNumber + '" ' +
            'title="دانلود PDF">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<path d="M12 3v12m0 0-4-4m4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" stroke-linecap="round" stroke-linejoin="round"/>' +
            "</svg>" +
            "</button>" +

            '<button type="button" class="admin-icon-btn-f admin-icon-btn-f--delete-f" ' +
            'data-delete-order-f="' + orderNumber + '" ' +
            'aria-label="حذف سفارش ' + orderNumber + '" ' +
            'title="حذف سفارش">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<path d="m19 7-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/>' +
            "</svg>" +
            "</button>"
        );
    }


    function tableRowHtmlF(order) {

        var totals = orderTotalsF(order);

        var currencyLabel = totals.currencyText;

        return (
            "<tr data-order-row-f=\"" + order.number + "\">" +

            "<td>" + order.number + "</td>" +

            "<td>" + order.customer.name + "</td>" +

            "<td>" + order.date + "</td>" +

            "<td>" +
            (
                totals.multiCurrency
                    ? totals.baseText
                    : formatForeignF(totals.baseAmount)
            ) +
            "</td>" +

            '<td class="admin-orders-f__col--secondary-f">' +
            currencyLabel +
            "</td>" +

            '<td class="admin-orders-f__table-amount-rial">' +
            formatNumberF(totals.totalRial) +
            " ریال</td>" +

            '<td class="admin-orders-f__table-profit-f">' +
            formatNumberF(totals.profitRial || 0) +
            " ریال</td>" +

            "<td>" +
            badgeHtmlF(PAYMENT_STATUS_F, order.paymentStatus) +
            "</td>" +

            "<td>" +
            badgeHtmlF(ORDER_STATUS_F, order.orderStatus) +
            "</td>" +

            '<td class="admin-orders-f__col--secondary-f">' +
            badgeHtmlF(INVOICE_STATUS_F, order.invoiceStatus) +
            "</td>" +

            "<td>" +
            '<div class="admin-orders-f__table-actions">' +
            actionButtonsHtmlF(order.number) +
            "</div>" +
            "</td>" +

            "</tr>"
        );
    }


    /* ============================================================
     * MOBILE CARD
     * ============================================================ */

    function cardHtmlF(order) {

        var totals = orderTotalsF(order);

        return (
            '<li class="admin-orders-f__card" data-order-row-f="' +
            order.number +
            '">' +

            '<div class="admin-orders-f__card-top">' +

            '<span class="admin-orders-f__card-number">' +
            order.number +
            "</span>" +

            badgeHtmlF(ORDER_STATUS_F, order.orderStatus) +

            "</div>" +

            '<div class="admin-orders-f__card-body">' +

            '<span class="admin-orders-f__card-customer">' +
            order.customer.name +
            "</span>" +

            '<span class="admin-orders-f__card-date">' +
            order.date +
            "</span>" +

            '<span class="admin-orders-f__card-amount">' +
            formatNumberF(totals.totalRial) +
            " ریال</span>" +

            '<span class="admin-orders-f__card-profit-f">' +
            "سود: " +
            formatNumberF(totals.profitRial || 0) +
            " ریال</span>" +

            "</div>" +

            '<span class="admin-orders-f__card-payment">' +
            badgeHtmlF(PAYMENT_STATUS_F, order.paymentStatus) +
            "</span>" +

            '<div class="admin-orders-f__card-actions">' +
            actionButtonsHtmlF(order.number) +
            "</div>" +

            "</li>"
        );
    }


    /* ============================================================
     * STATES + RENDER
     * ============================================================ */

    function setStateF(state) {

        ["Loading", "Empty", "Error"].forEach(function (name) {

            var element = document.getElementById("adminOrders" + name + "F");

            if (element) {
                element.hidden = state !== name.toLowerCase();
            }
        });

        var tableWrap = document.getElementById("adminOrdersTableWrapF");
        var cardsWrap = document.getElementById("adminOrdersCardsF");

        var show = !state;

        if (tableWrap) {
            tableWrap.style.display = show ? "" : "none";
        }

        if (cardsWrap) {
            cardsWrap.style.display = show ? "" : "none";
        }
    }


    function renderListF(orders) {

        var tbody = document.getElementById("adminOrdersTableBodyF");
        var cards = document.getElementById("adminOrdersCardsF");

        if (!orders.length) {

            if (tbody) {
                tbody.innerHTML = "";
            }

            if (cards) {
                cards.innerHTML = "";
            }

            setStateF("empty");

            return;
        }

        setStateF(null);

        if (tbody) {
            tbody.innerHTML = orders.map(tableRowHtmlF).join("");
        }

        if (cards) {
            cards.innerHTML = orders.map(cardHtmlF).join("");
        }
    }


    /* ============================================================
     * FILTERS
     * ============================================================ */

    var filtersF = {
        search: "",
        orderStatus: "all",
        paymentStatus: "all",
        invoiceStatus: "all",
        sort: "newest"
    };


    function applyFiltersF() {

        var filtered = ordersF.filter(function (order) {

            // وضعیت سفارش
            if (
                filtersF.orderStatus !== "all" &&
                order.orderStatus !== filtersF.orderStatus
            ) {
                return false;
            }

            // وضعیت پرداخت
            if (
                filtersF.paymentStatus !== "all" &&
                order.paymentStatus !== filtersF.paymentStatus
            ) {
                return false;
            }

            // وضعیت فاکتور
            if (
                filtersF.invoiceStatus !== "all" &&
                order.invoiceStatus !== filtersF.invoiceStatus
            ) {
                return false;
            }

            // جستجو
            if (filtersF.search) {

                var q = filtersF.search.toLowerCase().trim();

                var orderNumber =
                    order.number ? String(order.number).toLowerCase() : "";

                var customerName =
                    order.customer && order.customer.name
                        ? String(order.customer.name).toLowerCase()
                        : "";

                var matchesProduct =
                    Array.isArray(order.products)
                        ? order.products.some(function (product) {

                            var productName =
                                product && product.name
                                    ? String(product.name).toLowerCase()
                                    : "";

                            return productName.indexOf(q) !== -1;
                        })
                        : false;

                var matches =
                    orderNumber.indexOf(q) !== -1 ||
                    customerName.indexOf(q) !== -1 ||
                    matchesProduct;

                if (!matches) {
                    return false;
                }
            }

            return true;
        });

        // یک کپی برای sort
        var sorted = filtered.slice();

        switch (filtersF.sort) {

            case "oldest":
                sorted.reverse();
                break;

            case "amount-desc":
                sorted.sort(function (a, b) {
                    return orderTotalsF(b).totalRial - orderTotalsF(a).totalRial;
                });
                break;

            case "amount-asc":
                sorted.sort(function (a, b) {
                    return orderTotalsF(a).totalRial - orderTotalsF(b).totalRial;
                });
                break;

            case "last-changed":
                sorted.sort(function (a, b) {

                    var aDate = a.lastChangeDate || "";
                    var bDate = b.lastChangeDate || "";

                    if (aDate < bDate) {
                        return 1;
                    }

                    if (aDate > bDate) {
                        return -1;
                    }

                    return 0;
                });
                break;

            case "newest":
            default:
                break;
        }

        renderListF(sorted);
    }


    /* ============================================================
     * TOOLBAR
     * ============================================================ */

    function initToolbarF() {

        var searchInput = document.getElementById("adminOrderSearchF");
        var orderStatusSelect = document.getElementById("adminOrderStatusFilterF");
        var paymentStatusSelect = document.getElementById("adminPaymentStatusFilterF");
        var invoiceStatusSelect = document.getElementById("adminInvoiceStatusFilterF");
        var sortSelect = document.getElementById("adminOrderSortF");
        var exportBtn = document.getElementById("adminExportOrdersF");
        var filtersToggle = document.getElementById("adminFiltersToggleF");
        var filtersPanel = document.getElementById("adminFiltersPanelF");

        if (searchInput) {
            searchInput.addEventListener("input", function () {
                filtersF.search = searchInput.value.trim();
                applyFiltersF();
            });
        }

        if (orderStatusSelect) {
            orderStatusSelect.addEventListener("change", function () {
                filtersF.orderStatus = orderStatusSelect.value;
                applyFiltersF();
            });
        }

        if (paymentStatusSelect) {
            paymentStatusSelect.addEventListener("change", function () {
                filtersF.paymentStatus = paymentStatusSelect.value;
                applyFiltersF();
            });
        }

        if (invoiceStatusSelect) {
            invoiceStatusSelect.addEventListener("change", function () {
                filtersF.invoiceStatus = invoiceStatusSelect.value;
                applyFiltersF();
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener("change", function () {
                filtersF.sort = sortSelect.value;
                applyFiltersF();
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener("click", exportOrdersCsvF);
        }

        if (filtersToggle && filtersPanel) {

            filtersToggle.addEventListener("click", function () {

                var willOpen = !filtersPanel.classList.contains("is-open-f");

                filtersPanel.classList.toggle("is-open-f", willOpen);
                filtersToggle.classList.toggle("is-active-f", willOpen);
                filtersToggle.setAttribute("aria-expanded", String(willOpen));
            });
        }
    }


    /* ============================================================
     * CSV
     * ============================================================ */

    function exportOrdersCsvF() {

        var rows = [
            [
                "شماره سفارش",
                "مشتری",
                "تاریخ",
                "مبلغ ریالی",
                "وضعیت پرداخت",
                "وضعیت سفارش"
            ]
        ];

        ordersF.forEach(function (order) {

            var totals = orderTotalsF(order);

            rows.push([
                order.number || "",
                order.customer ? order.customer.name || "" : "",
                order.date || "",
                Math.round(totals.totalRial),
                PAYMENT_STATUS_F[order.paymentStatus]
                    ? PAYMENT_STATUS_F[order.paymentStatus].label
                    : order.paymentStatus || "",
                ORDER_STATUS_F[order.orderStatus]
                    ? ORDER_STATUS_F[order.orderStatus].label
                    : order.orderStatus || ""
            ]);
        });

        var csv = rows
            .map(function (row) {
                return row
                    .map(function (cell) {
                        return '"' + String(cell).replace(/"/g, '""') + '"';
                    })
                    .join(",");
            })
            .join("\n");

        var blob = new Blob(
            ["\uFEFF" + csv],
            { type: "text/csv;charset=utf-8;" }
        );

        var url = URL.createObjectURL(blob);

        var link = document.createElement("a");

        link.href = url;
        link.download = "orders-export.csv";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        showToastF("خروجی سفارش‌ها دانلود شد.", "success");
    }


    /* ============================================================
     * DETAILS SHEET
     * ============================================================ */

    function renderDetailsSheetF(order) {

        var totals = orderTotalsF(order);

        document.getElementById("adminSheetTitleF").textContent =
            "سفارش " + order.number;

        document.getElementById("adminSheetBasicF").innerHTML =
            sheetRowF("شماره سفارش", order.number) +
            sheetRowF("تاریخ ثبت", order.date) +
            sheetRowF("تاریخ آخرین تغییر", order.lastChangeDate) +
            sheetBadgeRowF(
                "وضعیت سفارش",
                badgeHtmlF(ORDER_STATUS_F, order.orderStatus)
            ) +
            sheetBadgeRowF(
                "وضعیت فاکتور",
                badgeHtmlF(INVOICE_STATUS_F, order.invoiceStatus)
            );

        document.getElementById("adminSheetCustomerF").innerHTML =
            sheetRowF("نام و نام خانوادگی", order.customer.name) +
            sheetRowF(
                "شماره تماس",
                '<span dir="ltr">' + order.customer.phone + "</span>"
            ) +
            sheetRowF("آدرس", order.customer.address) +
            (
                order.customer.note
                    ? sheetRowF("اطلاعات تکمیلی", order.customer.note)
                    : ""
            );

        document.getElementById("adminSheetProductsF").innerHTML =

            order.products
                .map(function (product, index) {

                    var line = totals.lines[index];

                    var lineCurrencyLabel =
                        EXCHANGE_RATES_F[line.currency]
                            ? EXCHANGE_RATES_F[line.currency].label
                            : line.currency;

                    function cellF(label, value, full, strong, profit) {
                        return (
                            '<div class="admin-orders-f__sheet-product-cell' +
                            (full ? ' admin-orders-f__sheet-product-cell--full-f' : '') +
                            (strong ? ' admin-orders-f__sheet-product-cell--strong-f' : '') +
                            (profit ? ' admin-orders-f__sheet-product-cell--profit-f' : '') +
                            '"><dt>' + label + '</dt><dd>' + value + '</dd></div>'
                        );
                    }

                    var imageHtml =
                        product.image
                            ? '<img class="admin-orders-f__sheet-product-img-f" src="' + product.image + '" alt="' + product.name + '">'
                            : '<span class="admin-orders-f__sheet-product-img-f admin-orders-f__sheet-product-img-f--empty-f"></span>';

                    return (
                        '<div class="admin-orders-f__sheet-product">' +
                            '<div class="admin-orders-f__sheet-product-head-f">' +
                                imageHtml +
                                '<p class="admin-orders-f__sheet-product-name">' + product.name + "</p>" +
                            "</div>" +
                            '<dl class="admin-orders-f__sheet-product-grid">' +
                                cellF("برند", product.brand || "—") +
                                cellF("سایز", product.size || "—") +
                                cellF("رنگ", product.color || "—") +
                                cellF("تعداد", formatNumberF(line.qty)) +
                                cellF("قیمت پایه", formatForeignF(line.price) + " " + lineCurrencyLabel) +
                                cellF("نرخ ارز", formatNumberF(line.rate) + " ریال") +
                                cellF("درصد افزایش کل", formatNumberF(line.markup) + "٪") +
                                cellF("درصد ادمین", formatNumberF(line.adminPercent) + "٪") +
                                cellF("نرخ بعد از افزایش", formatNumberF(line.adjustedRate) + " ریال") +
                                cellF("قیمت واحد", formatNumberF(line.finalUnitRial) + " ریال") +
                                cellF("هزینه خدمات (ادمین)", formatNumberF(product.serviceCost || 0) + " ریال") +
                                (product.description ? cellF("توضیحات", product.description, true) : "") +
                                cellF("قیمت کل", formatNumberF(line.lineRial) + " ریال", true, true) +
                                cellF("سود ادمین این محصول", formatNumberF(line.profit) + " ریال", true, true, true) +
                            "</dl>" +
                        "</div>"
                    );
                })
                .join("")

            +

            '<div class="admin-orders-f__sheet-row">' +
            "<span>مبلغ کل محصولات</span>" +
            "<span>" + formatNumberF(totals.productsRial) + " ریال</span>" +
            "</div>"

            +

            '<div class="admin-orders-f__sheet-row admin-orders-f__sheet-row--profit-f">' +
            "<span>سود ادمین کل سفارش</span>" +
            "<span>" + formatNumberF(totals.profitRial || 0) + " ریال</span>" +
            "</div>"

            +

            '<div class="admin-orders-f__sheet-row">' +
            "<span>هزینه باربری</span>" +
            "<span>" +
            (
                order.shippingRial
                    ? formatNumberF(order.shippingRial) + " ریال"
                    : "ندارد"
            ) +
            "</span>" +
            "</div>";

        document.getElementById("adminSheetFinancialF").innerHTML =

            sheetRowF("مبلغ به ارز مبنا", totals.baseText) +

            sheetRowF("نوع ارز", totals.currencyText) +

            sheetRowF("نرخ تبدیل ارز", formatNumberF(totals.rate) + " ریال") +

            sheetRowF("مبلغ ریالی", formatNumberF(totals.totalRial) + " ریال") +

            sheetRowF(
                "مبلغ پرداخت‌شده",
                order.payment.paidRial === null
                    ? formatNumberF(totals.totalRial) + " ریال"
                    : formatNumberF(order.payment.paidRial) + " ریال"
            ) +

            sheetRowF(
                "مبلغ باقی‌مانده",
                order.payment.remainingRial === null
                    ? formatNumberF(
                        totals.totalRial - (order.payment.paidRial || 0)
                    ) + " ریال"
                    : formatNumberF(order.payment.remainingRial) + " ریال"
            );

        document.getElementById("adminSheetPaymentF").innerHTML =

            sheetBadgeRowF(
                "وضعیت پرداخت",
                badgeHtmlF(PAYMENT_STATUS_F, order.paymentStatus)
            ) +

            sheetRowF("روش پرداخت", order.payment.method) +

            sheetRowF(
                "کد پیگیری",
                '<span dir="ltr">' + order.payment.trackingCode + "</span>"
            ) +

            sheetRowF("تاریخ پرداخت", order.payment.paidDate);
    }


    /* ============================================================
     * PDF BACKEND HOOK
     * ============================================================ */

    function invoiceApiEndpointF(orderNumber) {
        return "/api/orders/" + encodeURIComponent(orderNumber) + "/invoice";
    }


    function fetchInvoicePdfBlobF(orderNumber) {

        return new Promise(function (resolve, reject) {

            window.setTimeout(function () {
                reject(new Error("invoice_backend_not_connected"));
            }, 700);
        });
    }


    function buildInvoiceCalcFromOrderF(order) {

        var products = Array.isArray(order.products) ? order.products : [];

        var items = products.map(function (product) {

            return {
                name: product.name || "",
                brand: product.brand || "",
                size: product.size || "",
                color: product.color || "",
                description: product.description || "",
                image: product.image || "",
                qty: Number(product.qty) || 1,
                serviceCost: Number(product.serviceCost) || 0,
                currency: product.currency || order.currency || "USD",
                price: baseUnitPriceF(product),
                markup: Number(product.markupPercent) || 0,
                brokerPercent: Number(product.brokerPercent) || 0,
                adminPercent: Number(product.adminPercent) || 0,
                taxPercent: Number(product.taxPercent) || 0,
                exchangeRate:
                    Number(product.exchangeRate) ||
                    (
                        EXCHANGE_RATES_F[product.currency]
                            ? EXCHANGE_RATES_F[product.currency].rate
                            : 0
                    )
            };
        });

        return buildInvoiceCalcF(
            items,
            EXCHANGE_RATES_F,
            Number(order.shippingRial) || 0
        );
    }


    function renderCustomerInvoiceForOrderF(order) {

        var invoice = document.getElementById("adminCustomerInvoiceF");

        if (!invoice) {
            return false;
        }

        var calc = buildInvoiceCalcFromOrderF(order);

        var paymentEntry = PAYMENT_STATUS_F[order.paymentStatus];

        var meta = {
            orderNumber: order.number,
            date: order.date || currentJalaliDateF(),
            customerName:
                order.customer && order.customer.name
                    ? order.customer.name
                    : "—",
            paymentLabel:
                paymentEntry
                    ? paymentEntry.label
                    : (order.paymentStatus || "—")
        };

        invoice.innerHTML = renderInvoiceHtmlF(calc, meta, false);

        return true;
    }


    function downloadOrderF(orderNumber) {

        // Ignore extra clicks while a print job is being prepared/open.
        if (printBusyF) {
            return;
        }

        var order = findOrderByNumberF(orderNumber);

        if (!order) {
            showToastF("سفارش پیدا نشد.", "error");
            return;
        }

        var triggers = document.querySelectorAll(
            '[data-download-order-f="' + orderNumber + '"]'
        );

        function setBusyF(isBusy) {
            triggers.forEach(function (button) {
                if (isBusy) {
                    button.setAttribute("aria-busy", "true");
                } else {
                    button.removeAttribute("aria-busy");
                }
                button.disabled = isBusy;
            });
        }

        setBusyF(true);

        var job;

        try {

            var rendered = renderCustomerInvoiceForOrderF(order);

            if (!rendered) {
                throw new Error("نمایش فاکتور مشتری پیدا نشد.");
            }

            // PDF مشتری دقیقاً از همان DOM و طراحی مرجع ساخته می‌شود.
            job = printInvoiceF("adminCustomerInvoiceF", true);

        } catch (error) {

            console.error("Customer invoice PDF error:", error);

            showToastF(
                error.message || "ساخت فاکتور مشتری انجام نشد.",
                "error"
            );

            job = Promise.resolve(false);
        }

        job.then(
            function () { setBusyF(false); },
            function () { setBusyF(false); }
        );
    }


    /* ============================================================
     * DETAILS MODAL INIT
     * ============================================================ */

    var openDetailsSheetF;


    function initDetailsSheetF() {

        var modal = document.getElementById("adminOrderDetailsModalF");
        var closeBtn = document.getElementById("adminSheetCloseF");
        var downloadBtn = document.getElementById("adminSheetDownloadF");
        var editBtn = document.getElementById("adminSheetEditF");

        if (!modal) {
            return;
        }

        var activeOrderNumber = null;

        openDetailsSheetF = function (orderNumber) {

            var order = ordersF.filter(function (item) {
                return item.number === orderNumber;
            })[0];

            if (!order) {
                return;
            }

            activeOrderNumber = orderNumber;

            if (downloadBtn) {
                downloadBtn.setAttribute("data-download-order-f", order.number);
            }

            renderDetailsSheetF(order);

            modal.hidden = false;
        };


        function closeModal() {
            modal.hidden = true;
            activeOrderNumber = null;
        }


        if (closeBtn) {
            closeBtn.addEventListener("click", closeModal);
        }

        var backdrop = modal.querySelector(".modal__backdrop");

        if (backdrop) {
            backdrop.addEventListener("click", closeModal);
        }

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !modal.hidden) {
                closeModal();
            }
        });

        if (downloadBtn) {
            downloadBtn.addEventListener("click", function () {
                if (activeOrderNumber) {
                    downloadOrderF(activeOrderNumber);
                }
            });
        }

        if (editBtn) {

            editBtn.addEventListener("click", function () {

                if (!activeOrderNumber) {
                    return;
                }

                var order = findOrderByNumberF(activeOrderNumber);

                if (!order) {
                    showToastF("سفارش پیدا نشد.", "error");
                    return;
                }

                if (!openEditOrderModalF) {
                    return;
                }

                closeModal();

                openEditOrderModalF(order);
            });
        }
    }


    /* ============================================================
     * MENUS + GLOBAL ACTIONS
     * ============================================================ */

    function closeAllMenusF() {

        document
            .querySelectorAll("[data-more-menu-panel-f]")
            .forEach(function (panel) {
                panel.hidden = true;
            });

        document
            .querySelectorAll("[data-more-menu-btn-f]")
            .forEach(function (button) {
                button.setAttribute("aria-expanded", "false");
            });
    }


    function initGlobalActionsF() {

        document.addEventListener("click", function (event) {

            var moreBtn = event.target.closest("[data-more-menu-btn-f]");

            if (moreBtn) {

                var moreOrderNumber =
                    moreBtn.getAttribute("data-more-menu-btn-f");

                var panel = document.querySelector(
                    '[data-more-menu-panel-f="' + moreOrderNumber + '"]'
                );

                if (!panel) {
                    return;
                }

                var wasHidden = panel.hidden;

                closeAllMenusF();

                panel.hidden = !wasHidden;

                moreBtn.setAttribute("aria-expanded", String(!wasHidden));

                return;
            }


            var downloadTrigger =
                event.target.closest("[data-download-order-f]");

            if (downloadTrigger) {

                downloadOrderF(
                    downloadTrigger.getAttribute("data-download-order-f")
                );

                closeAllMenusF();

                return;
            }


            var editTrigger = event.target.closest("[data-edit-order-f]");

            if (editTrigger) {

                var editOrderNumber =
                    editTrigger.getAttribute("data-edit-order-f");

                var editOrder = findOrderByNumberF(editOrderNumber);

                closeAllMenusF();

                if (!editOrder) {
                    showToastF("سفارش پیدا نشد.", "error");
                    return;
                }

                if (openEditOrderModalF) {
                    openEditOrderModalF(editOrder);
                }

                return;
            }


            var resendTrigger =
                event.target.closest("[data-resend-invoice-f]");

            if (resendTrigger) {

                showToastF(
                    "ارسال مجدد فاکتور هنوز به بک‌اند متصل نشده است.",
                    "error"
                );

                closeAllMenusF();

                return;
            }


            var deleteTrigger =
                event.target.closest("[data-delete-order-f]");

            if (deleteTrigger) {

                var deleteOrderNumber =
                    deleteTrigger.getAttribute("data-delete-order-f");

                var deleteOrder = findOrderByNumberF(deleteOrderNumber);

                closeAllMenusF();

                if (!deleteOrder) {
                    showToastF("سفارش پیدا نشد.", "error");
                    return;
                }

                var confirmed = window.confirm(
                    "آیا از حذف کامل سفارش " +
                    deleteOrder.number +
                    " مطمئن هستید؟\n" +
                    "این عملیات قابل بازگشت نیست."
                );

                if (!confirmed) {
                    return;
                }

                var deleteForm =
                    document.getElementById("adminNewOrderFormF");

                if (!deleteForm) {
                    showToastF("فرم سفارش پیدا نشد.", "error");
                    return;
                }

                var deleteUrl = buildOrderUrlF(
                    deleteForm.dataset.deleteUrlTemplate,
                    deleteOrder.id
                );

                var deleteData = new FormData();

                deleteData.append("csrfmiddlewaretoken", getCsrfTokenF());

                fetchJsonF(deleteUrl, { method: "POST", body: deleteData })

                    .then(function () {

                        // فقط بعد از حذف موفق در Django
                        // از لیست مرورگر هم حذف می‌کنیم.
                        ordersF = ordersF.filter(function (item) {
                            return Number(item.id) !== Number(deleteOrder.id);
                        });

                        applyFiltersF();

                        showToastF(
                            "سفارش " + deleteOrder.number + " با موفقیت حذف شد.",
                            "success"
                        );
                    })

                    .catch(function (error) {

                        console.error("Delete order error:", error);

                        showToastF(
                            error.message || "حذف سفارش انجام نشد.",
                            "error"
                        );
                    });

                return;
            }


            var viewTrigger = event.target.closest("[data-view-order-f]");

            var invoiceTrigger =
                event.target.closest("[data-admin-invoice-order-f]");

            if (invoiceTrigger) {

                var invoiceOrderNumber =
                    invoiceTrigger.getAttribute("data-admin-invoice-order-f");

                var invoiceOrder = findOrderByNumberF(invoiceOrderNumber);

                if (invoiceOrder) {

                    var invoiceCalc =
                        buildInvoiceCalcFromOrderF(invoiceOrder);

                    var invoiceMeta = {
                        orderNumber: invoiceOrder.number,
                        date: invoiceOrder.date,
                        customerName:
                            invoiceOrder.customer && invoiceOrder.customer.name
                                ? invoiceOrder.customer.name
                                : "—",
                        paymentLabel: invoiceOrder.paymentStatus || "—"
                    };

                    var adminInvoice =
                        document.getElementById("adminInternalInvoiceF");

                    if (adminInvoice) {
                        adminInvoice.innerHTML =
                            renderInvoiceHtmlF(invoiceCalc, invoiceMeta, true);
                    }

                    openInvoiceModalF("adminInternalInvoiceModalF");
                }

                return;
            }


            if (viewTrigger) {

                if (openDetailsSheetF) {
                    openDetailsSheetF(
                        viewTrigger.getAttribute("data-view-order-f")
                    );
                }

                closeAllMenusF();

                return;
            }


            var row = event.target.closest("[data-order-row-f]");

            if (
                row &&
                !event.target.closest(".admin-menu-f") &&
                !event.target.closest("button")
            ) {

                if (openDetailsSheetF) {
                    openDetailsSheetF(
                        row.getAttribute("data-order-row-f")
                    );
                }

                return;
            }


            if (!event.target.closest(".admin-menu-f")) {
                closeAllMenusF();
            }
        });
    }


    /* ============================================================
     * NEW ORDER
     * ============================================================ */

    /* ----------------------------------------------------------
     * Item rows (image upload, price+currency, qty stepper,
     * remove) — cloned from <template id="adminOrderItemTemplateF">
     * ---------------------------------------------------------- */

    function createOrderItemRowF(product) {

        var template = document.getElementById("adminOrderItemTemplateF");

        if (!template) {
            return null;
        }

        var row = template.content.firstElementChild.cloneNode(true);

        var removeBtn = row.querySelector(".admin-order-item-f__remove");
        var fileInput = row.querySelector(".admin-order-item-f__file-input");
        var preview = row.querySelector(".admin-order-item-f__preview");
        var nameInput = row.querySelector(".admin-order-item-f__name");
        var priceInput = row.querySelector(".admin-order-item-f__price");
        var serviceInput = row.querySelector(".admin-order-item-f__service-cost");
        var colorInput = row.querySelector(".admin-order-item-f__color");
        var currencyInput = row.querySelector(".admin-order-item-f__currency");
        var markupInput = row.querySelector(".admin-order-item-f__markup");
        var brokerInput = row.querySelector(".admin-order-item-f__broker");
        var adminPercentInput = row.querySelector(".admin-order-item-f__admin");
        var taxInput = row.querySelector(".admin-order-item-f__tax");
        var percentEditToggle = row.querySelector(".admin-order-item-f__percent-edit");
        var exchangeRateInput = row.querySelector(".admin-order-item-f__exchange-rate");
        var afterMarkupOutput = row.querySelector(".admin-order-item-f__after-markup");
        var baseRialOutput = row.querySelector(".admin-order-item-f__base-rial");
        var unitRialOutput = row.querySelector(".admin-order-item-f__unit-rial");
        var lineTotalOutput = row.querySelector(".admin-order-item-f__line-total");
        var brandInput = row.querySelector(".admin-order-item-f__brand");
        var sizeInput = row.querySelector(".admin-order-item-f__size");
        var descriptionInput = row.querySelector(".admin-order-item-f__description");
        var qtyInput = row.querySelector(".admin-order-item-f__qty");


        // Writes the three percentages and keeps the (read-only) total in
        // sync: total markup = broker + admin + tax.
        function setPercentsF(parts) {

            if (brokerInput) brokerInput.value = parts.broker;
            if (adminPercentInput) adminPercentInput.value = parts.admin;
            if (taxInput) taxInput.value = parts.tax;

            syncTotalPercentF();
        }

        function syncTotalPercentF() {

            var total =
                (brokerInput ? parseNumericInputF(brokerInput.value) : 0) +
                (adminPercentInput ? parseNumericInputF(adminPercentInput.value) : 0) +
                (taxInput ? parseNumericInputF(taxInput.value) : 0);

            total = Math.round(total * 100) / 100;

            if (markupInput) {
                markupInput.value = total;
            }
        }

        function setPercentEditingF(enabled) {

            [brokerInput, adminPercentInput, taxInput].forEach(function (input) {
                if (input) {
                    input.disabled = !enabled;
                }
            });

            if (percentEditToggle) {
                percentEditToggle.checked = enabled;
            }

            row.classList.toggle("is-editing-percents-f", enabled);
        }

        setPercentEditingF(false);

        if (percentEditToggle) {
            percentEditToggle.addEventListener("change", function () {

                setPercentEditingF(percentEditToggle.checked);

                if (!percentEditToggle.checked) {
                    // برگشت به درصدهای پیش‌فرض همین واحد پول
                    setPercentsF(
                        DEFAULT_PERCENTS_F[currencyInput ? currencyInput.value : "USD"] ||
                        { broker: 0, admin: 0, tax: 0 }
                    );
                    updatePricingPreviewF();
                }
            });
        }


        if (removeBtn) {
            removeBtn.addEventListener("click", function () {
                row.remove();
                updateOrderGrandTotalPreviewF();
            });
        }


        if (fileInput) {

            fileInput.addEventListener("change", function () {

                var file = fileInput.files[0];

                if (!file) {
                    return;
                }

                var reader = new FileReader();

                reader.onload = function () {
                    preview.src = reader.result;
                    preview.hidden = false;
                };

                reader.readAsDataURL(file);
            });
        }


        // FIX: read qty with parseNumericInputF and re-format after change.
        row.querySelectorAll("[data-qty-action]").forEach(function (btn) {

            btn.addEventListener("click", function () {

                var current = parseNumericInputF(qtyInput.value) || 1;

                var next =
                    btn.dataset.qtyAction === "increase"
                        ? current + 1
                        : current - 1;

                qtyInput.value = Math.max(1, next);
                formatNumericInputDisplayF(qtyInput);
            });
        });


        // اگر در حالت ویرایش هستیم
        if (product) {

            if (product.id) {
                row.dataset.itemId = String(product.id);
            }

            if (nameInput) {
                nameInput.value = product.name || "";
            }

            if (priceInput) {
                priceInput.value = baseUnitPriceF(product);
            }

            if (currencyInput) {
                currencyInput.value = product.currency || "USD";
            }

            if (
                Number.isFinite(Number(product.brokerPercent)) &&
                Number.isFinite(Number(product.adminPercent)) &&
                Number.isFinite(Number(product.taxPercent))
            ) {
                setPercentsF({
                    broker: Number(product.brokerPercent),
                    admin: Number(product.adminPercent),
                    tax: Number(product.taxPercent)
                });
            } else {
                setPercentsF(
                    DEFAULT_PERCENTS_F[product.currency || "USD"] ||
                    { broker: 0, admin: 0, tax: 0 }
                );
            }

            if (exchangeRateInput) {
                var savedExchangeRate = Number(product.exchangeRate);
                exchangeRateInput.value =
                    savedExchangeRate > 0
                        ? savedExchangeRate
                        : (EXCHANGE_RATES_F[product.currency || "USD"]
                            ? EXCHANGE_RATES_F[product.currency || "USD"].rate
                            : 0);
            }

            if (brandInput) {
                brandInput.value = product.brand || "";
            }

            if (sizeInput) {
                sizeInput.value = product.size || "";
            }

            if (colorInput) {
                colorInput.value = product.color || "";
            }

            if (serviceInput) {
                serviceInput.value = Number(product.serviceCost) || 0;
            }

            if (descriptionInput) {
                descriptionInput.value = product.description || "";
            }

            if (qtyInput) {
                qtyInput.value = Number(product.qty) || 1;
            }

            if (preview && product.image) {
                preview.src = product.image;
                preview.hidden = false;
            }

        } else {

            if (currencyInput) {
                currencyInput.value = "USD";
            }

            setPercentsF(DEFAULT_PERCENTS_F.USD);

            if (exchangeRateInput) {
                exchangeRateInput.value = EXCHANGE_RATES_F.USD.rate;
            }
        }


        // FIX: every numeric read goes through parseNumericInputF.
        function updatePricingPreviewF() {

            var foreignPrice =
                priceInput ? parseNumericInputF(priceInput.value) : 0;

            var markup =
                markupInput ? parseNumericInputF(markupInput.value) : 0;

            var baseExchangeRate =
                exchangeRateInput
                    ? parseNumericInputF(exchangeRateInput.value)
                    : 0;

            // 1) Keep the foreign product price unchanged.
            // 2) Apply markup to the Rial exchange rate.
            // 3) Calculate once with the base rate and once with the adjusted rate.
            var adjustedExchangeRate =
                Math.round(baseExchangeRate * (1 + markup / 100));

            var baseProductRial =
                Math.round(foreignPrice * baseExchangeRate);

            var finalProductRial =
                Math.round(foreignPrice * adjustedExchangeRate);

            if (afterMarkupOutput) {
                afterMarkupOutput.textContent =
                    formatNumberF(adjustedExchangeRate) + " ریال";
            }

            if (baseRialOutput) {
                baseRialOutput.textContent =
                    formatNumberF(baseProductRial) + " ریال";
            }

            if (unitRialOutput) {
                unitRialOutput.textContent =
                    formatNumberF(finalProductRial) + " ریال";
            }

            if (lineTotalOutput) {

                var qtyForLineTotal = Math.max(
                    1,
                    parseNumericInputF(qtyInput ? qtyInput.value : 1) || 1
                );

                var serviceCostForLineTotal =
                    parseNumericInputF(serviceInput ? serviceInput.value : 0);

                // Mirrors OrderItem.line_total_irr exactly: unit price
                // (after markup) × qty, plus this item's own service fee
                // (charged once per item, not multiplied by qty).
                var lineTotalRial =
                    (finalProductRial * qtyForLineTotal) +
                    serviceCostForLineTotal;

                lineTotalOutput.textContent =
                    formatNumberF(lineTotalRial) + " ریال";
            }

            updateOrderGrandTotalPreviewF();
        }


        if (currencyInput) {

            currencyInput.addEventListener("change", function () {

                var currency = currencyInput.value;

                setPercentEditingF(false);
                setPercentsF(
                    DEFAULT_PERCENTS_F[currency] ||
                    { broker: 0, admin: 0, tax: 0 }
                );

                if (exchangeRateInput && EXCHANGE_RATES_F[currency]) {
                    exchangeRateInput.value = EXCHANGE_RATES_F[currency].rate;
                    formatNumericInputDisplayF(exchangeRateInput);
                }

                updatePricingPreviewF();
            });
        }


        [priceInput, brokerInput, adminPercentInput, taxInput, exchangeRateInput, qtyInput, serviceInput]
            .forEach(function (input) {
                if (input) {
                    input.addEventListener("input", function () {
                        syncTotalPercentF();
                        updatePricingPreviewF();
                    });
                    input.addEventListener("change", function () {
                        syncTotalPercentF();
                        updatePricingPreviewF();
                    });
                }
            });

        // Quantity +/- buttons modify the input programmatically, so refresh too.
        row.querySelectorAll("[data-qty-action]").forEach(function (btn) {
            btn.addEventListener("click", updatePricingPreviewF);
        });

        // Format numeric fields in this dynamically-created row.
        prepareAllNumericInputsF(row);

        setTimeout(updatePricingPreviewF, 0);

        return row;
    }


    // FIX: every numeric read goes through parseNumericInputF.
    function updateOrderGrandTotalPreviewF() {

        var totalEl = document.getElementById("adminNewOrderGrandTotalF");
        var container = document.getElementById("adminOrderItemsF");

        if (!totalEl || !container) {
            return;
        }

        var productsTotal = 0;

        container.querySelectorAll(".admin-order-item-f").forEach(function (row) {

            function val(selector) {
                var el = row.querySelector(selector);
                return el ? parseNumericInputF(el.value) : 0;
            }

            var foreignPrice = val(".admin-order-item-f__price");
            var markup = val(".admin-order-item-f__markup");
            var baseRate = val(".admin-order-item-f__exchange-rate");
            var qty = Math.max(1, val(".admin-order-item-f__qty") || 1);
            var serviceCost = val(".admin-order-item-f__service-cost");

            var adjustedRate = Math.round(baseRate * (1 + markup / 100));

            productsTotal +=
                Math.round(foreignPrice * adjustedRate) * qty + serviceCost;
        });

        var shippingEl = document.getElementById("adminNewOrderShippingF");

        var shipping = shippingEl ? parseNumericInputF(shippingEl.value) : 0;

        totalEl.textContent =
            formatNumberF(roundInvoiceTotalUpF(productsTotal + shipping)) +
            " ریال";
    }


    function resetOrderItemsF() {

        var container = document.getElementById("adminOrderItemsF");

        if (!container) {
            return;
        }

        container.innerHTML = "";

        var firstRow = createOrderItemRowF();

        if (firstRow) {
            container.appendChild(firstRow);
        }

        updateOrderGrandTotalPreviewF();
    }


    function initOrderItemsF() {

        var addBtn = document.getElementById("adminAddOrderItemF");
        var container = document.getElementById("adminOrderItemsF");

        if (!addBtn || !container) {
            return;
        }

        addBtn.addEventListener("click", function () {

            var row = createOrderItemRowF();

            if (row) {
                container.appendChild(row);
                updateOrderGrandTotalPreviewF();
            }
        });
    }


    // Reads + validates every item row. Returns { items, error }
    // — items is null when validation fails, with error set to a
    // user-facing message.
    // FIX: every numeric read goes through parseNumericInputF.
    function readOrderItemsF() {

        var container = document.getElementById("adminOrderItemsF");

        if (!container) {
            return { items: null, error: "خطای داخلی فرم." };
        }

        var rows = container.querySelectorAll(".admin-order-item-f");

        if (!rows.length) {
            return {
                items: null,
                error: "حداقل یک آیتم به سفارش اضافه کنید."
            };
        }

        var items = [];
        var error = null;

        rows.forEach(function (row) {

            if (error) {
                return;
            }

            var nameInput = row.querySelector(".admin-order-item-f__name");
            var priceInput = row.querySelector(".admin-order-item-f__price");
            var currencyInput = row.querySelector(".admin-order-item-f__currency");
            var markupInput = row.querySelector(".admin-order-item-f__markup");
            var exchangeRateInput = row.querySelector(".admin-order-item-f__exchange-rate");
            var brandInput = row.querySelector(".admin-order-item-f__brand");
            var sizeInput = row.querySelector(".admin-order-item-f__size");
            var colorInput = row.querySelector(".admin-order-item-f__color");
            var serviceInput = row.querySelector(".admin-order-item-f__service-cost");
            var descriptionInput = row.querySelector(".admin-order-item-f__description");
            var qtyInput = row.querySelector(".admin-order-item-f__qty");
            var preview = row.querySelector(".admin-order-item-f__preview");
            var fileInput = row.querySelector(".admin-order-item-f__file-input");

            var name = nameInput ? nameInput.value.trim() : "";

            var price = priceInput ? parseNumericInputF(priceInput.value) : 0;

            var currency = currencyInput ? currencyInput.value : "";

            var markup = markupInput ? parseNumericInputF(markupInput.value) : 0;

            var brokerInputEl = row.querySelector(".admin-order-item-f__broker");
            var adminInputEl = row.querySelector(".admin-order-item-f__admin");
            var taxInputEl = row.querySelector(".admin-order-item-f__tax");

            var brokerPercent =
                brokerInputEl ? parseNumericInputF(brokerInputEl.value) : 0;
            var adminPercent =
                adminInputEl ? parseNumericInputF(adminInputEl.value) : 0;
            var taxPercent =
                taxInputEl ? parseNumericInputF(taxInputEl.value) : 0;

            var exchangeRate =
                exchangeRateInput
                    ? parseNumericInputF(exchangeRateInput.value)
                    : 0;

            var brand = brandInput ? brandInput.value.trim() : "";

            var size = sizeInput ? sizeInput.value.trim() : "";

            var description =
                descriptionInput ? descriptionInput.value.trim() : "";

            var qty = qtyInput ? parseNumericInputF(qtyInput.value) : 0;

            var serviceCost =
                serviceInput ? parseNumericInputF(serviceInput.value) : 0;

            var image = preview && !preview.hidden ? preview.src : "";

            var file =
                fileInput && fileInput.files && fileInput.files.length
                    ? fileInput.files[0]
                    : null;

            if (
                !name ||
                !price ||
                price <= 0 ||
                markup < 0 ||
                brokerPercent < 0 ||
                adminPercent < 0 ||
                taxPercent < 0 ||
                !exchangeRate ||
                exchangeRate <= 0 ||
                !qty ||
                qty < 1
            ) {

                error =
                    "برای هر آیتم، نام، قیمت پایه، درصد افزایش، نرخ ارز و تعداد معتبر وارد کنید.";

                return;
            }

            var itemId = row.dataset.itemId ? Number(row.dataset.itemId) : null;

            items.push({
                id: itemId,
                name: name,
                price: price,
                serviceCost: serviceCost,
                currency: currency,
                markup: markup,
                brokerPercent: brokerPercent,
                adminPercent: adminPercent,
                taxPercent: taxPercent,
                exchangeRate: exchangeRate,
                brand: brand,
                size: size,
                color: colorInput ? colorInput.value.trim() : "",
                description: description,
                qty: qty,
                image: image,
                file: file
            });
        });

        return {
            items: error ? null : items,
            error: error
        };
    }


    /* ----------------------------------------------------------
     * Exchange rate "fetch"
     *
     * Temporary local exchange-rate source.
     * Replace the body of this function with a real backend/API
     * request when the exchange-rate endpoint is implemented.
     * Keep the same resolved shape
     * ({ USD: { label, rate }, ... }).
     * ---------------------------------------------------------- */

    function fetchExchangeRatesF() {

        return new Promise(function (resolve) {

            setTimeout(function () {
                resolve(EXCHANGE_RATES_F);
            }, 700);
        });
    }


    /* ----------------------------------------------------------
     * Invoice calculation
     * ---------------------------------------------------------- */

    function buildInvoiceCalcF(items, rates, shippingRial) {

        // The product price in foreign currency never changes.
        // Markup is applied to the IRR exchange rate, then the product
        // is converted once with the base rate and once with the adjusted rate.
        var byCurrency = {};
        var baseItemsRial = 0;
        var itemsRial = 0;
        var markupProfitRial = 0;
        var serviceCostRial = 0;

        var lines = items.map(function (item) {

            var rate =
                Number(item.exchangeRate) ||
                (rates[item.currency] ? rates[item.currency].rate : 0);

            var markup = Number(item.markup) || 0;
            var adminPercent = Number(item.adminPercent) || 0;
            var adjustedRate = Math.round(rate * (1 + markup / 100));

            var foreignUnitPrice = Number(item.price) || 0;
            var qty = Number(item.qty) || 0;
            var serviceCost = Number(item.serviceCost) || 0;

            var baseUnitRial = Math.round(foreignUnitPrice * rate);
            var finalUnitRial = Math.round(foreignUnitPrice * adjustedRate);
            var baseLineRial = baseUnitRial * qty;
            var lineBeforeServiceRial = finalUnitRial * qty;

            // lineRial is the actual payable amount for this line — unit
            // price × qty, plus this item's own service fee (charged once
            // per item entry, not multiplied by qty). Mirrors
            // OrderItem.line_total_irr on the backend exactly.
            var lineRial = lineBeforeServiceRial + serviceCost;
            var lineForeign = foreignUnitPrice * qty;

            baseItemsRial += baseLineRial;
            itemsRial += lineRial;
            serviceCostRial += serviceCost;

            // Admin profit only: admin% of the base (pre-markup) line value.
            // Broker share, tax and the service fee are not profit. Same as
            // OrderItem.admin_profit_irr on the backend.
            var lineAdminProfitRial =
                Math.round(baseLineRial * adminPercent / 100);

            markupProfitRial += lineAdminProfitRial;

            // Foreign subtotal stays unchanged because markup is not applied
            // to the foreign product price itself.
            byCurrency[item.currency] =
                (byCurrency[item.currency] || 0) + lineForeign;

            return {
                name: item.name,
                brand: item.brand,
                size: item.size,
                description: item.description,
                image: item.image,
                qty: qty,
                currency: item.currency,
                price: foreignUnitPrice,
                markup: markup,
                brokerPercent: Number(item.brokerPercent) || 0,
                adminPercent: adminPercent,
                taxPercent: Number(item.taxPercent) || 0,
                rate: rate,
                adjustedRate: adjustedRate,
                baseUnitRial: baseUnitRial,
                finalUnitRial: finalUnitRial,
                baseLineRial: baseLineRial,
                lineForeign: lineForeign,
                lineRial: lineRial,
                serviceCost: serviceCost,
                profit: lineAdminProfitRial,
                color: item.color
            };
        });

        var grandTotalRial = roundInvoiceTotalUpF(itemsRial + shippingRial);

        return {
            lines: lines,
            byCurrency: byCurrency,
            baseItemsRial: baseItemsRial,
            itemsRial: itemsRial,
            shippingRial: shippingRial,
            serviceCostRial: serviceCostRial,
            grandTotalRial: grandTotalRial,
            profitRial: markupProfitRial
        };
    }


    /* ----------------------------------------------------------
     * Invoice rendering — one shared layout, two content sets
     * (the admin version adds the profit block).
     * ---------------------------------------------------------- */

    function toPersianDigitsF(value) {

        var map = {
            "0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴",
            "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹"
        };

        return String(value == null ? "" : value).replace(
            /[0-9]/g,
            function (digit) {
                return map[digit];
            }
        );
    }


    function renderInvoiceHtmlF(calc, meta, isAdminF) {

        var itemRows = calc.lines.map(function (line) {

            var currencyLabel =
                EXCHANGE_RATES_F[line.currency]
                    ? EXCHANGE_RATES_F[line.currency].label
                    : line.currency;

            // ستون قیمت، مبلغ نهایی همان ردیف را نشان می‌دهد (قیمت واحد ×
            // تعداد + هزینه خدمات همان آیتم)، نه قیمت واحد.
            var rialCell =
                '<td class="invoice-price">' +
                moneyHtmlF(line.lineRial, "ریال") + '</td>';

            var foreignCell =
                isAdminF
                    ? '<td class="invoice-price">' +
                      '<span class="invoice-money-f" dir="rtl"><bdi class="invoice-money-f__number" dir="ltr">' +
                      formatForeignF(line.price * line.qty) + '</bdi><span class="invoice-money-f__label"> ' + currencyLabel + '</span></span>' +
                      '</td>'
                    : '';

            var nameCell =
                '<td class="invoice-item-name">' +
                    '<div class="invoice-product-cell-f">' +
                        (
                            line.image
                                ? '<img class="invoice-product-cell-f__img" src="' + line.image + '" alt="">'
                                : '<span class="invoice-product-cell-f__img invoice-product-cell-f__img--empty-f"></span>'
                        ) +
                        '<span class="invoice-product-cell-f__name">' + (line.name || '—') + '</span>' +
                    '</div>' +
                '</td>';

            return (
                '<tr>' +
                nameCell +
                '<td>' + (line.brand || '—') + '</td>' +
                '<td>' + (line.size || '—') + '</td>' +
                '<td>' + (line.color || '—') + '</td>' +
                '<td>' + toPersianDigitsF(line.qty || 0) + '</td>' +
                foreignCell +
                rialCell +
                '</tr>'
            );
        }).join('');

        var rateLineHtml = '';

        if (isAdminF && calc.lines.length) {

            var primaryLine = calc.lines[0];

            var primaryCurrencyLabel =
                EXCHANGE_RATES_F[primaryLine.currency]
                    ? EXCHANGE_RATES_F[primaryLine.currency].label
                    : primaryLine.currency;

            rateLineHtml =
                '<div class="invoice-summary-row-f">' +
                    '<span>نرخ ' + primaryCurrencyLabel + ' اولیه :</span>' +
                    '<strong>' + formatNumberF(primaryLine.rate) + ' ریال</strong>' +
                '</div>' +
                '<div class="invoice-summary-row-f">' +
                    '<span>درصد افزایش کل :</span>' +
                    '<strong>' + toPersianDigitsF(Number(primaryLine.markup || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })) + '%</strong>' +
                '</div>' +
                '<div class="invoice-summary-row-f">' +
                    '<span>درصد ادمین :</span>' +
                    '<strong>' + toPersianDigitsF(Number(primaryLine.adminPercent || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })) + '%</strong>' +
                '</div>' +
                '<div class="invoice-summary-row-f">' +
                    '<span>نرخ ' + primaryCurrencyLabel + ' بعد از افزایش :</span>' +
                    '<strong>' + formatNumberF(primaryLine.adjustedRate) + ' ریال</strong>' +
                '</div>';
        }

        var profitBlock = '';

        if (isAdminF) {

            profitBlock =
                '<div class="invoice-profit-f">' +
                    '<div class="invoice-profit-title-f">فاکتور داخلی — فقط ادمین</div>' +
                    rateLineHtml +
                    '<div class="invoice-summary-row-f">' +
                        '<span>جمع محصولات قبل از افزایش</span>' +
                        '<strong>' + formatNumberF(calc.baseItemsRial) + ' ریال</strong>' +
                    '</div>' +
                    '<div class="invoice-summary-row-f">' +
                        '<span>سود ادمین</span>' +
                        '<strong>' + formatNumberF(calc.profitRial) + ' ریال</strong>' +
                    '</div>' +
                    '<div class="invoice-summary-row-f">' +
                        '<span>هزینه کل خدمات</span>' +
                        '<strong>' + formatNumberF(calc.serviceCostRial) + ' ریال</strong>' +
                    '</div>' +
                '</div>';
        }

        var tableHeadHtml =
            isAdminF
                ? '<tr><th>کالا</th><th>برند</th><th>سایز</th><th>رنگ</th><th>تعداد</th><th>قیمت کل (ارز)</th><th>قیمت کل (ریال)</th></tr>'
                : '<tr><th>کالا</th><th>برند</th><th>سایز</th><th>رنگ</th><th>تعداد</th><th>قیمت کل</th></tr>';

        // 7 columns for the admin invoice (name+photo, brand, size, color,
        // qty, foreign price, rial price); 6 for the customer invoice.
        var colWidthsCss =
            isAdminF
                ? '.admin-invoice-f__table th:nth-child(1){width:22%;}.admin-invoice-f__table th:nth-child(2){width:11%;}.admin-invoice-f__table th:nth-child(3){width:8%;}.admin-invoice-f__table th:nth-child(4){width:10%;}.admin-invoice-f__table th:nth-child(5){width:7%;}.admin-invoice-f__table th:nth-child(6){width:16%;}.admin-invoice-f__table th:nth-child(7){width:26%;}'
                : '.admin-invoice-f__table th:nth-child(1){width:28%;}.admin-invoice-f__table th:nth-child(2){width:14%;}.admin-invoice-f__table th:nth-child(3){width:11%;}.admin-invoice-f__table th:nth-child(4){width:12%;}.admin-invoice-f__table th:nth-child(5){width:9%;}.admin-invoice-f__table th:nth-child(6){width:26%;}';

        return (
            '<style id="admin-invoice-reference-style-f">\n.invoice-scale-wrap-f{width:100%;overflow:hidden;display:flex;justify-content:center;align-items:flex-start;}\n.admin-invoice-f{flex:0 0 auto;transform-origin:top center;width:640px;min-height:980px;margin:0 auto;background:#F3EFE8;color:#201B1D;direction:rtl;overflow:hidden;font-family:\'Sanaa Persian\',Tahoma,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}\n.admin-invoice-f,.admin-invoice-f *{box-sizing:border-box;font-variant-numeric:tabular-nums;}\n.admin-invoice-f__band{height:200px;min-height:200px;padding:26px 24px 16px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;background:#B9C3B9;text-align:center;}\n.admin-invoice-f__band-logo{font-family:\'Belleza\',Sanaa Persian,Georgia,serif;font-size:56px;line-height:1;color:#A61579;letter-spacing:.16em;font-weight:400;}\n.admin-invoice-f__band-sub{margin-top:8px;font-family:\'Belleza\',Sanaa Persian,Georgia,serif;font-size:19px;line-height:1;color:#A61579;letter-spacing:.34em;font-weight:400;}\n.admin-invoice-f__band-type-f{margin-top:10px;font-size:12px;color:#5C5356;font-weight:700;}\n.admin-invoice-f__card{width:90%;min-height:720px;margin:-50px auto 0;background:#fff;padding:0 18px 36px;box-shadow:0 0 0 1px rgba(0,0,0,.02);page-break-inside:avoid;}\n.admin-invoice-f__meta{min-height:92px;padding:17px 0 15px;display:flex;align-items:start;gap:30px;border-bottom:1px solid #4B4748;font-size:15px;line-height:1.8;}\n.admin-invoice-f__meta-col{display:flex;flex-direction:column;gap:0;min-width:0;}\n.admin-invoice-f__meta-col--left{text-align:left;}\n.admin-invoice-f__meta-col p{margin:0;white-space:nowrap;overflow-wrap:anywhere;}\n.admin-invoice-f__table{width:100%;margin:30px 0 0;border-collapse:collapse;table-layout:fixed;font-size:14px;}\n.admin-invoice-f__table th{height:44px;padding:6px 7px;background:#A61579;color:#fff;border-left:2px solid #fff;font-size:13px;font-weight:700;text-align:center;vertical-align:middle;overflow-wrap:anywhere;line-height:1.2;}\n' +
            colWidthsCss +
            '\n.admin-invoice-f__table th:last-child{border-left:0;}\n.admin-invoice-f__table td{min-height:62px;height:62px;padding:8px 7px;border:0;text-align:center;vertical-align:middle;font-size:14px;overflow-wrap:anywhere;word-break:break-word;}\n.admin-invoice-f__table td.invoice-item-name{text-align:right;}\n.invoice-product-cell-f{display:flex;align-items:center;gap:8px;}\n.invoice-product-cell-f__img{flex-shrink:0;width:36px;height:36px;border-radius:8px;object-fit:cover;}\n.invoice-product-cell-f__img--empty-f{background:#F3EFE8;}\n.invoice-product-cell-f__name{text-align:right;overflow-wrap:anywhere;}\n.admin-invoice-f__table td.invoice-price{direction:rtl;white-space:normal;overflow-wrap:anywhere;}\n.invoice-money-f{display:inline-flex;align-items:baseline;gap:3px;direction:rtl;unicode-bidi:isolate;white-space:nowrap;}\n.invoice-money-f__number{display:inline-block;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;white-space:nowrap;}\n.invoice-money-f__label{display:inline-block;white-space:nowrap;}\n.invoice-price-stack-f{width:100%;display:flex;flex-direction:column;align-items:stretch;gap:5px;direction:rtl;min-width:0;}\n.invoice-price-line-f{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr);align-items:baseline;gap:4px;white-space:normal;min-width:0;}\n.invoice-price-label-f{text-align:right;white-space:nowrap;}\n.invoice-price-line-f .invoice-money-f{min-width:0;max-width:100%;justify-content:flex-start;white-space:normal;flex-wrap:wrap;}\n.invoice-price-line-f .invoice-money-f__number{max-width:100%;white-space:normal;overflow-wrap:anywhere;}\n.admin-invoice-f__summary-wrap{margin-top:42px;display:flex;flex-direction:column;align-items:flex-end;}\n.admin-invoice-f__summary{width:315px;max-width:none;margin-right:0;display:flex;flex-direction:column;gap:6px;}\n.invoice-summary-row-f{display:flex;align-items:baseline;justify-content:space-between;gap:10px;font-size:15px;line-height:1.65;direction:rtl;}\n.invoice-summary-row-f span:last-child,.invoice-summary-row-f strong:last-child{white-space:nowrap;text-align:left;}\n.invoice-summary-total-f{margin-top:10px;padding-top:11px;border-top:2px solid #4B4748;font-size:18px;font-weight:700;}\n.invoice-summary-total-f strong:first-child{font-weight:800;}\n.invoice-profit-f{width:100%; max-width:none;margin:60px auto 0 0;padding:10px 12px;border:1px dashed #A61579;background:#FBF2F8;}\n.invoice-profit-title-f{margin-bottom:7px;color:#A61579;font-size:11px;font-weight:700;}\n.admin-invoice-f__footer{width:90%;margin:0 auto;min-height:120px;padding:28px 0 0;display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;flex-wrap:nowrap;gap:30px;background:#F3EFE8;color:#A61579;}\n.admin-invoice-f__contact-f{flex:0 1 auto;min-width:0;font-family: Sanaa Persian ,Arial,Tahoma,sans-serif;font-size:14px;line-height:1.7;text-align:left;}\n.admin-invoice-f__contact-f p{margin:0;overflow-wrap:anywhere;}\n.admin-invoice-f__thanks-f{flex:0 1 auto;min-width:0;margin:0;font-size:22px;font-weight:700;text-align:right;white-space:normal;overflow-wrap:anywhere;}\n.admin-invoice-f__footer-note{display:none;}\n</style>' +
            '<div class="invoice-scale-wrap-f">' +
            '<div class="admin-invoice-f" dir="rtl">' +
                '<div class="admin-invoice-f__band">' +
                    '<span class="admin-invoice-f__band-logo" dir="ltr">SANAA</span>' +
                    '<span class="admin-invoice-f__band-sub" dir="ltr">ONLINE SHOP</span>' +
                    (isAdminF ? '<span class="admin-invoice-f__band-type-f">فاکتور داخلی — فقط ادمین</span>' : '') +
                '</div>' +
                '<div class="admin-invoice-f__card">' +
                    '<div class="admin-invoice-f__meta">' +
                        '<div class="admin-invoice-f__meta-col">' +
                            '<p><span>مشتری :</span> ' + toPersianDigitsF(meta.customerName || '—') + '</p>' +
                            '<p><span>وضعیت پرداخت :</span> ' + (meta.paymentLabel || '—') + '</p>' +
                        '</div>' +
                        '<div class="admin-invoice-f__meta-col admin-invoice-f__meta-col--left">' +
                            '<p><span>شماره سفارش :</span> ' + toPersianDigitsF(meta.orderNumber || '—') + '</p>' +
                            '<p><span>تاریخ صدور :</span> ' + toPersianDigitsF(meta.date || '—') + '</p>' +
                        '</div>' +
                    '</div>' +
                    '<table class="admin-invoice-f__table">' +
                        '<thead>' + tableHeadHtml + '</thead>' +
                        '<tbody>' + itemRows + '</tbody>' +
                    '</table>' +
                    '<div class="admin-invoice-f__summary-wrap">' +
                        '<div class="admin-invoice-f__summary">' +
                            '<div class="invoice-summary-row-f"><span>جمع کل :</span><span>' + formatNumberF(calc.itemsRial) + ' ریال</span></div>' +
                            '<div class="invoice-summary-row-f"><span>هزینه باربری :</span><span>' + ((!isAdminF && !(Number(calc.shippingRial) > 0)) ? 'هزینه باربری اعلام خواهد شد.' : formatNumberF(calc.shippingRial) + ' ریال') + '</span></div>' +
                            '<div class="invoice-summary-row-f invoice-summary-total-f"><strong>مجموع کل</strong><strong>' + formatNumberF(calc.grandTotalRial) + ' ریال</strong></div>' +
                        '</div>' +
                        profitBlock +
                    '</div>' +
                '</div>' +
                '<div class="admin-invoice-f__footer">' +
                    '<p class="admin-invoice-f__thanks-f">با تشکر از خرید شما</p>' +
                    '<div class="admin-invoice-f__contact-f" dir="ltr">' +
                        '<p>instagram : sanaa.onlineshop</p>' +
                        '<p>phone: +98 915 579 3189</p>' +
                        '<p>website : sanaaonlineshop.com</p>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '</div>'
        );
    }


    /* ----------------------------------------------------------
     * Invoice modals — open/close/navigate/print
     * ---------------------------------------------------------- */

    // The invoice has a fixed design width (640px). Instead of letting the
    // modal scroll, the invoice is scaled down uniformly so that BOTH its
    // width and its height fit inside the modal panel, whatever the screen
    // size. The wrapper is resized to the scaled size so nothing is clipped
    // and no scrollbar appears.
    function fitInvoiceWrapF(wrap, modal) {

        var invoice = wrap.querySelector(".admin-invoice-f");

        if (!invoice) {
            return;
        }

        modal =
            modal ||
            wrap.closest(
                "#adminCustomerInvoiceModalF, #adminInternalInvoiceModalF"
            );

        var panel = modal ? modal.querySelector(".modal__panel") : null;

        // Measure the invoice at its natural size first.
        wrap.style.setProperty("display", "block", "important");
        wrap.style.setProperty("direction", "ltr", "important");
        wrap.style.setProperty("position", "relative", "important");
        wrap.style.setProperty("overflow", "hidden", "important");
        wrap.style.setProperty("margin", "0 auto", "important");
        wrap.style.setProperty("width", "auto", "important");
        wrap.style.setProperty("height", "auto", "important");

        invoice.style.setProperty("transform", "none", "important");
        invoice.style.setProperty("transform-origin", "top left", "important");
        invoice.style.setProperty("margin", "0", "important");

        var naturalWidth = invoice.offsetWidth;
        var naturalHeight = invoice.offsetHeight;

        if (!naturalWidth || !naturalHeight) {
            return;
        }

        var viewportWidth =
            window.innerWidth || document.documentElement.clientWidth || 1024;

        var viewportHeight =
            window.innerHeight || document.documentElement.clientHeight || 768;

        var availableWidth = viewportWidth - 24;
        var availableHeight = viewportHeight - 24;

        if (panel) {

            var panelStyle = window.getComputedStyle(panel);

            var padX =
                (parseFloat(panelStyle.paddingLeft) || 0) +
                (parseFloat(panelStyle.paddingRight) || 0);

            var padY =
                (parseFloat(panelStyle.paddingTop) || 0) +
                (parseFloat(panelStyle.paddingBottom) || 0);

            var actions = panel.querySelector(".admin-invoice-f__actions");

            var actionsHeight = 0;

            if (actions) {
                var actionsStyle = window.getComputedStyle(actions);
                actionsHeight =
                    actions.offsetHeight +
                    (parseFloat(actionsStyle.marginTop) || 0) +
                    (parseFloat(actionsStyle.marginBottom) || 0);
            }

            var panelMaxHeight = parseFloat(panelStyle.maxHeight);

            if (!isFinite(panelMaxHeight) || panelMaxHeight <= 0) {
                panelMaxHeight = viewportHeight;
            }

            panelMaxHeight = Math.min(panelMaxHeight, viewportHeight);

            availableWidth = panel.clientWidth - padX;
            availableHeight = panelMaxHeight - padY - actionsHeight - 2;
        }

        availableWidth = Math.max(200, availableWidth);
        availableHeight = Math.max(200, availableHeight);

        var scale = Math.min(
            1,
            availableWidth / naturalWidth,
            availableHeight / naturalHeight
        );

        // Never let a bad measurement produce an unusable scale.
        if (!isFinite(scale) || scale <= 0) {
            scale = 1;
        }

        invoice.style.setProperty("transform", "scale(" + scale + ")", "important");

        wrap.style.setProperty(
            "width",
            Math.floor(naturalWidth * scale) + "px",
            "important"
        );

        wrap.style.setProperty(
            "height",
            Math.ceil(naturalHeight * scale) + "px",
            "important"
        );
    }


    function fitInvoicesInModalF(modal) {

        if (!modal) {
            return;
        }

        var wraps = modal.querySelectorAll(".invoice-scale-wrap-f");

        wraps.forEach(function (wrap) {
            fitInvoiceWrapF(wrap, modal);
        });
    }


    function refitOpenInvoiceModalsF() {

        [
            "adminCustomerInvoiceModalF",
            "adminInternalInvoiceModalF"
        ].forEach(function (id) {

            var modal = document.getElementById(id);

            if (modal && !modal.hidden) {
                fitInvoicesInModalF(modal);
            }
        });
    }


    window.addEventListener("resize", function () {
        window.requestAnimationFrame(refitOpenInvoiceModalsF);
    });


    function openInvoiceModalF(id) {

        var modal = document.getElementById(id);

        if (!modal) {
            return;
        }

        modal.hidden = false;

        document.documentElement.style.setProperty("overflow", "hidden", "important");
        document.body.style.setProperty("overflow", "hidden", "important");

        // First layout pass.
        requestAnimationFrame(function () {

            fitInvoicesInModalF(modal);

            // Second pass after the modal has a real rendered size.
            requestAnimationFrame(function () {

                fitInvoicesInModalF(modal);

                // Images/fonts can slightly change invoice height.
                window.setTimeout(function () {
                    fitInvoicesInModalF(modal);
                }, 80);
            });
        });
    }


    function closeInvoiceModalF(id) {

        var modal = document.getElementById(id);

        if (modal) {
            modal.hidden = true;
        }

        var customerModal =
            document.getElementById("adminCustomerInvoiceModalF");

        var internalModal =
            document.getElementById("adminInternalInvoiceModalF");

        var invoiceModalStillOpen =
            (customerModal && !customerModal.hidden) ||
            (internalModal && !internalModal.hidden);

        if (!invoiceModalStillOpen) {
            document.documentElement.style.removeProperty("overflow");
            document.body.style.removeProperty("overflow");
        }
    }


    /* ----------------------------------------------------------
     * Printing — instead of hiding the rest of the admin page
     * with CSS, print the invoice markup alone inside a hidden
     * iframe with just the invoice stylesheet.
     * ---------------------------------------------------------- */

    var printBusyF = false;
    var printFrameF = null;

    function removePrintFrameF() {

        if (printFrameF && printFrameF.parentNode) {
            printFrameF.parentNode.removeChild(printFrameF);
        }

        printFrameF = null;
    }


    function printInvoiceF(containerId, fromDownloadF) {

        var content = document.getElementById(containerId);

        if (!content) {
            return Promise.resolve(false);
        }

        var printContent = content.cloneNode(true);

        // The invoice HTML contains its own modal-preview <style> block.
        // Remove only the cloned preview style so it doesn't override the
        // A4 print layout; the on-screen modal remains unchanged.
        var previewStyle = printContent.querySelector(
            "#admin-invoice-reference-style-f"
        );

        if (previewStyle) {
            previewStyle.remove();
        }

        var scaledInvoice = printContent.querySelector(".admin-invoice-f");

        if (scaledInvoice) {
            scaledInvoice.removeAttribute("style");
        }

        var scaleWrap = printContent.querySelector(".invoice-scale-wrap-f");

        if (scaleWrap) {
            scaleWrap.removeAttribute("style");
        }

        // Font URLs: prefer the ones injected by the Django template
        // (window.SANAA_FONTS_F); fall back to the default /static/fonts/ paths.
        var fontDefaults = {
            belleza: "/static/fonts/Belleza-Regular.woff2",
            vazirRegular: "/static/fonts/Vazirmatn-Regular.ttf",
            vazirMedium: "/static/fonts/Vazirmatn-Medium.ttf",
            vazirBold: "/static/fonts/Vazirmatn-Bold.ttf"
        };

        var fonts = Object.assign({}, fontDefaults, window.SANAA_FONTS_F || {});

        function absoluteUrlF(path) {
            return path ? window.location.origin + path : "";
        }

        var fontFaces =
            "@font-face{font-family:'Belleza';src:url('" + absoluteUrlF(fonts.belleza) + "') format('woff2');font-weight:400;font-display:block;}" +
            "@font-face{font-family:'Sanaa Persian';src:url('" + absoluteUrlF(fonts.vazirRegular) + "') format('truetype');font-weight:400;font-display:block;}" +
            "@font-face{font-family:'Sanaa Persian';src:url('" + absoluteUrlF(fonts.vazirMedium) + "') format('truetype');font-weight:500;font-display:block;}" +
            "@font-face{font-family:'Sanaa Persian';src:url('" + absoluteUrlF(fonts.vazirBold) + "') format('truetype');font-weight:700;font-display:block;}";

        var printCss = fontFaces +
            "html,body{margin:0;padding:0;background:#ffffff;}" +
            "body{font-family:'Sanaa Persian',Tahoma,Arial,sans-serif;color:#201B1D;-webkit-print-color-adjust:exact;print-color-adjust:exact;}" +
            ".admin-invoice-f{width:100%;max-width:640px;min-height:0;margin:0 auto;background:#F3EFE8;overflow:hidden;direction:rtl;}" +
            ".admin-invoice-f,.admin-invoice-f *{box-sizing:border-box;}" +
            ".admin-invoice-f__band{min-height:200px;padding:30px 16px 20px;display:flex;flex-direction:column;align-items:center;background:#B9C3B9;text-align:center;}" +
            ".admin-invoice-f__band-logo{font-family:'Belleza',Georgia,serif;font-size:46px;line-height:1;color:#A61579;letter-spacing:.13em;}" +
            ".admin-invoice-f__band-sub{margin-top:7px;font-family:'Belleza',Georgia,serif;font-size:16px;line-height:1;color:#A61579;letter-spacing:.25em;}" +
            ".admin-invoice-f__band-type-f{margin-top:10px;font-size:11px;color:#5C5356;font-weight:700;}" +
            ".admin-invoice-f__card{width:90%;min-height:0;margin:-50px auto 0;background:#fff;padding:0 12px 28px;page-break-inside:avoid;}" +
            ".admin-invoice-f__meta{min-height:0;padding:14px 0 13px;display:grid;grid-template-columns:1fr 1fr;gap:12px;border-bottom:1px solid #4B4748;font-size:12px;line-height:1.9;}" +
            ".admin-invoice-f__meta-col{display:flex;flex-direction:column;min-width:0;}" +
            ".admin-invoice-f__meta-col--left{text-align:left;}" +
            ".admin-invoice-f__meta-col p{margin:0;white-space:normal;overflow-wrap:anywhere;}" +
            ".admin-invoice-f__table{width:100%;margin:22px 0 0;border-collapse:collapse;table-layout:fixed;font-size:11px;}" +
            ".admin-invoice-f__table th{height:48px;padding:6px 3px;background:#A61579;color:#fff;border-left:1px solid #fff;font-size:11px;font-weight:700;text-align:center;vertical-align:middle;overflow-wrap:anywhere;}" +
            ".admin-invoice-f__table th:last-child{border-left:0;}" +
            ".admin-invoice-f__table th:nth-child(1){width:28%;}.admin-invoice-f__table th:nth-child(2){width:14%;}.admin-invoice-f__table th:nth-child(3){width:11%;}.admin-invoice-f__table th:nth-child(4){width:12%;}.admin-invoice-f__table th:nth-child(5){width:9%;}.admin-invoice-f__table th:nth-child(6){width:26%;}" +
            ".admin-invoice-f__table td{min-height:52px;height:52px;padding:7px 3px;border:0;text-align:center;vertical-align:middle;font-size:11px;overflow-wrap:anywhere;word-break:break-word;}" +
            ".admin-invoice-f__table td.invoice-item-name{text-align:right;}" +
            ".invoice-product-cell-f{display:flex;align-items:center;gap:6px;}" +
            ".invoice-product-cell-f__img{flex-shrink:0;width:30px;height:30px;border-radius:6px;object-fit:cover;}" +
            ".invoice-product-cell-f__img--empty-f{background:#F3EFE8;}" +
            ".invoice-product-cell-f__name{text-align:right;overflow-wrap:anywhere;}" +
            ".admin-invoice-f__table td.invoice-price{direction:rtl;white-space:normal;overflow-wrap:anywhere;}" +
            ".admin-invoice-f__summary-wrap{margin-top:28px;display:flex;flex-direction:column;align-items:stretch;}" +
            ".admin-invoice-f__summary{width:100%;max-width:360px;margin-right:auto;display:flex;flex-direction:column;gap:6px;}" +
            ".invoice-summary-row-f{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;line-height:1.65;direction:rtl;}" +
            ".invoice-summary-row-f span:last-child,.invoice-summary-row-f strong:last-child{white-space:nowrap;}" +
            ".invoice-summary-total-f{margin-top:10px;padding-top:11px;border-top:2px solid #4B4748;font-size:15px;font-weight:700;}" +
            ".invoice-profit-f{width:100%;max-width:360px;margin:18px auto 0 0;padding:10px 12px;border:1px dashed #A61579;background:#FBF2F8;}" +
            ".invoice-profit-title-f{margin-bottom:7px;color:#A61579;font-size:11px;font-weight:700;}" +
            ".admin-invoice-f__footer{width:90%;margin:0 auto;padding:22px 16px 24px;display:flex;flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;background:#F3EFE8;color:#A61579;}" +
            ".admin-invoice-f__contact-f{font-family:Arial,Tahoma,sans-serif;font-size:11px;line-height:1.7;text-align:left;}" +
            ".admin-invoice-f__contact-f p{margin:0;}" +
            ".admin-invoice-f__thanks-f{margin:0;font-size:17px;font-weight:700;text-align:right;white-space:normal;}" +
            "@media(min-width:701px){.admin-invoice-f{width:640px;}.admin-invoice-f__band{height:200px;min-height:200px;padding:42px 24px 26px;}.admin-invoice-f__band-logo{font-size:64px;letter-spacing:.16em;}.admin-invoice-f__band-sub{font-size:22px;letter-spacing:.34em;}.admin-invoice-f__card{width:90%;padding:0 18px 36px;}.admin-invoice-f__meta{min-height:92px;padding:17px 0 15px;display:flex;gap:30px;font-size:15px;line-height:1.8;}.admin-invoice-f__meta-col p{white-space:nowrap;}.admin-invoice-f__table{margin-top:30px;font-size:14px;}.admin-invoice-f__table th{height:64px;padding:8px 7px;font-size:15px;border-left:2px solid #fff;}.admin-invoice-f__table td{height:62px;padding:8px 7px;font-size:14px;}.admin-invoice-f__summary-wrap{margin-top:42px;align-items:flex-end;}.admin-invoice-f__summary,.invoice-profit-f{width:315px;max-width:none;}.admin-invoice-f__footer{min-height:120px;padding:28px 0 0;gap:30px;}.admin-invoice-f__contact-f{font-size:14px;}.admin-invoice-f__thanks-f{font-size:22px;}}" +
            "@media(max-width:360px){.admin-invoice-f__meta{grid-template-columns:1fr;gap:5px;}.admin-invoice-f__meta-col--left{text-align:right;}.admin-invoice-f__table,.admin-invoice-f__table td{font-size:10px;}.admin-invoice-f__table th{font-size:10px;padding-left:2px;padding-right:2px;}.invoice-summary-row-f{font-size:11px;}}" +
            "@page{size:A4 portrait;margin:0;}@media print{html,body{width:100%;background:#F3EFE8!important;}body{margin:0!important;padding:0!important;}.admin-invoice-f{width:640px!important;max-width:none!important;margin:0 auto!important;}.admin-invoice-f__band{height:200px!important;min-height:200px!important;padding:42px 24px 26px!important;}.admin-invoice-f__band-logo{font-size:64px!important;}.admin-invoice-f__band-sub{font-size:22px!important;}.admin-invoice-f__card{width:90%!important;padding:0 18px 36px!important;}.admin-invoice-f__meta{display:flex!important;min-height:92px!important;padding:17px 0 15px!important;gap:30px!important;font-size:15px!important;}.admin-invoice-f__meta-col p{white-space:nowrap!important;}.admin-invoice-f__table{margin-top:30px!important;font-size:14px!important;}.admin-invoice-f__table th{height:64px!important;padding:8px 7px!important;font-size:15px!important;}.admin-invoice-f__table td{height:62px!important;padding:8px 7px!important;font-size:14px!important;}.admin-invoice-f__summary-wrap{margin-top:42px!important;align-items:flex-end!important;}.admin-invoice-f__summary{width:315px!important;max-width:none!important;}.invoice-profit-f{width:100%!important;max-width:none!important;}.admin-invoice-f__footer{min-height:120px!important;padding:28px 0 0!important;gap:30px!important;}.admin-invoice-f__contact-f{font-size:14px!important;}.admin-invoice-f__thanks-f{font-size:22px!important;}}";

        // Admin invoice has 7 columns; the print stylesheet above only knows
        // the 6-column customer layout, so override the widths when needed.
        if (printContent.querySelectorAll(".admin-invoice-f__table thead th").length === 7) {
            printCss +=
                ".admin-invoice-f__table th:nth-child(1){width:22%;}" +
                ".admin-invoice-f__table th:nth-child(2){width:11%;}" +
                ".admin-invoice-f__table th:nth-child(3){width:8%;}" +
                ".admin-invoice-f__table th:nth-child(4){width:10%;}" +
                ".admin-invoice-f__table th:nth-child(5){width:7%;}" +
                ".admin-invoice-f__table th:nth-child(6){width:16%;}" +
                ".admin-invoice-f__table th:nth-child(7){width:26%;}";
        }

        // Print through a hidden iframe instead of window.open().
        if (printBusyF) {
            showToastF("فاکتور در حال آماده‌سازی برای چاپ است…", null);
            return Promise.resolve(false);
        }

        printBusyF = true;

        removePrintFrameF();

        var frame = document.createElement("iframe");
        frame.setAttribute("aria-hidden", "true");
        frame.setAttribute("tabindex", "-1");
        frame.style.cssText =
            "position:fixed;left:-10000px;top:0;width:794px;height:1123px;" +
            "border:0;visibility:hidden;pointer-events:none;";
        document.body.appendChild(frame);
        printFrameF = frame;

        var frameWin = frame.contentWindow;
        var frameDoc = frameWin.document;

        frameDoc.open();
        frameDoc.write(
            "<!DOCTYPE html><html lang=\"fa\" dir=\"rtl\"><head>" +
            "<meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
            "<base href=\"" + window.location.origin + "/\"><title>فاکتور — SANAA</title>" +
            "<style>" + printCss + "</style></head><body>" +
            printContent.outerHTML +
            "</body></html>"
        );
        frameDoc.close();

        return new Promise(function (resolve) {

            var finished = false;

            function finish(ok) {
                if (finished) return;
                finished = true;
                printBusyF = false;
                resolve(ok);
            }

            function waitWithTimeoutF(promise, ms) {
                return Promise.race([
                    promise,
                    new Promise(function (r) { window.setTimeout(r, ms); })
                ]);
            }

            var images = Array.prototype.slice.call(frameDoc.images || []);

            var imagePromises = images.map(function (img) {
                if (img.complete) return Promise.resolve();
                return new Promise(function (r) {
                    img.addEventListener("load", r, { once: true });
                    img.addEventListener("error", r, { once: true });
                });
            });

            var fontsPromise =
                frameDoc.fonts && frameDoc.fonts.ready
                    ? frameDoc.fonts.ready.catch(function () {})
                    : Promise.resolve();

            // Never wait more than 4s for fonts/images — a stuck asset must
            // not be able to lock the page.
            waitWithTimeoutF(
                Promise.all(imagePromises.concat([fontsPromise])),
                4000
            ).then(function () {

                window.setTimeout(function () {

                    try {

                        frameWin.addEventListener("afterprint", function () {
                            window.setTimeout(removePrintFrameF, 300);
                        }, { once: true });

                        frameWin.focus();
                        frameWin.print();

                        if (fromDownloadF) {
                            showToastF("پنجره چاپ باز شد؛ برای PDF گزینه «Save as PDF» را انتخاب کنید.", null);
                        }

                        // Safety net: drop the hidden frame even if the browser
                        // never fires "afterprint".
                        window.setTimeout(removePrintFrameF, 120000);

                        finish(true);

                    } catch (error) {

                        console.error("Print error:", error);
                        removePrintFrameF();
                        showToastF("چاپ فاکتور انجام نشد.", "error");
                        finish(false);
                    }

                }, 180);
            });
        });
    }


    function initInvoiceModalsF() {

        document.querySelectorAll("[data-invoice-close]").forEach(function (btn) {

            btn.addEventListener("click", function () {
                closeInvoiceModalF("adminCustomerInvoiceModalF");
                closeInvoiceModalF("adminInternalInvoiceModalF");
            });
        });


        document.querySelectorAll("[data-invoice-print]").forEach(function (btn) {

            btn.addEventListener("click", function () {
                var containerId = btn.dataset.invoicePrint;
                printInvoiceF(containerId);
            });
        });


        var goToAdminBtn = document.getElementById("adminGoToAdminInvoiceF");

        if (goToAdminBtn) {

            goToAdminBtn.addEventListener("click", function () {
                closeInvoiceModalF("adminCustomerInvoiceModalF");
                openInvoiceModalF("adminInternalInvoiceModalF");
            });
        }


        var backToCustomerBtn =
            document.getElementById("adminBackToCustomerInvoiceF");

        if (backToCustomerBtn) {

            backToCustomerBtn.addEventListener("click", function () {
                closeInvoiceModalF("adminInternalInvoiceModalF");
                openInvoiceModalF("adminCustomerInvoiceModalF");
            });
        }


        var finishBtn = document.getElementById("adminFinishInvoiceF");

        if (finishBtn) {

            finishBtn.addEventListener("click", function () {
                closeInvoiceModalF("adminCustomerInvoiceModalF");
                closeInvoiceModalF("adminInternalInvoiceModalF");
            });
        }
    }


    /* ----------------------------------------------------------
     * Searchable customer select
     *
     * The real <select id="adminNewOrderCustomerF"> (server-
     * rendered from {% for customer in customers %}) stays the
     * form's source of truth and is kept in the DOM, just hidden.
     * This layer only adds a filterable text input + list on top
     * of it; selecting an item sets the real select's value.
     * ---------------------------------------------------------- */

    function syncCustomerComboDisplayF() {

        var select = document.getElementById("adminNewOrderCustomerF");
        var searchInput = document.getElementById("adminNewOrderCustomerSearchF");

        if (!select || !searchInput) {
            return;
        }

        var selectedOption = select.options[select.selectedIndex];

        searchInput.value =
            selectedOption && selectedOption.value
                ? selectedOption.textContent.trim()
                : "";
    }


    function initSearchableCustomerSelectF() {

        var wrapper = document.getElementById("adminCustomerComboF");
        var select = document.getElementById("adminNewOrderCustomerF");
        var searchInput = document.getElementById("adminNewOrderCustomerSearchF");
        var list = document.getElementById("adminNewOrderCustomerListF");

        if (!wrapper || !select || !searchInput || !list) {
            return;
        }

        // Build a plain lookup of the server-rendered options once, up front.
        var options = Array.prototype.slice
            .call(select.options)
            .filter(function (option) {
                return option.value;
            })
            .map(function (option) {
                return {
                    value: option.value,
                    label: option.textContent.trim()
                };
            });


        function renderCustomerListF(query) {

            var normalized = (query || "").trim().toLowerCase();

            var matches =
                normalized
                    ? options.filter(function (option) {
                        return option.label.toLowerCase().indexOf(normalized) !== -1;
                    })
                    : options;

            list.innerHTML = "";

            if (!matches.length) {

                var empty = document.createElement("li");

                empty.className = "admin-searchable-select-f__empty";
                empty.textContent = "مشتری‌ای پیدا نشد.";

                list.appendChild(empty);

                return;
            }

            matches.forEach(function (option) {

                var item = document.createElement("li");

                item.className = "admin-searchable-select-f__item";
                item.textContent = option.label;

                item.addEventListener("mousedown", function (event) {

                    // mousedown (not click) so it fires before
                    // the search input's blur hides the list.
                    event.preventDefault();

                    select.value = option.value;
                    searchInput.value = option.label;

                    list.hidden = true;
                });

                list.appendChild(item);
            });
        }


        searchInput.addEventListener("focus", function () {
            renderCustomerListF(searchInput.value);
            list.hidden = false;
        });


        searchInput.addEventListener("input", function () {

            // Typing invalidates whatever was picked before
            // until a new option is chosen from the list.
            select.value = "";

            renderCustomerListF(searchInput.value);

            list.hidden = false;
        });


        searchInput.addEventListener("blur", function () {

            list.hidden = true;

            // If nothing valid was picked, don't leave stray typed text behind.
            if (!select.value) {
                searchInput.value = "";
            }
        });
    }


    /* ----------------------------------------------------------
     * New order form — wiring
     * ---------------------------------------------------------- */

    function initNewOrderF() {

        // Numeric fields outside dynamic item rows.
        prepareAllNumericInputsF();

        var editingOrderId = null;

        var openBtn = document.getElementById("adminNewOrderBtnF");
        var modal = document.getElementById("adminNewOrderModalF");
        var closeBtn = document.getElementById("adminNewOrderCloseF");
        var cancelBtn = document.getElementById("adminNewOrderCancelF");
        var form = document.getElementById("adminNewOrderFormF");
        var submitBtn = document.getElementById("adminSubmitInvoiceF");
        var errorEl = document.getElementById("adminNewOrderErrorF");

        if (!openBtn || !modal || !form) {
            return;
        }

        initOrderItemsF();


        function showFormErrorF(message) {

            if (!errorEl) {
                return;
            }

            errorEl.textContent = message;
            errorEl.hidden = !message;

            // Make sure the error is actually visible inside the modal.
            if (message && errorEl.scrollIntoView) {
                errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }


        // فیلد «وضعیت سفارش» فقط در حالت ویرایش نمایش داده می‌شود.
        function setStatusFieldF(visible, value) {

            var field = document.getElementById("adminNewOrderStatusFieldF");
            var select = document.getElementById("adminNewOrderStatusF");

            if (field) {
                field.hidden = !visible;
            }

            if (select && visible) {
                select.value = value || "registered";
            }
        }


        function closeNewOrderModal() {
            modal.hidden = true;
            editingOrderId = null;
        }


        function openNewOrderModal() {

            editingOrderId = null;

            form.reset();

            resetOrderItemsF();

            showFormErrorF("");

            setStatusFieldF(false);

            var title = document.getElementById("adminNewOrderTitleF");

            if (title) {
                title.textContent = "ثبت سفارش جدید";
            }

            if (submitBtn) {
                submitBtn.textContent = "ثبت فاکتور";
            }

            modal.hidden = false;
        }


        openEditOrderModalF = function (order) {

            if (!order) {
                return;
            }

            editingOrderId = order.id;

            form.reset();

            showFormErrorF("");

            var title = document.getElementById("adminNewOrderTitleF");

            if (title) {
                title.textContent = "ویرایش سفارش " + order.number;
            }

            if (submitBtn) {
                submitBtn.textContent = "ذخیره تغییرات";
            }

            var customerSelect =
                document.getElementById("adminNewOrderCustomerF");

            if (customerSelect) {
                customerSelect.value = String(order.customer.id);
                syncCustomerComboDisplayF();
            }

            var shippingInput =
                document.getElementById("adminNewOrderShippingF");

            if (shippingInput) {
                shippingInput.value = Number(order.shippingRial) || 0;
                formatNumericInputDisplayF(shippingInput);
            }

            var paymentInput =
                document.getElementById("adminNewOrderPaymentF");

            if (paymentInput) {
                paymentInput.value = order.paymentStatus || "pending";
            }

            setStatusFieldF(true, order.orderStatus);

            var container = document.getElementById("adminOrderItemsF");

            if (container) {

                container.innerHTML = "";

                var products =
                    Array.isArray(order.products) ? order.products : [];

                products.forEach(function (product) {

                    var row = createOrderItemRowF(product);

                    if (row) {
                        container.appendChild(row);
                    }
                });

                if (!products.length) {

                    var emptyRow = createOrderItemRowF();

                    if (emptyRow) {
                        container.appendChild(emptyRow);
                    }
                }
            }

            modal.hidden = false;

            updateOrderGrandTotalPreviewF();
        };


        openBtn.addEventListener("click", openNewOrderModal);

        if (closeBtn) {
            closeBtn.addEventListener("click", closeNewOrderModal);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener("click", closeNewOrderModal);
        }

        var backdrop = modal.querySelector(".modal__backdrop");

        if (backdrop) {
            backdrop.addEventListener("click", closeNewOrderModal);
        }


        ["adminNewOrderShippingF"].forEach(function (id) {

            var input = document.getElementById(id);

            if (input) {
                input.addEventListener("input", updateOrderGrandTotalPreviewF);
                input.addEventListener("change", updateOrderGrandTotalPreviewF);
            }
        });


        form.addEventListener("submit", function (event) {

            event.preventDefault();

            showFormErrorF("");

            var customerSelect =
                document.getElementById("adminNewOrderCustomerF");

            var shippingInput =
                document.getElementById("adminNewOrderShippingF");

            var paymentInput =
                document.getElementById("adminNewOrderPaymentF");

            var customer = customerSelect ? customerSelect.value : "";

            // FIX: parse the formatted (Persian digits + separators) value.
            var shippingRial =
                shippingInput ? parseNumericInputF(shippingInput.value) : 0;

            var paymentStatus =
                paymentInput ? paymentInput.value : "pending";

            // =========================
            // Customer validation
            // =========================

            if (!customer) {
                showFormErrorF("لطفاً مشتری سفارش را انتخاب کنید.");
                return;
            }

            // =========================
            // Items
            // =========================

            var itemsResult = readOrderItemsF();

            if (!itemsResult.items) {
                showFormErrorF(itemsResult.error);
                return;
            }

            var items = itemsResult.items;

            // =========================
            // Loading
            // =========================

            var isEditing = Boolean(editingOrderId);

            var originalLabel = submitBtn ? submitBtn.textContent : "";

            if (submitBtn) {

                submitBtn.disabled = true;

                submitBtn.textContent =
                    isEditing
                        ? "در حال ذخیره تغییرات..."
                        : "در حال ثبت سفارش...";
            }

            // =========================
            // Exchange rates
            // =========================

            fetchExchangeRatesF()

                .then(function (rates) {

                    var calc = buildInvoiceCalcF(items, rates, shippingRial);

                    // =====================
                    // FormData
                    // =====================

                    var formData = new FormData();

                    var csrfInput = form.querySelector(
                        'input[name="csrfmiddlewaretoken"]'
                    );

                    if (csrfInput) {
                        formData.append("csrfmiddlewaretoken", csrfInput.value);
                    }

                    formData.append("customer_id", customer);

                    formData.append("shipping_cost", String(shippingRial));

                    formData.append("payment_status", paymentStatus);

                    if (isEditing) {

                        var statusInput =
                            document.getElementById("adminNewOrderStatusF");

                        if (statusInput) {
                            formData.append("status", statusInput.value);
                        }
                    }

                    var usdItem = items.find(function (item) {
                        return item.currency === "USD" && Number(item.exchangeRate) > 0;
                    });

                    var usdRate = usdItem
                        ? Number(usdItem.exchangeRate)
                        : (rates && rates.USD ? rates.USD.rate : 0);

                    formData.append("usd_rate", String(usdRate));

                    // =====================
                    // Products
                    // =====================

                    var backendItems = items.map(function (item, index) {

                        var exchangeRate = Number(item.exchangeRate) || 0;

                        if (item.file) {
                            formData.append("item_photo_" + index, item.file);
                        }

                        return {
                            id: item.id || null,
                            product_name: item.name,
                            brand: item.brand,
                            size: item.size,
                            color: item.color || "",
                            description: item.description,
                            quantity: item.qty,
                            currency: item.currency,
                            product_price: item.price,
                            markup_percent: item.markup,
                            broker_percent: item.brokerPercent,
                            admin_percent: item.adminPercent,
                            tax_percent: item.taxPercent,
                            exchange_rate: exchangeRate,
                            service_cost: Number(item.serviceCost) || 0
                        };
                    });

                    formData.append("items", JSON.stringify(backendItems));

                    var requestUrl =
                        isEditing
                            ? buildOrderUrlF(
                                form.dataset.updateUrlTemplate,
                                editingOrderId
                            )
                            : form.dataset.createUrl;

                    console.log(
                        isEditing ? "Update order URL:" : "Create order URL:",
                        requestUrl
                    );

                    console.log("Customer ID:", customer);

                    console.log("Items:", backendItems);

                    // =====================
                    // Django request
                    // =====================

                    return fetch(requestUrl, {
                        method: "POST",
                        body: formData
                    })
                    .then(function (response) {

                        return response.text().then(function (text) {

                            var data = {};

                            try {
                                data = JSON.parse(text);
                            } catch (error) {
                                console.error("Invalid backend response:", text);
                            }

                            return {
                                ok: response.ok,
                                status: response.status,
                                data: data,
                                raw: text,
                                calc: calc
                            };
                        });
                    });
                })

                // =========================
                // Backend response
                // =========================

                .then(function (result) {

                    console.log(
                        isEditing
                            ? "Update order response:"
                            : "Create order response:",
                        result
                    );

                    if (!result.ok) {

                        var message =
                            result.data && result.data.message
                                ? result.data.message
                                : ("خطای سرور با کد " + result.status);

                        throw new Error(message);
                    }

                    if (!result.data || !result.data.order) {
                        throw new Error("اطلاعات سفارش از سرور دریافت نشد.");
                    }

                    var savedOrder = result.data.order;

                    var calc = result.calc;

                    // اطلاعات واقعی برگشتی Django جای Order قبلی را می‌گیرد.
                    replaceOrderF(savedOrder);

                    // =====================
                    // Invoice
                    // =====================

                    var paymentLabels = {
                        pending: "در انتظار پرداخت",
                        paid: "پرداخت‌شده",
                        partial: "پرداخت ناقص",
                        failed: "پرداخت ناموفق",
                        cancelled: "لغوشده"
                    };

                    var meta = {
                        orderNumber: savedOrder.number,
                        date: savedOrder.date,
                        customerName: savedOrder.customer.name,
                        paymentLabel:
                            paymentLabels[savedOrder.paymentStatus] ||
                            savedOrder.paymentStatus
                    };

                    var customerInvoiceEl =
                        document.getElementById("adminCustomerInvoiceF");

                    var adminInvoiceEl =
                        document.getElementById("adminInternalInvoiceF");

                    if (customerInvoiceEl) {
                        customerInvoiceEl.innerHTML =
                            renderInvoiceHtmlF(calc, meta, false);
                    }

                    if (adminInvoiceEl) {
                        adminInvoiceEl.innerHTML =
                            renderInvoiceHtmlF(calc, meta, true);
                    }

                    // =====================
                    // Reset filters
                    // =====================

                    filtersF = {
                        search: "",
                        orderStatus: "all",
                        paymentStatus: "all",
                        invoiceStatus: "all",
                        sort: "newest"
                    };

                    var searchInput =
                        document.getElementById("adminOrderSearchF");

                    if (searchInput) {
                        searchInput.value = "";
                    }

                    // لیست را دوباره از ordersF رندر کن
                    applyFiltersF();

                    closeNewOrderModal();

                    openInvoiceModalF("adminCustomerInvoiceModalF");

                    showToastF(
                        isEditing
                            ? ("سفارش " + savedOrder.number + " با موفقیت ویرایش شد.")
                            : ("سفارش " + savedOrder.number + " با موفقیت ثبت شد."),
                        "success"
                    );
                })

                .catch(function (error) {

                    console.error("Create / update order error:", error);

                    showFormErrorF(
                        error.message || "ذخیره سفارش انجام نشد."
                    );
                })

                // =========================
                // Finally
                // =========================

                .finally(function () {

                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalLabel;
                    }
                });
        });
    }


    /* ============================================================
     * INIT
     * ============================================================ */

    function initModalScrollLockF() {

        var modals = document.querySelectorAll(".modal");

        function sync() {
            var anyOpen = Array.prototype.some.call(modals, function (m) {
                return !m.hidden;
            });
            document.body.style.overflow = anyOpen ? "hidden" : "";
        }

        if (!window.MutationObserver) {
            return;
        }

        var observer = new MutationObserver(sync);

        modals.forEach(function (modal) {
            observer.observe(modal, {
                attributes: true,
                attributeFilter: ["hidden"]
            });
        });

        sync();
    }


    function initAdminOrdersF() {

        initModalScrollLockF();

        initToolbarF();

        initDetailsSheetF();

        initGlobalActionsF();

        initNewOrderF();

        initSearchableCustomerSelectF();

        initInvoiceModalsF();

        applyFiltersF();
    }


    if (document.readyState === "loading") {

        document.addEventListener("DOMContentLoaded", initAdminOrdersF);

    } else {

        initAdminOrdersF();
    }

})();