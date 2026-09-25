/* ============================================================
 * Admin Panel — Order Management
 * Standalone Orders Page
 * Vanilla JS only
 * Orders are loaded from Django / database
 * ============================================================ */

(function () {

    "use strict";

    const CURRENCY_FIELD_MAP_F = {
        USD: "unitPriceUsd",
        EUR: "unitPriceEur",
        TRY: "unitPriceTry",
        GBP: "unitPriceGbp",
        AED: "unitPriceAed"
    };
    /* ============================================================
     * EXCHANGE RATES
     * ============================================================ */

    var EXCHANGE_RATES_F = {

        USD: {
            label: "دلار",
            rate: 605000
        },

        TRY: {
            label: "لیر",
            rate: 18000
        },

        EUR: {
            label: "یورو",
            rate: 655000
        },

        GBP: {
            label: "پوند",
            rate: 765000
        },

        AED: {
            label: "درهم امارات",
            rate: 165000
        }

    };


    // Default increase percentage by currency. The value is copied into
    // each order item and remains editable, so old invoices keep their snapshot.
    var DEFAULT_MARKUP_F = {
        USD: 42,   // آمریکا / کانادا
        EUR: 25,   // آلمان / اسپانیا / ایتالیا
        TRY: 20,   // ترکیه
        AED: 25,   // دبی / عمان
        GBP: 0
    };


    /* ============================================================
     * ORDERS DATA — injected by Django via json_script
     * ============================================================ */

    var ordersF = [];

    var ordersDataElementF =
        document.getElementById(
            "orders-data-f"
        );

    if (ordersDataElementF) {

        try {

            var parsedOrdersF =
                JSON.parse(
                    ordersDataElementF.textContent
                );

            ordersF =
                Array.isArray(parsedOrdersF)
                    ? parsedOrdersF
                    : [];

        } catch (error) {

            console.error(
                "Could not parse orders data:",
                error
            );

            ordersF = [];
        }
    }


    function findOrderByNumberF(orderNumber) {

        return ordersF.find(
            function (order) {

                return (
                    order.number ===
                    orderNumber
                );

            }
        );
    }


    function replaceOrderF(savedOrder) {

        var index =
            ordersF.findIndex(
                function (order) {

                    return (
                        Number(order.id) ===
                        Number(savedOrder.id)
                    );

                }
            );


        if (index === -1) {

            ordersF.unshift(
                savedOrder
            );

        } else {

            ordersF[index] =
                savedOrder;
        }
    }


    function buildOrderUrlF(template, orderId) {

        if (!template) {
            return "";
        }

        return template.replace(
            "/0/",
            "/" + orderId + "/"
        );
    }


    function getCsrfTokenF() {

        var input =
            document.querySelector(
                'input[name="csrfmiddlewaretoken"]'
            );

        return input
            ? input.value
            : "";
    }


    function fetchJsonF(url, options) {

        return fetch(
            url,
            options
        )
        .then(function (response) {

            return response
                .text()
                .then(function (text) {

                    var data = {};

                    try {

                        data =
                            JSON.parse(
                                text
                            );

                    } catch (error) {

                        console.error(
                            "Invalid JSON response:",
                            text
                        );
                    }


                    if (!response.ok) {

                        throw new Error(
                            data.message ||
                            (
                                "خطای سرور: " +
                                response.status
                            )
                        );
                    }


                    return data;
                });

        });
    }


    var openEditOrderModalF =
        null;


    /* ============================================================
     * STATUS MAPS
     * ============================================================ */

    var ORDER_STATUS_F = {

        registered: {
            label: "ثبت‌شده",
            color: "neutral"
        },

        shipped: {
            label: "ارسال‌شده",
            color: "primary"
        },

        delivered: {
            label: "تحویل داده‌شده",
            color: "success"
        },

        cancelled: {
            label: "لغوشده",
            color: "danger"
        },


    };


    var PAYMENT_STATUS_F = {

        paid: {
            label: "پرداخت‌شده",
            color: "success"
        },

        pending: {
            label: "در انتظار پرداخت",
            color: "warning"
        },

        failed: {
            label: "پرداخت ناموفق",
            color: "danger"
        },

        partial: {
            label: "پرداخت ناقص",
            color: "warning"
        },

        cancelled: {
            label: "لغوشده",
            color: "danger"
        }

    };


    var INVOICE_STATUS_F = {

        issued: {
            label: "صادرشده",
            color: "success"
        },

        sent: {
            label: "ارسال‌شده",
            color: "primary"
        },

        waiting: {
            label: "در انتظار صدور",
            color: "warning"
        },

        error: {
            label: "خطا در تولید فاکتور",
            color: "danger"
        }

    };


    /* ============================================================
     * HELPERS
     * ============================================================ */

    function formatNumberF(value) {

        return Math.round(Number(value) || 0).toLocaleString("fa-IR");

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
                {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }
            ).format(
                new Date()
            );

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
        var calc =
            buildInvoiceCalcFromOrderF(order);

        var baseAmount =
            calc.lines.reduce(
                function (sum, line) {
                    return sum + line.lineForeign;
                },
                0
            );

        var codes =
            Object.keys(calc.byCurrency);

        var baseText =
            codes
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

        var totalRial =
            calc.itemsRial -
            (Number(order.discountRial) || 0) +
            (Number(order.shippingRial) || 0) +
            (Number(order.serviceRial) || 0);

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
            "<span>" +
            label +
            "</span>" +
            "<span>" +
            value +
            "</span>" +
            "</div>"
        );

    }


    /* ============================================================
     * TOAST
     * ============================================================ */

    function showToastF(message, type) {

        var region =
            document.getElementById("adminToastRegionF");

        if (!region) {
            return;
        }


        var toast =
            document.createElement("div");


        toast.className =
            "admin-toast-f" +
            (type
                ? " admin-toast-f--" + type + "-f"
                : "");


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

            "<span>" +
            message +
            "</span>";


        region.appendChild(toast);


        window.setTimeout(function () {

            toast.remove();

        }, 3200);

    }


    /* ============================================================
     * TABLE
     * ============================================================ */

    function productSummaryF(order) {

        var first =
            order.products[0].name;


        if (order.products.length > 1) {

            return (
                first +
                "<small>+ " +
                formatNumberF(
                    order.products.length - 1
                ) +
                " محصول دیگر</small>"
            );

        }


        return (
            first +
            "<small>تعداد: " +
            formatNumberF(
                order.products[0].qty
            ) +
            "</small>"
        );

    }


        function actionButtonsHtmlF(orderNumber) {
        return (
            '<button type="button" class="admin-icon-btn-f" ' +
            'data-view-order-f="' +
            orderNumber +
            '" ' +
            'aria-label="مشاهده جزئیات سفارش ' +
            orderNumber +
            '" ' +
            'title="مشاهده جزئیات">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/>' +
            "</svg>" +
            "</button>" +

            '<button type="button" class="admin-icon-btn-f admin-icon-btn-f--download-f" ' +
            'data-download-order-f="' +
            orderNumber +
            '" ' +
            'aria-label="دانلود PDF سفارش ' +
            orderNumber +
            '" ' +
            'title="دانلود PDF">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<path d="M12 3v12m0 0-4-4m4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" stroke-linecap="round" stroke-linejoin="round"/>' +
            "</svg>" +
            "</button>" +

            '<button type="button" class="admin-icon-btn-f admin-icon-btn-f--delete-f" ' +
            'data-delete-order-f="' +
            orderNumber +
            '" ' +
            'aria-label="حذف سفارش ' +
            orderNumber +
            '" ' +
            'title="حذف سفارش">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<path d="m19 7-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/>' +
            "</svg>" +
            "</button>"
        );
    }





    function tableRowHtmlF(order) {

        var totals =
            orderTotalsF(order);


        var currencyLabel =
            totals.currencyText;


        return (

            "<tr data-order-row-f=\"" +
            order.number +
            "\">" +


            "<td>" +
            order.number +
            "</td>" +


            "<td>" +
            order.customer.name +
            "</td>" +


            "<td>" +
            order.date +
            "</td>" +


            "<td>" +
            (
                totals.multiCurrency
                    ? totals.baseText
                    : formatForeignF(
                        totals.baseAmount
                    )
            ) +
            "</td>" +


            '<td class="admin-orders-f__col--secondary-f">' +
            currencyLabel +
            "</td>" +


                        '<td class="admin-orders-f__table-amount-rial">' +
            formatNumberF(
                totals.totalRial
            ) +
            " ریال</td>" +


            '<td class="admin-orders-f__table-profit-f">' +
            formatNumberF(
                totals.profitRial || 0
            ) +
            " ریال</td>" +


            "<td>" +
            badgeHtmlF(
                PAYMENT_STATUS_F,
                order.paymentStatus
            ) +
            "</td>" +


            "<td>" +
            badgeHtmlF(
                ORDER_STATUS_F,
                order.orderStatus
            ) +
            "</td>" +


            '<td class="admin-orders-f__col--secondary-f">' +
            badgeHtmlF(
                INVOICE_STATUS_F,
                order.invoiceStatus
            ) +
            "</td>" +


            "<td>" +

            '<div class="admin-orders-f__table-actions">' +

            actionButtonsHtmlF(
                order.number
            ) +

            "</div>" +

            "</td>" +

            "</tr>"

        );

    }


    /* ============================================================
     * MOBILE CARD
     * ============================================================ */

    function cardHtmlF(order) {

        var totals =
            orderTotalsF(order);


        return (

            '<li class="admin-orders-f__card" data-order-row-f="' +
            order.number +
            '">' +


            '<div class="admin-orders-f__card-top">' +

            '<span class="admin-orders-f__card-number">' +
            order.number +
            "</span>" +

            badgeHtmlF(
                ORDER_STATUS_F,
                order.orderStatus
            ) +

            "</div>" +


            '<div class="admin-orders-f__card-body">' +

            '<span class="admin-orders-f__card-customer">' +
            order.customer.name +
            "</span>" +


            '<span class="admin-orders-f__card-date">' +
            order.date +
            "</span>" +


                        '<span class="admin-orders-f__card-amount">' +
            formatNumberF(
                totals.totalRial
            ) +
            " ریال</span>" +

            '<span class="admin-orders-f__card-profit-f">' +
            "سود: " +
            formatNumberF(
                totals.profitRial || 0
            ) +
            " ریال</span>" +

            "</div>" +



            '<span class="admin-orders-f__card-payment">' +

            badgeHtmlF(
                PAYMENT_STATUS_F,
                order.paymentStatus
            ) +

            "</span>" +


            '<div class="admin-orders-f__card-actions">' +

            actionButtonsHtmlF(
                order.number
            ) +

            "</div>" +

            "</div>" +

            "</li>"

        );

    }


    /* ============================================================
     * STATES + RENDER
     * ============================================================ */

    function setStateF(state) {

        [
            "Loading",
            "Empty",
            "Error"
        ].forEach(function (name) {

            var element =
                document.getElementById(
                    "adminOrders" +
                    name +
                    "F"
                );


            if (element) {

                element.hidden =
                    state !==
                    name.toLowerCase();

            }

        });


        var tableWrap =
            document.getElementById(
                "adminOrdersTableWrapF"
            );


        var cardsWrap =
            document.getElementById(
                "adminOrdersCardsF"
            );


        var show =
            !state;


        if (tableWrap) {

            tableWrap.style.display =
                show ? "" : "none";

        }


        if (cardsWrap) {

            cardsWrap.style.display =
                show ? "" : "none";

        }

    }


    function renderListF(orders) {

        var tbody =
            document.getElementById(
                "adminOrdersTableBodyF"
            );


        var cards =
            document.getElementById(
                "adminOrdersCardsF"
            );


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

            tbody.innerHTML =
                orders
                    .map(tableRowHtmlF)
                    .join("");

        }


        if (cards) {

            cards.innerHTML =
                orders
                    .map(cardHtmlF)
                    .join("");

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

        var filtered = ordersF.filter(
            function (order) {

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

                    var q =
                        filtersF.search
                            .toLowerCase()
                            .trim();

                    var orderNumber =
                        order.number
                            ? String(order.number).toLowerCase()
                            : "";

                    var customerName =
                        order.customer &&
                        order.customer.name
                            ? String(
                                order.customer.name
                            ).toLowerCase()
                            : "";

                    var matchesProduct =
                        Array.isArray(order.products)
                            ? order.products.some(
                                function (product) {

                                    var productName =
                                        product &&
                                        product.name
                                            ? String(
                                                product.name
                                            ).toLowerCase()
                                            : "";

                                    return (
                                        productName.indexOf(q) !== -1
                                    );
                                }
                            )
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
            }
        );

        // یک کپی برای sort
        var sorted = filtered.slice();

        switch (filtersF.sort) {

            case "oldest":

                sorted.reverse();

                break;


            case "amount-desc":

                sorted.sort(
                    function (a, b) {

                        return (
                            orderTotalsF(b).totalRial -
                            orderTotalsF(a).totalRial
                        );
                    }
                );

                break;


            case "amount-asc":

                sorted.sort(
                    function (a, b) {

                        return (
                            orderTotalsF(a).totalRial -
                            orderTotalsF(b).totalRial
                        );
                    }
                );

                break;


            case "last-changed":

                sorted.sort(
                    function (a, b) {

                        var aDate =
                            a.lastChangeDate || "";

                        var bDate =
                            b.lastChangeDate || "";

                        if (aDate < bDate) {
                            return 1;
                        }

                        if (aDate > bDate) {
                            return -1;
                        }

                        return 0;
                    }
                );

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

        var searchInput =
            document.getElementById(
                "adminOrderSearchF"
            );


        var orderStatusSelect =
            document.getElementById(
                "adminOrderStatusFilterF"
            );


        var paymentStatusSelect =
            document.getElementById(
                "adminPaymentStatusFilterF"
            );


        var invoiceStatusSelect =
            document.getElementById(
                "adminInvoiceStatusFilterF"
            );


        var sortSelect =
            document.getElementById(
                "adminOrderSortF"
            );


        var exportBtn =
            document.getElementById(
                "adminExportOrdersF"
            );


        var filtersToggle =
            document.getElementById(
                "adminFiltersToggleF"
            );


        var filtersPanel =
            document.getElementById(
                "adminFiltersPanelF"
            );


        if (searchInput) {

            searchInput.addEventListener(
                "input",
                function () {

                    filtersF.search =
                        searchInput.value.trim();

                    applyFiltersF();

                }
            );

        }


        if (orderStatusSelect) {

            orderStatusSelect.addEventListener(
                "change",
                function () {

                    filtersF.orderStatus =
                        orderStatusSelect.value;

                    applyFiltersF();

                }
            );

        }


        if (paymentStatusSelect) {

            paymentStatusSelect.addEventListener(
                "change",
                function () {

                    filtersF.paymentStatus =
                        paymentStatusSelect.value;

                    applyFiltersF();

                }
            );

        }


        if (invoiceStatusSelect) {

            invoiceStatusSelect.addEventListener(
                "change",
                function () {

                    filtersF.invoiceStatus =
                        invoiceStatusSelect.value;

                    applyFiltersF();

                }
            );

        }


        if (sortSelect) {

            sortSelect.addEventListener(
                "change",
                function () {

                    filtersF.sort =
                        sortSelect.value;

                    applyFiltersF();

                }
            );

        }


        
        if (exportBtn) {

            exportBtn.addEventListener(
                "click",
                exportOrdersCsvF
            );

        }


                if (
            filtersToggle &&
            filtersPanel
        ) {

            filtersToggle.addEventListener(
                "click",
                function () {

                    var willOpen =
                        !filtersPanel.classList.contains(
                            "is-open-f"
                        );


                    filtersPanel.classList.toggle(
                        "is-open-f",
                        willOpen
                    );


                    filtersToggle.classList.toggle(
                        "is-active-f",
                        willOpen
                    );


                    filtersToggle.setAttribute(
                        "aria-expanded",
                        String(willOpen)
                    );

                }
            );

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


        


        ordersF.forEach(
            function (order) {

                var totals =
                    orderTotalsF(order);

                rows.push(
                    [
                        order.number || "",
                        order.customer
                            ? order.customer.name || ""
                            : "",
                        order.date || "",
                        Math.round(
                            totals.totalRial
                        ),
                        PAYMENT_STATUS_F[
                            order.paymentStatus
                        ]
                            ? PAYMENT_STATUS_F[
                                order.paymentStatus
                            ].label
                            : order.paymentStatus || "",
                        ORDER_STATUS_F[
                            order.orderStatus
                        ]
                            ? ORDER_STATUS_F[
                                order.orderStatus
                            ].label
                            : order.orderStatus || ""
                    ]
                );

            }
        );


        var csv =
            rows.map(
                function (row) {

                    return row
                        .map(
                            function (cell) {

                                return (
                                    '"' +
                                    String(cell)
                                        .replace(
                                            /"/g,
                                            '""'
                                        ) +
                                    '"'
                                );

                            }
                        )
                        .join(",");

                }
            )
            .join("\n");


        var blob =
            new Blob(
                ["\uFEFF" + csv],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        var url =
            URL.createObjectURL(blob);


        var link =
            document.createElement("a");


        link.href = url;

        link.download =
            "orders-export.csv";


        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(url);


        showToastF(
            "خروجی سفارش‌ها دانلود شد.",
            "success"
        );

    }


    /* ============================================================
     * DETAILS SHEET
     * ============================================================ */

    function renderDetailsSheetF(order) {

        var totals =
            orderTotalsF(order);


        var currencyLabel =
            EXCHANGE_RATES_F[
                order.currency
            ].label;


        document.getElementById(
            "adminSheetTitleF"
        ).textContent =
            "سفارش " +
            order.number;


        document.getElementById(
            "adminSheetBasicF"
        ).innerHTML =

            sheetRowF(
                "شماره سفارش",
                order.number
            )

            +

            sheetRowF(
                "تاریخ ثبت",
                order.date
            )

            +

            sheetRowF(
                "تاریخ آخرین تغییر",
                order.lastChangeDate
            )

            +

            sheetRowF(
                "وضعیت سفارش",
                badgeHtmlF(
                    ORDER_STATUS_F,
                    order.orderStatus
                )
            )

            +

            sheetRowF(
                "وضعیت فاکتور",
                badgeHtmlF(
                    INVOICE_STATUS_F,
                    order.invoiceStatus
                )
            );


        document.getElementById(
            "adminSheetCustomerF"
        ).innerHTML =

            sheetRowF(
                "نام و نام خانوادگی",
                order.customer.name
            )

            +

            sheetRowF(
                "شماره تماس",
                '<span dir="ltr">' +
                order.customer.phone +
                "</span>"
            )

            +

            sheetRowF(
                "آدرس",
                order.customer.address
            )

            +

            (
                order.customer.note
                    ?
                    sheetRowF(
                        "اطلاعات تکمیلی",
                        order.customer.note
                    )
                    :
                    ""
            );


        document.getElementById(
            "adminSheetProductsF"
        ).innerHTML =

            order.products
                .map(
                    function (product, index) {

                        var line =
                            totals.lines[index];

                        var lineCurrencyLabel =
                            EXCHANGE_RATES_F[line.currency]
                                ? EXCHANGE_RATES_F[line.currency].label
                                : line.currency;

                        function cellF(label, value, full, strong) {
                            return (
                                '<div class="admin-orders-f__sheet-product-cell' +
                                (full ? ' admin-orders-f__sheet-product-cell--full-f' : '') +
                                (strong ? ' admin-orders-f__sheet-product-cell--strong-f' : '') +
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
                                    cellF("تعداد", formatNumberF(line.qty)) +
                                    cellF("قیمت پایه", formatForeignF(line.price) + " " + lineCurrencyLabel) +
                                    cellF("نرخ ارز", formatNumberF(line.rate) + " ریال") +
                                    cellF("درصد افزایش", formatNumberF(line.markup) + "٪") +
                                    cellF("نرخ بعد از افزایش", formatNumberF(line.adjustedRate) + " ریال") +
                                    cellF("قیمت واحد", formatNumberF(line.finalUnitRial) + " ریال") +
                                    (product.description ? cellF("توضیحات", product.description, true) : "") +
                                    cellF("قیمت کل", formatNumberF(line.lineRial) + " ریال", true, true) +
                                    cellF("سود این محصول", formatNumberF(line.profit) + " ریال", true, true) +
                                "</dl>" +
                            "</div>"
                        );
                    }
                )
                .join("")

            +

                        +

            '<div class="admin-orders-f__sheet-row">' +

            "<span>مبلغ کل محصولات</span>" +

            "<span>" +

            formatNumberF(
                totals.productsRial
            ) +


            " ریال</span>" +

            "</div>"

            +

            '<div class="admin-orders-f__sheet-row admin-orders-f__sheet-row--profit-f">' +

            "<span>سود کل سفارش</span>" +

            "<span>" +

            formatNumberF(
                totals.profitRial || 0
            ) +

            " ریال</span>" +

            "</div>"

            +

            '<div class="admin-orders-f__sheet-row">' +

            "<span>هزینه باربری</span>" +

            "<span>" +

            (
                order.shippingRial
                    ?
                    formatNumberF(
                        order.shippingRial
                    ) +
                    " ریال"
                    :
                    "ندارد"
            ) +

            "</span>" +

            "</div>"

            +

            '<div class="admin-orders-f__sheet-row">' +

            "<span>هزینه خدمات</span>" +

            "<span>" +

            (
                order.serviceRial
                    ?
                    formatNumberF(
                        order.serviceRial
                    ) +
                    " ریال"
                    :
                    "رایگان"
            ) +

            "</span>" +

            "</div>";


        document.getElementById(
                "adminSheetFinancialF"
            ).innerHTML =

            sheetRowF(
                "مبلغ به ارز مبنا",
                totals.baseText
            )

            +

            sheetRowF(
                "نوع ارز",
                totals.currencyText
            )

            +

            sheetRowF(
                "نرخ تبدیل ارز",
                formatNumberF(
                    totals.rate
                ) +
                " ریال"
            )

            +

            sheetRowF(
                "مبلغ ریالی",
                formatNumberF(
                    totals.totalRial
                ) +
                " ریال"
            )

            +

            sheetRowF(
                "مبلغ پرداخت‌شده",
                order.payment.paidRial === null
                    ?
                    formatNumberF(
                        totals.totalRial
                    ) +
                    " ریال"
                    :
                    formatNumberF(
                        order.payment.paidRial
                    ) +
                    " ریال"
            )

            +

            sheetRowF(
                "مبلغ باقی‌مانده",
                order.payment.remainingRial === null
                    ?
                    formatNumberF(
                        totals.totalRial -
                        (order.payment.paidRial || 0)
                    ) +
                    " ریال"
                    :
                    formatNumberF(
                        order.payment.remainingRial
                    ) +
                    " ریال"
            );


        document.getElementById(
            "adminSheetPaymentF"
        ).innerHTML =

            sheetRowF(
                "وضعیت پرداخت",
                badgeHtmlF(
                    PAYMENT_STATUS_F,
                    order.paymentStatus
                )
            )

            +

            sheetRowF(
                "روش پرداخت",
                order.payment.method
            )

            +

            sheetRowF(
                "کد پیگیری",
                '<span dir="ltr">' +
                order.payment.trackingCode +
                "</span>"
            )

            +

            sheetRowF(
                "تاریخ پرداخت",
                order.payment.paidDate
            );


        var statusSelect =
            document.getElementById(
                "adminSheetStatusSelectF"
            );


        if (statusSelect) {

            statusSelect.value =
                order.orderStatus;

        }

    }


    /* ============================================================
     * PDF BACKEND HOOK
     * ============================================================ */

    function invoiceApiEndpointF(
        orderNumber
    ) {

        return (
            "/api/orders/" +
            encodeURIComponent(
                orderNumber
            ) +
            "/invoice"
        );

    }


    function fetchInvoicePdfBlobF(
        orderNumber
    ) {

        return new Promise(
            function (resolve, reject) {

                window.setTimeout(
                    function () {

                        reject(
                            new Error(
                                "invoice_backend_not_connected"
                            )
                        );

                    },
                    700
                );

            }
        );

    }


    function buildInvoiceCalcFromOrderF(order) {

        var products =
            Array.isArray(order.products)
                ? order.products
                : [];

        var items = products.map(function (product) {

            return {
                name: product.name || "",
                brand: product.brand || "",
                size: product.size || "",
                description: product.description || "",
                image: product.image || "",
                qty: Number(product.qty) || 1,
                currency: product.currency || order.currency || "USD",
                price: baseUnitPriceF(product),
                markup: Number(product.markupPercent) || 0,
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
            Number(order.shippingRial) || 0,
            Number(order.serviceRial) || 0
        );
    }


    function renderCustomerInvoiceForOrderF(order) {

        var invoice =
            document.getElementById(
                "adminCustomerInvoiceF"
            );

        if (!invoice) {
            return false;
        }

        var calc =
            buildInvoiceCalcFromOrderF(order);

        var paymentEntry =
            PAYMENT_STATUS_F[
                order.paymentStatus
            ];

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

        invoice.innerHTML =
            renderInvoiceHtmlF(
                calc,
                meta,
                false
            );

        return true;
    }


    function downloadOrderF(
        orderNumber
    ) {

        // Ignore extra clicks while a print job is being prepared/open.
        if (printBusyF) {
            return;
        }

        var order =
            findOrderByNumberF(
                orderNumber
            );

        if (!order) {
            showToastF(
                "سفارش پیدا نشد.",
                "error"
            );
            return;
        }

        var triggers =
            document.querySelectorAll(
                '[data-download-order-f="' +
                orderNumber +
                '"]'
            );

        function setBusyF(isBusy) {
            triggers.forEach(
                function (button) {
                    if (isBusy) {
                        button.setAttribute("aria-busy", "true");
                    } else {
                        button.removeAttribute("aria-busy");
                    }
                    button.disabled = isBusy;
                }
            );
        }

        setBusyF(true);

        var job;

        try {

            var rendered =
                renderCustomerInvoiceForOrderF(
                    order
                );

            if (!rendered) {
                throw new Error(
                    "نمایش فاکتور مشتری پیدا نشد."
                );
            }

            // PDF مشتری دقیقاً از همان DOM و طراحی مرجع ساخته می‌شود.
            job = printInvoiceF(
                "adminCustomerInvoiceF",
                true
            );

        } catch (error) {

            console.error(
                "Customer invoice PDF error:",
                error
            );

            showToastF(
                error.message ||
                "ساخت فاکتور مشتری انجام نشد.",
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

        var modal =
            document.getElementById(
                "adminOrderDetailsModalF"
            );


        var closeBtn =
            document.getElementById(
                "adminSheetCloseF"
            );


        var downloadBtn =
            document.getElementById(
                "adminSheetDownloadF"
            );


        var editBtn =
            document.getElementById(
                "adminSheetEditF"
            );


        var statusBtn =
            document.getElementById(
                "adminSheetStatusBtnF"
            );


        var statusSelect =
            document.getElementById(
                "adminSheetStatusSelectF"
            );


        if (!modal) {
            return;
        }


        var activeOrderNumber =
            null;


        openDetailsSheetF =
            function (orderNumber) {

                var order =
                    ordersF.filter(
                        function (item) {

                            return (
                                item.number ===
                                orderNumber
                            );

                        }
                    )[0];


                if (!order) {
                    return;
                }


                activeOrderNumber =
                    orderNumber;

                if (downloadBtn) {
                    downloadBtn.setAttribute(
                        "data-download-order-f",
                        order.number
                    );
                }

                renderDetailsSheetF(
                    order
                );


                modal.hidden =
                    false;

            };


        function closeModal() {

            modal.hidden =
                true;

            activeOrderNumber =
                null;

        }


        if (closeBtn) {

            closeBtn.addEventListener(
                "click",
                closeModal
            );

        }


        var backdrop =
            modal.querySelector(
                ".modal__backdrop"
            );


        if (backdrop) {

            backdrop.addEventListener(
                "click",
                closeModal
            );

        }


        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape" &&
                    !modal.hidden
                ) {

                    closeModal();

                }

            }
        );


        if (downloadBtn) {

            downloadBtn.addEventListener(
                "click",
                function () {

                    if (
                        activeOrderNumber
                    ) {

                        downloadOrderF(
                            activeOrderNumber
                        );

                    }

                }
            );

        }


        if (editBtn) {

            editBtn.addEventListener(
                "click",
                function () {

                    if (
                        !activeOrderNumber
                    ) {
                        return;
                    }


                    var order =
                        findOrderByNumberF(
                            activeOrderNumber
                        );


                    if (!order) {

                        showToastF(
                            "سفارش پیدا نشد.",
                            "error"
                        );

                        return;
                    }


                    if (
                        !openEditOrderModalF
                    ) {
                        return;
                    }


                    closeModal();


                    openEditOrderModalF(
                        order
                    );

                }
            );

        }


        if (statusBtn) {

            statusBtn.addEventListener(
                "click",
                function () {

                    if (!activeOrderNumber || !statusSelect) {
                        return;
                    }

                    var order =
                        findOrderByNumberF(activeOrderNumber);

                    if (!order) {
                        showToastF("سفارش پیدا نشد.", "error");
                        return;
                    }

                    var form =
                        document.getElementById("adminNewOrderFormF");

                    var urlTemplate =
                        form && form.dataset
                            ? form.dataset.statusUrlTemplate
                            : "";

                    var requestUrl =
                        buildOrderUrlF(urlTemplate, order.id);

                    if (!requestUrl) {
                        showToastF("آدرس بروزرسانی وضعیت پیدا نشد.", "error");
                        return;
                    }

                    var formData = new FormData();
                    formData.append("status", statusSelect.value);
                    formData.append("csrfmiddlewaretoken", getCsrfTokenF());

                    statusBtn.disabled = true;

                    fetchJsonF(
                        requestUrl,
                        {
                            method: "POST",
                            body: formData
                        }
                    )
                    .then(function (data) {

                        if (!data || !data.order) {
                            throw new Error("پاسخ سرور معتبر نیست.");
                        }

                        replaceOrderF(data.order);
                        activeOrderNumber = data.order.number;

                        renderDetailsSheetF(data.order);
                        applyFiltersF();

                        showToastF(
                            "وضعیت سفارش بروزرسانی شد.",
                            "success"
                        );
                    })
                    .catch(function (error) {
                        showToastF(
                            error.message || "بروزرسانی وضعیت انجام نشد.",
                            "error"
                        );
                    })
                    .finally(function () {
                        statusBtn.disabled = false;
                    });

                }
            );

        }



    }


    /* ============================================================
     * MENUS + GLOBAL ACTIONS
     * ============================================================ */

    function closeAllMenusF() {

        document
            .querySelectorAll(
                "[data-more-menu-panel-f]"
            )
            .forEach(
                function (panel) {

                    panel.hidden =
                        true;

                }
            );


        document
            .querySelectorAll(
                "[data-more-menu-btn-f]"
            )
            .forEach(
                function (button) {

                    button.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }
            );

    }


    function initGlobalActionsF() {

        document.addEventListener(
            "click",
            function (event) {


                var moreBtn =
                    event.target.closest(
                        "[data-more-menu-btn-f]"
                    );


                if (moreBtn) {

                    var orderNumber =
                        moreBtn.getAttribute(
                            "data-more-menu-btn-f"
                        );


                    var panel =
                        document.querySelector(
                            '[data-more-menu-panel-f="' +
                            orderNumber +
                            '"]'
                        );


                    if (!panel) {
                        return;
                    }


                    var wasHidden =
                        panel.hidden;


                    closeAllMenusF();


                    panel.hidden =
                        !wasHidden;


                    moreBtn.setAttribute(
                        "aria-expanded",
                        String(!wasHidden)
                    );


                    return;

                }


                var downloadTrigger =
                    event.target.closest(
                        "[data-download-order-f]"
                    );


                if (downloadTrigger) {

                    downloadOrderF(
                        downloadTrigger.getAttribute(
                            "data-download-order-f"
                        )
                    );


                    closeAllMenusF();

                    return;

                }


                var editTrigger =
                    event.target.closest(
                        "[data-edit-order-f]"
                    );


                if (editTrigger) {

                    var orderNumber =
                        editTrigger.getAttribute(
                            "data-edit-order-f"
                        );


                    var order =
                        findOrderByNumberF(
                            orderNumber
                        );


                    closeAllMenusF();


                    if (!order) {

                        showToastF(
                            "سفارش پیدا نشد.",
                            "error"
                        );

                        return;
                    }


                    if (
                        openEditOrderModalF
                    ) {

                        openEditOrderModalF(
                            order
                        );
                    }


                    return;
                }


                var resendTrigger =
                    event.target.closest(
                        "[data-resend-invoice-f]"
                    );


                if (resendTrigger) {

                    showToastF(
                        "ارسال مجدد فاکتور هنوز به بک‌اند متصل نشده است.",
                        "error"
                    );


                    closeAllMenusF();

                    return;

                }


                var deleteTrigger =
                    event.target.closest(
                        "[data-delete-order-f]"
                    );


                if (deleteTrigger) {

                    var orderNumber =
                        deleteTrigger.getAttribute(
                            "data-delete-order-f"
                        );


                    var order =
                        findOrderByNumberF(
                            orderNumber
                        );


                    closeAllMenusF();


                    if (!order) {

                        showToastF(
                            "سفارش پیدا نشد.",
                            "error"
                        );

                        return;
                    }


                    var confirmed =
                        window.confirm(
                            "آیا از حذف کامل سفارش " +
                            order.number +
                            " مطمئن هستید؟\n" +
                            "این عملیات قابل بازگشت نیست."
                        );


                    if (!confirmed) {
                        return;
                    }


                    var form =
                        document.getElementById(
                            "adminNewOrderFormF"
                        );


                    if (!form) {

                        showToastF(
                            "فرم سفارش پیدا نشد.",
                            "error"
                        );

                        return;
                    }


                    var deleteUrl =
                        buildOrderUrlF(
                            form.dataset
                                .deleteUrlTemplate,
                            order.id
                        );


                    var formData =
                        new FormData();


                    formData.append(
                        "csrfmiddlewaretoken",
                        getCsrfTokenF()
                    );


                    fetchJsonF(
                        deleteUrl,
                        {
                            method: "POST",
                            body: formData
                        }
                    )

                    .then(function () {

                        // فقط بعد از حذف موفق در Django
                        // از لیست مرورگر هم حذف می‌کنیم.
                        ordersF =
                            ordersF.filter(
                                function (item) {

                                    return (
                                        Number(item.id) !==
                                        Number(order.id)
                                    );

                                }
                            );


                        applyFiltersF();


                        showToastF(
                            "سفارش " +
                            order.number +
                            " با موفقیت حذف شد.",
                            "success"
                        );

                    })

                    .catch(function (error) {

                        console.error(
                            "Delete order error:",
                            error
                        );


                        showToastF(
                            error.message ||
                            "حذف سفارش انجام نشد.",
                            "error"
                        );

                    });


                    return;
                }


                var viewTrigger =
                    event.target.closest(
                        "[data-view-order-f]"
                    );


                if (viewTrigger) {

                    if (openDetailsSheetF) {

                        openDetailsSheetF(
                            viewTrigger.getAttribute(
                                "data-view-order-f"
                            )
                        );

                    }


                    closeAllMenusF();

                    return;

                }


                var row =
                    event.target.closest(
                        "[data-order-row-f]"
                    );


                if (
                    row &&
                    !event.target.closest(
                        ".admin-menu-f"
                    ) &&
                    !event.target.closest(
                        "button"
                    )
                ) {

                    if (openDetailsSheetF) {

                        openDetailsSheetF(
                            row.getAttribute(
                                "data-order-row-f"
                            )
                        );

                    }

                    return;

                }


                if (
                    !event.target.closest(
                        ".admin-menu-f"
                    )
                ) {

                    closeAllMenusF();

                }

            }
        );

    }


    /* ============================================================
     * NEW ORDER
     * ============================================================ */

    /* ----------------------------------------------------------
     * Item rows (image upload, price+currency, qty stepper,
     * remove) — cloned from <template id="adminOrderItemTemplateF">
     * ---------------------------------------------------------- */

    function createOrderItemRowF(
        product
    ) {

        var template =
            document.getElementById(
                "adminOrderItemTemplateF"
            );


        if (!template) {
            return null;
        }


        var row =
            template
                .content
                .firstElementChild
                .cloneNode(true);


        var removeBtn =
            row.querySelector(
                ".admin-order-item-f__remove"
            );


        var fileInput =
            row.querySelector(
                ".admin-order-item-f__file-input"
            );


        var preview =
            row.querySelector(
                ".admin-order-item-f__preview"
            );


        var nameInput =
            row.querySelector(
                ".admin-order-item-f__name"
            );


        var priceInput =
            row.querySelector(
                ".admin-order-item-f__price"
            );


        var currencyInput =
            row.querySelector(
                ".admin-order-item-f__currency"
            );

        var markupInput =
            row.querySelector(
                ".admin-order-item-f__markup"
            );

        var exchangeRateInput =
            row.querySelector(
                ".admin-order-item-f__exchange-rate"
            );

        var afterMarkupOutput =
            row.querySelector(
                ".admin-order-item-f__after-markup"
            );

        var baseRialOutput =
            row.querySelector(
                ".admin-order-item-f__base-rial"
            );

        var unitRialOutput =
            row.querySelector(
                ".admin-order-item-f__unit-rial"
            );


        var brandInput =
            row.querySelector(
                ".admin-order-item-f__brand"
            );


        var sizeInput =
            row.querySelector(
                ".admin-order-item-f__size"
            );


        var descriptionInput =
            row.querySelector(
                ".admin-order-item-f__description"
            );


        var qtyInput =
            row.querySelector(
                ".admin-order-item-f__qty"
            );


        if (removeBtn) {

            removeBtn.addEventListener(
                "click",
                function () {

                    row.remove();
                    updateOrderGrandTotalPreviewF();

                }
            );
        }


        if (fileInput) {

            fileInput.addEventListener(
                "change",
                function () {

                    var file =
                        fileInput.files[0];


                    if (!file) {
                        return;
                    }


                    var reader =
                        new FileReader();


                    reader.onload =
                        function () {

                            preview.src =
                                reader.result;

                            preview.hidden =
                                false;

                        };


                    reader.readAsDataURL(
                        file
                    );

                }
            );
        }


        row.querySelectorAll(
            "[data-qty-action]"
        )
        .forEach(
            function (btn) {

                btn.addEventListener(
                    "click",
                    function () {

                        var current =
                            Number(
                                qtyInput.value
                            ) || 1;


                        var next =
                            btn.dataset.qtyAction ===
                            "increase"
                                ?
                                current + 1
                                :
                                current - 1;


                        qtyInput.value =
                            Math.max(
                                1,
                                next
                            );

                    }
                );

            }
        );


        // اگر در حالت ویرایش هستیم
        if (product) {

            if (product.id) {

                row.dataset.itemId =
                    String(
                        product.id
                    );
            }


            if (nameInput) {

                nameInput.value =
                    product.name || "";
            }


            if (priceInput) {

                priceInput.value =
                    baseUnitPriceF(
                        product
                    );
            }


            if (currencyInput) {

                currencyInput.value =
                    product.currency ||
                    "USD";
            }

            if (markupInput) {
                var savedMarkup = Number(product.markupPercent);
                markupInput.value =
                    Number.isFinite(savedMarkup)
                        ? savedMarkup
                        : (DEFAULT_MARKUP_F[product.currency || "USD"] || 0);
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

                brandInput.value =
                    product.brand || "";
            }


            if (sizeInput) {

                sizeInput.value =
                    product.size || "";
            }


            if (descriptionInput) {

                descriptionInput.value =
                    product.description || "";
            }


            if (qtyInput) {

                qtyInput.value =
                    Number(
                        product.qty
                    ) || 1;
            }


            if (
                preview &&
                product.image
            ) {

                preview.src =
                    product.image;

                preview.hidden =
                    false;
            }
        } else {
            if (currencyInput) {
                currencyInput.value = "USD";
            }
            if (markupInput) {
                markupInput.value = DEFAULT_MARKUP_F.USD;
            }
            if (exchangeRateInput) {
                exchangeRateInput.value = EXCHANGE_RATES_F.USD.rate;
            }
        }

        function updatePricingPreviewF() {
            var foreignPrice = priceInput ? Number(priceInput.value) || 0 : 0;
            var markup = markupInput ? Number(markupInput.value) || 0 : 0;
            var baseExchangeRate = exchangeRateInput ? Number(exchangeRateInput.value) || 0 : 0;

            // New pricing rule:
            // 1) Keep the foreign product price unchanged.
            // 2) Apply markup to the Rial/Toman exchange rate.
            // 3) Calculate product price once with the base rate and once with the adjusted rate.
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

            updateOrderGrandTotalPreviewF();
        }

        if (currencyInput) {
            currencyInput.addEventListener("change", function () {
                var currency = currencyInput.value;
                if (markupInput) {
                    markupInput.value = DEFAULT_MARKUP_F[currency] || 0;
                }
                if (exchangeRateInput && EXCHANGE_RATES_F[currency]) {
                    exchangeRateInput.value = EXCHANGE_RATES_F[currency].rate;
                }
                updatePricingPreviewF();
            });
        }

        [priceInput, markupInput, exchangeRateInput, qtyInput].forEach(function (input) {
            if (input) {
                input.addEventListener("input", updatePricingPreviewF);
                input.addEventListener("change", updatePricingPreviewF);
            }
        });

        // Quantity +/- buttons modify the input programmatically, so refresh too.
        row.querySelectorAll("[data-qty-action]").forEach(function (btn) {
            btn.addEventListener("click", updatePricingPreviewF);
        });

        setTimeout(updatePricingPreviewF, 0);

        return row;
    }


    function updateOrderGrandTotalPreviewF() {
        var totalEl = document.getElementById("adminNewOrderGrandTotalF");
        var container = document.getElementById("adminOrderItemsF");
        if (!totalEl || !container) {
            return;
        }

        var productsTotal = 0;
        container.querySelectorAll(".admin-order-item-f").forEach(function (row) {
            var foreignPrice = Number((row.querySelector(".admin-order-item-f__price") || {}).value) || 0;
            var markup = Number((row.querySelector(".admin-order-item-f__markup") || {}).value) || 0;
            var baseRate = Number((row.querySelector(".admin-order-item-f__exchange-rate") || {}).value) || 0;
            var qty = Math.max(1, Number((row.querySelector(".admin-order-item-f__qty") || {}).value) || 1);
            var adjustedRate = Math.round(baseRate * (1 + markup / 100));
            productsTotal += Math.round(foreignPrice * adjustedRate) * qty;
        });

        var shipping = Number((document.getElementById("adminNewOrderShippingF") || {}).value) || 0;
        var service = Number((document.getElementById("adminNewOrderServiceF") || {}).value) || 0;
        totalEl.textContent = formatNumberF(productsTotal + shipping + service) + " ریال";
    }


    function resetOrderItemsF() {

        var container =
            document.getElementById(
                "adminOrderItemsF"
            );

        if (!container) {
            return;
        }

        container.innerHTML = "";

        var firstRow = createOrderItemRowF();

        if (firstRow) {
            container.appendChild(firstRow);
        }

    }


    function initOrderItemsF() {

        var addBtn =
            document.getElementById(
                "adminAddOrderItemF"
            );

        var container =
            document.getElementById(
                "adminOrderItemsF"
            );

        if (!addBtn || !container) {
            return;
        }

        addBtn.addEventListener(
            "click",
            function () {

                var row = createOrderItemRowF();

                if (row) {
                    container.appendChild(row);
                    updateOrderGrandTotalPreviewF();
                }

            }
        );

    }


    // Reads + validates every item row. Returns { items, error }
    // — items is null when validation fails, with error set to a
    // user-facing message.




    function readOrderItemsF() {

        var container =
            document.getElementById(
                "adminOrderItemsF"
            );

        if (!container) {
            return {
                items: null,
                error: "خطای داخلی فرم."
            };
        }

        var rows =
            container.querySelectorAll(
                ".admin-order-item-f"
            );

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

            var nameInput =
                row.querySelector(
                    ".admin-order-item-f__name"
                );

            var priceInput =
                row.querySelector(
                    ".admin-order-item-f__price"
                );

            var currencyInput =
                row.querySelector(
                    ".admin-order-item-f__currency"
                );

            var markupInput =
                row.querySelector(
                    ".admin-order-item-f__markup"
                );

            var exchangeRateInput =
                row.querySelector(
                    ".admin-order-item-f__exchange-rate"
                );

            var brandInput =
                row.querySelector(
                    ".admin-order-item-f__brand"
                );

            var sizeInput =
                row.querySelector(
                    ".admin-order-item-f__size"
                );

            var descriptionInput =
                row.querySelector(
                    ".admin-order-item-f__description"
                );

            var qtyInput =
                row.querySelector(
                    ".admin-order-item-f__qty"
                );

            var preview =
                row.querySelector(
                    ".admin-order-item-f__preview"
                );

            var fileInput =
                row.querySelector(
                    ".admin-order-item-f__file-input"
                );

            var name =
                nameInput
                    ? nameInput.value.trim()
                    : "";

            var price =
                priceInput
                    ? Number(priceInput.value)
                    : 0;

            var currency =
                currencyInput
                    ? currencyInput.value
                    : "";

            var markup =
                markupInput
                    ? Number(markupInput.value)
                    : 0;

            var exchangeRate =
                exchangeRateInput
                    ? Number(exchangeRateInput.value)
                    : 0;

            var brand =
                brandInput
                    ? brandInput.value.trim()
                    : "";

            var size =
                sizeInput
                    ? sizeInput.value.trim()
                    : "";

            var description =
                descriptionInput
                    ? descriptionInput.value.trim()
                    : "";

            var qty =
                qtyInput
                    ? Number(qtyInput.value)
                    : 0;

            var image =
                preview &&
                !preview.hidden
                    ? preview.src
                    : "";

            var file =
                fileInput &&
                fileInput.files &&
                fileInput.files.length
                    ? fileInput.files[0]
                    : null;

            if (
                !name ||
                !price ||
                price <= 0 ||
                markup < 0 ||
                !exchangeRate ||
                exchangeRate <= 0 ||
                !qty ||
                qty < 1
            ) {

                error =
                    "برای هر آیتم، نام، قیمت پایه، درصد افزایش، نرخ ارز و تعداد معتبر وارد کنید.";

                return;
            }
            var itemId =
                row.dataset.itemId
                    ?
                    Number(
                        row.dataset.itemId
                    )
                    :
                    null;
            items.push({

                id:
                    itemId,

                name:
                    name,

                price:
                    price,

                currency:
                    currency,

                markup:
                    markup,

                exchangeRate:
                    exchangeRate,

                brand:
                    brand,

                size:
                    size,

                description:
                    description,

                qty:
                    qty,

                image:
                    image,

                file:
                    file

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

    function buildInvoiceCalcF(items, rates, shippingRial, serviceRial) {

        // The product price in foreign currency never changes.
        // Markup is applied to the IRR exchange rate, then the product
        // is converted once with the base rate and once with the adjusted rate.
        var byCurrency = {};
        var baseItemsRial = 0;
        var itemsRial = 0;
        var markupProfitRial = 0;

        var lines = items.map(function (item) {

            var rate =
                Number(item.exchangeRate) ||
                (rates[item.currency] ? rates[item.currency].rate : 0);

            var markup = Number(item.markup) || 0;
            var adjustedRate = Math.round(rate * (1 + markup / 100));

            var foreignUnitPrice = Number(item.price) || 0;
            var qty = Number(item.qty) || 0;

            var baseUnitRial = Math.round(foreignUnitPrice * rate);
            var finalUnitRial = Math.round(foreignUnitPrice * adjustedRate);
            var baseLineRial = baseUnitRial * qty;
            var lineRial = finalUnitRial * qty;
            var lineForeign = foreignUnitPrice * qty;

            baseItemsRial += baseLineRial;
            itemsRial += lineRial;
            markupProfitRial += (lineRial - baseLineRial);

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
                rate: rate,
                adjustedRate: adjustedRate,
                baseUnitRial: baseUnitRial,
                finalUnitRial: finalUnitRial,
                baseLineRial: baseLineRial,
                lineForeign: lineForeign,
                lineRial: lineRial,
                profit: lineRial - baseLineRial
            };

        });

        var grandTotalRial =
            itemsRial + shippingRial + serviceRial;

        return {
            lines: lines,
            byCurrency: byCurrency,
            baseItemsRial: baseItemsRial,
            itemsRial: itemsRial,
            shippingRial: shippingRial,
            serviceRial: serviceRial,
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

            // ظاهر جدول دقیقاً مثل نسخه اولیه حفظ شده است.
            // برای ادمین، قیمت ریالی قبل و بعد از افزایش داخل همان سلول قبلی نمایش داده می‌شود.
            var rialCell;

            if (isAdminF) {
                rialCell =
                    '<td class="invoice-price">' +
                        '<div class="invoice-price-stack-f">' +
                            '<div>' + moneyHtmlF(line.finalUnitRial, "ریال") + '</div>' +
                        '</div>' +
                    '</td>';
            } else {
                rialCell =
                    '<td class="invoice-price">' +
                    moneyHtmlF(line.finalUnitRial, "ریال") + '</td>';
            }

            var foreignCell =
                isAdminF
                    ? '<td class="invoice-price">' +
                      '<span class="invoice-money-f" dir="rtl"><bdi class="invoice-money-f__number" dir="ltr">' +
                      formatForeignF(line.price) + '</bdi><span class="invoice-money-f__label"> ' + currencyLabel + '</span></span>' +
                      '</td>'
                    : '';

            return (
                '<tr>' +
                '<td class="invoice-item-name">' + (line.name || '—') + '</td>' +
                '<td>' + (line.brand || '—') + '</td>' +
                '<td>' + (line.size || '—') + '</td>' +
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
                        '<span>درصد افزایش :</span>' +
                        '<strong>' +  toPersianDigitsF( Number(primaryLine.markup || 0).toLocaleString('en-US', {maximumFractionDigits: 2}))   + '%</strong>' +
                    '</div>' +


                     '<div class="invoice-summary-row-f">' +
                        '<span>نرخ ' + primaryCurrencyLabel + ' بعد از افزایش :</span>' +
                        '<strong>' +  formatNumberF(primaryLine.adjustedRate)  + ' ریال</strong>' +
                    '</div>' ;




           
                

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
                        '<span>مجموع افزایش اعمال‌شده</span>' +
                        '<strong>' + formatNumberF(calc.profitRial) + ' ریال</strong>' +
                    '</div>' +
                '</div>';
        }


        // نرخ ارز اولیه، درصد و نرخ بعد از افزایش در همان ستون متای طراحی اولیه نمایش داده می‌شوند.
      


        var tableHeadHtml =
            isAdminF
                ? '<tr><th>کالا</th><th>برند</th><th>سایز</th><th>تعداد</th><th>قیمت واحد (ارز)</th><th>قیمت واحد (ریال)</th></tr>'
                : '<tr><th>کالا</th><th>برند</th><th>سایز</th><th>تعداد</th><th>قیمت واحد</th></tr>';


        var colWidthsCss =
            isAdminF
                ? '.admin-invoice-f__table th:nth-child(1){width:19%;}.admin-invoice-f__table th:nth-child(2){width:12%;}.admin-invoice-f__table th:nth-child(3){width:10%;}.admin-invoice-f__table th:nth-child(4){width:9%;}.admin-invoice-f__table th:nth-child(5){width:18%;}.admin-invoice-f__table th:nth-child(6){width:32%;}'
                : '.admin-invoice-f__table th:nth-child(1){width:27%;}.admin-invoice-f__table th:nth-child(2){width:17%;}.admin-invoice-f__table th:nth-child(3){width:13%;}.admin-invoice-f__table th:nth-child(4){width:13%;}.admin-invoice-f__table th:nth-child(5){width:30%;}';


        return (
            '<style id="admin-invoice-reference-style-f">\n.invoice-scale-wrap-f{width:100%;overflow:hidden;display:flex;justify-content:center;align-items:flex-start;}\n.admin-invoice-f{flex:0 0 auto;transform-origin:top center;width:640px;min-height:980px;margin:0 auto;background:#F3EFE8;color:#201B1D;direction:rtl;overflow:hidden;font-family:\'Sanaa Persian\',Tahoma,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}\n.admin-invoice-f,.admin-invoice-f *{box-sizing:border-box;font-variant-numeric:tabular-nums;}\n.admin-invoice-f__band{height:200px;min-height:200px;padding:26px 24px 16px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;background:#B9C3B9;text-align:center;}\n.admin-invoice-f__band-logo{font-family:\'Belleza\',Sanaa Persian,Georgia,serif;font-size:56px;line-height:1;color:#A61579;letter-spacing:.16em;font-weight:400;}\n.admin-invoice-f__band-sub{margin-top:8px;font-family:\'Belleza\',Sanaa Persian,Georgia,serif;font-size:19px;line-height:1;color:#A61579;letter-spacing:.34em;font-weight:400;}\n.admin-invoice-f__band-type-f{margin-top:10px;font-size:12px;color:#5C5356;font-weight:700;}\n.admin-invoice-f__card{width:90%;min-height:720px;margin:-50px auto 0;background:#fff;padding:0 18px 36px;box-shadow:0 0 0 1px rgba(0,0,0,.02);page-break-inside:avoid;}\n.admin-invoice-f__meta{min-height:92px;padding:17px 0 15px;display:flex;align-items:start;gap:30px;border-bottom:1px solid #4B4748;font-size:15px;line-height:1.8;}\n.admin-invoice-f__meta-col{display:flex;flex-direction:column;gap:0;min-width:0;}\n.admin-invoice-f__meta-col--left{text-align:left;}\n.admin-invoice-f__meta-col p{margin:0;white-space:nowrap;overflow-wrap:anywhere;}\n.admin-invoice-f__table{width:100%;margin:30px 0 0;border-collapse:collapse;table-layout:fixed;font-size:14px;}\n.admin-invoice-f__table th{height:44px;padding:6px 7px;background:#A61579;color:#fff;border-left:2px solid #fff;font-size:13px;font-weight:700;text-align:center;vertical-align:middle;overflow-wrap:anywhere;line-height:1.2;}\n' +
            colWidthsCss +
            '\n.admin-invoice-f__table th:last-child{border-left:0;}\n.admin-invoice-f__table td{min-height:62px;height:62px;padding:8px 7px;border:0;text-align:center;vertical-align:middle;font-size:14px;overflow-wrap:anywhere;word-break:break-word;}\n.admin-invoice-f__table td.invoice-item-name{text-align:right;}\n.admin-invoice-f__table td.invoice-price{direction:rtl;white-space:normal;overflow-wrap:anywhere;}\n.invoice-money-f{display:inline-flex;align-items:baseline;gap:3px;direction:rtl;unicode-bidi:isolate;white-space:nowrap;}\n.invoice-money-f__number{display:inline-block;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;white-space:nowrap;}\n.invoice-money-f__label{display:inline-block;white-space:nowrap;}\n.invoice-price-stack-f{width:100%;display:flex;flex-direction:column;align-items:stretch;gap:5px;direction:rtl;min-width:0;}\n.invoice-price-line-f{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr);align-items:baseline;gap:4px;white-space:normal;min-width:0;}\n.invoice-price-label-f{text-align:right;white-space:nowrap;}\n.invoice-price-line-f .invoice-money-f{min-width:0;max-width:100%;justify-content:flex-start;white-space:normal;flex-wrap:wrap;}\n.invoice-price-line-f .invoice-money-f__number{max-width:100%;white-space:normal;overflow-wrap:anywhere;}\n.admin-invoice-f__summary-wrap{margin-top:42px;display:flex;flex-direction:column;align-items:flex-end;}\n.admin-invoice-f__summary{width:315px;max-width:none;margin-right:0;display:flex;flex-direction:column;gap:6px;}\n.invoice-summary-row-f{display:flex;align-items:baseline;justify-content:space-between;gap:10px;font-size:15px;line-height:1.65;direction:rtl;}\n.invoice-summary-row-f span:last-child,.invoice-summary-row-f strong:last-child{white-space:nowrap;text-align:left;}\n.invoice-summary-total-f{margin-top:10px;padding-top:11px;border-top:2px solid #4B4748;font-size:18px;font-weight:700;}\n.invoice-summary-total-f strong:first-child{font-weight:800;}\n.invoice-profit-f{width:100%; max-width:none;margin:60px auto 0 0;padding:10px 12px;border:1px dashed #A61579;background:#FBF2F8;}\n.invoice-profit-title-f{margin-bottom:7px;color:#A61579;font-size:11px;font-weight:700;}\n.admin-invoice-f__footer{width:90%;margin:0 auto;min-height:120px;padding:28px 0 0;display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;flex-wrap:nowrap;gap:30px;background:#F3EFE8;color:#A61579;}\n.admin-invoice-f__contact-f{flex:0 1 auto;min-width:0;font-family: Sanaa Persian ,Arial,Tahoma,sans-serif;font-size:14px;line-height:1.7;text-align:left;}\n.admin-invoice-f__contact-f p{margin:0;overflow-wrap:anywhere;}\n.admin-invoice-f__thanks-f{flex:0 1 auto;min-width:0;margin:0;font-size:22px;font-weight:700;text-align:right;white-space:normal;overflow-wrap:anywhere;}\n.admin-invoice-f__footer-note{display:none;}\n</style>' +
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
                            '<div class="invoice-summary-row-f"><span>هزینه خدمات :</span><span>' + formatNumberF(calc.serviceRial) + ' ریال</span></div>' +
                            '<div class="invoice-summary-row-f"><span>هزینه باربری :</span><span>' + formatNumberF(calc.shippingRial) + ' ریال</span></div>' +
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

    function fitInvoiceWrapF(wrap) {

        var invoice = wrap.querySelector(".admin-invoice-f");

        if (!invoice) {
            return;
        }

        // Reset before measuring the invoice at its real size.
        invoice.style.transform = "none";
        wrap.style.height = "auto";

        var naturalWidth = invoice.offsetWidth;
        var naturalHeight = invoice.offsetHeight;
        var availableWidth = wrap.clientWidth;

        // The modal also contains the close button and invoice action buttons.
        // Reserve enough vertical space for them so the *whole* invoice,
        // including its footer, remains visible in the modal.
        var availableHeight = Math.max(360, window.innerHeight - 220);

        var widthScale =
            availableWidth > 0 && naturalWidth > 0
                ? availableWidth / naturalWidth
                : 1;

        var heightScale =
            availableHeight > 0 && naturalHeight > 0
                ? availableHeight / naturalHeight
                : 1;

        var scale = Math.min(1, widthScale, heightScale);

        invoice.style.transformOrigin = "top center";
        invoice.style.transform = "scale(" + scale + ")";
        wrap.style.height = Math.ceil(naturalHeight * scale) + "px";
        wrap.style.overflow = "hidden";

    }


    function fitInvoicesInModalF(modal) {

        if (!modal) {
            return;
        }

        modal.querySelectorAll(".invoice-scale-wrap-f").forEach(fitInvoiceWrapF);

    }


    window.addEventListener("resize", function () {

        document.querySelectorAll(".invoice-scale-wrap-f").forEach(function (wrap) {

            if (wrap.offsetParent !== null) {
                fitInvoiceWrapF(wrap);
            }

        });

    });


    function openInvoiceModalF(id) {

        var modal = document.getElementById(id);

        if (modal) {

            modal.hidden = false;

            requestAnimationFrame(function () {
                fitInvoicesInModalF(modal);
            });

        }

    }


    function closeInvoiceModalF(id) {

        var modal = document.getElementById(id);

        if (modal) {
            modal.hidden = true;
        }

    }


    /* ----------------------------------------------------------
     * Printing — instead of hiding the rest of the admin page
     * with CSS (fragile across this page's nested layout/scroll
     * containers and produced blank PDFs), open the invoice
     * markup alone in a fresh window with just the site
     * stylesheet, then print that. Much more reliable.
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
        // Keeping it inside the print document makes those preview rules load
        // after printCss and override the A4 layout, which can split one
        // invoice across multiple sheets. Remove only the cloned preview style;
        // the on-screen modal remains completely unchanged.
        var previewStyle = printContent.querySelector(
            "#admin-invoice-reference-style-f"
        );

        if (previewStyle) {
            previewStyle.remove();
        }

        var scaledInvoice = printContent.querySelector(".admin-invoice-f");
        if (scaledInvoice) {
            scaledInvoice.style.transform = "none";
        }

        var scaleWrap = printContent.querySelector(".invoice-scale-wrap-f");
        if (scaleWrap) {
            scaleWrap.style.height = "auto";
        }

        // Font URLs: prefer the ones injected by the Django template
        // (window.SANAA_FONTS_F); fall back to the default /static/fonts/ paths
        // so the PDF never loses Belleza / Vazirmatn.
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
            ".admin-invoice-f__band{min-height:200px;padding:30px 16px 20px;display:flex;flex-direction:column;align-items:center;background:#B9C3B9;text-align:center;}" +//header
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
            ".admin-invoice-f__table th:nth-child(1){width:27%;}.admin-invoice-f__table th:nth-child(2){width:17%;}.admin-invoice-f__table th:nth-child(3){width:13%;}.admin-invoice-f__table th:nth-child(4){width:13%;}.admin-invoice-f__table th:nth-child(5){width:30%;}" +
            ".admin-invoice-f__table td{min-height:52px;height:52px;padding:7px 3px;border:0;text-align:center;vertical-align:middle;font-size:11px;overflow-wrap:anywhere;word-break:break-word;}" +
            ".admin-invoice-f__table td.invoice-item-name{text-align:right;}" +
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

        // Admin invoice has 6 columns; the print stylesheet above only knows
        // the 5-column customer layout, so override the widths when needed.
        if (printContent.querySelectorAll(".admin-invoice-f__table thead th").length === 6) {
            printCss +=
                ".admin-invoice-f__table th:nth-child(1){width:19%;}" +
                ".admin-invoice-f__table th:nth-child(2){width:12%;}" +
                ".admin-invoice-f__table th:nth-child(3){width:10%;}" +
                ".admin-invoice-f__table th:nth-child(4){width:9%;}" +
                ".admin-invoice-f__table th:nth-child(5){width:18%;}" +
                ".admin-invoice-f__table th:nth-child(6){width:32%;}";
        }

        // Print through a hidden iframe instead of window.open():
        //  - no popup windows piling up when the button is clicked repeatedly
        //  - no popup blocker problems
        //  - the frame is removed automatically after printing
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

        document.querySelectorAll(
            "[data-invoice-close]"
        ).forEach(function (btn) {

            btn.addEventListener(
                "click",
                function () {

                    closeInvoiceModalF(
                        "adminCustomerInvoiceModalF"
                    );

                    closeInvoiceModalF(
                        "adminInternalInvoiceModalF"
                    );

                }
            );

        });


        document.querySelectorAll(
            "[data-invoice-print]"
        ).forEach(function (btn) {

            btn.addEventListener(
                "click",
                function () {

                    var containerId =
                        btn.dataset.invoicePrint;

                    printInvoiceF(containerId);

                }
            );

        });


        var goToAdminBtn =
            document.getElementById(
                "adminGoToAdminInvoiceF"
            );

        if (goToAdminBtn) {

            goToAdminBtn.addEventListener(
                "click",
                function () {

                    closeInvoiceModalF(
                        "adminCustomerInvoiceModalF"
                    );

                    openInvoiceModalF(
                        "adminInternalInvoiceModalF"
                    );

                }
            );

        }


        var backToCustomerBtn =
            document.getElementById(
                "adminBackToCustomerInvoiceF"
            );

        if (backToCustomerBtn) {

            backToCustomerBtn.addEventListener(
                "click",
                function () {

                    closeInvoiceModalF(
                        "adminInternalInvoiceModalF"
                    );

                    openInvoiceModalF(
                        "adminCustomerInvoiceModalF"
                    );

                }
            );

        }


        var finishBtn =
            document.getElementById(
                "adminFinishInvoiceF"
            );

        if (finishBtn) {

            finishBtn.addEventListener(
                "click",
                function () {

                    closeInvoiceModalF(
                        "adminCustomerInvoiceModalF"
                    );

                    closeInvoiceModalF(
                        "adminInternalInvoiceModalF"
                    );

                }
            );

        }

    }


    /* ----------------------------------------------------------
     * New order form — wiring
     * ---------------------------------------------------------- */

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

        var select =
            document.getElementById(
                "adminNewOrderCustomerF"
            );

        var searchInput =
            document.getElementById(
                "adminNewOrderCustomerSearchF"
            );

        if (!select || !searchInput) {
            return;
        }

        var selectedOption =
            select.options[select.selectedIndex];

        searchInput.value =
            selectedOption && selectedOption.value
                ? selectedOption.textContent.trim()
                : "";

    }


    function initSearchableCustomerSelectF() {

        var wrapper =
            document.getElementById(
                "adminCustomerComboF"
            );

        var select =
            document.getElementById(
                "adminNewOrderCustomerF"
            );

        var searchInput =
            document.getElementById(
                "adminNewOrderCustomerSearchF"
            );

        var list =
            document.getElementById(
                "adminNewOrderCustomerListF"
            );

        if (!wrapper || !select || !searchInput || !list) {
            return;
        }


        // Build a plain lookup of the server-rendered options
        // once, up front.
        var options =
            Array.prototype.slice
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


        function renderListF(query) {

            var normalized =
                (query || "").trim().toLowerCase();

            var matches =
                normalized
                    ? options.filter(function (option) {
                        return option.label
                            .toLowerCase()
                            .indexOf(normalized) !== -1;
                    })
                    : options;

            list.innerHTML = "";

            if (!matches.length) {

                var empty =
                    document.createElement("li");

                empty.className =
                    "admin-searchable-select-f__empty";

                empty.textContent =
                    "مشتری‌ای پیدا نشد.";

                list.appendChild(empty);

                return;
            }

            matches.forEach(function (option) {

                var item =
                    document.createElement("li");

                item.className =
                    "admin-searchable-select-f__item";

                item.textContent = option.label;

                item.addEventListener(
                    "mousedown",
                    function (event) {

                        // mousedown (not click) so it fires before
                        // the search input's blur hides the list.
                        event.preventDefault();

                        select.value = option.value;
                        searchInput.value = option.label;

                        list.hidden = true;

                    }
                );

                list.appendChild(item);

            });

        }


        searchInput.addEventListener(
            "focus",
            function () {

                renderListF(searchInput.value);

                list.hidden = false;

            }
        );


        searchInput.addEventListener(
            "input",
            function () {

                // Typing invalidates whatever was picked before
                // until a new option is chosen from the list.
                select.value = "";

                renderListF(searchInput.value);

                list.hidden = false;

            }
        );


        searchInput.addEventListener(
            "blur",
            function () {

                list.hidden = true;

                // If nothing valid was picked, don't leave stray
                // typed text behind.
                if (!select.value) {
                    searchInput.value = "";
                }

            }
        );

    }


    function initNewOrderF() {

        var editingOrderId =
            null;


        var openBtn =
            document.getElementById(
                "adminNewOrderBtnF"
            );


        var modal =
            document.getElementById(
                "adminNewOrderModalF"
            );


        var closeBtn =
            document.getElementById(
                "adminNewOrderCloseF"
            );


        var cancelBtn =
            document.getElementById(
                "adminNewOrderCancelF"
            );


        var form =
            document.getElementById(
                "adminNewOrderFormF"
            );


        var submitBtn =
            document.getElementById(
                "adminSubmitInvoiceF"
            );


        var errorEl =
            document.getElementById(
                "adminNewOrderErrorF"
            );


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

        }


        function closeNewOrderModal() {

            modal.hidden =
                true;

            editingOrderId =
                null;

        }


        function openNewOrderModal() {

            editingOrderId =
                null;


            form.reset();

            resetOrderItemsF();

            showFormErrorF("");


            var title =
                document.getElementById(
                    "adminNewOrderTitleF"
                );


            if (title) {

                title.textContent =
                    "ثبت سفارش جدید";
            }


            if (submitBtn) {

                submitBtn.textContent =
                    "ثبت فاکتور";
            }


            modal.hidden =
                false;
        }


        openEditOrderModalF =
            function (order) {

                if (!order) {
                    return;
                }


                editingOrderId =
                    order.id;


                form.reset();

                showFormErrorF("");


                var title =
                    document.getElementById(
                        "adminNewOrderTitleF"
                    );


                if (title) {

                    title.textContent =
                        "ویرایش سفارش " +
                        order.number;
                }


                if (submitBtn) {

                    submitBtn.textContent =
                        "ذخیره تغییرات";
                }


                var customerSelect =
                    document.getElementById(
                        "adminNewOrderCustomerF"
                    );


                if (customerSelect) {

                    customerSelect.value =
                        String(
                            order.customer.id
                        );

                    syncCustomerComboDisplayF();
                }


                var shippingInput =
                    document.getElementById(
                        "adminNewOrderShippingF"
                    );


                if (shippingInput) {

                    shippingInput.value =
                        Number(
                            order.shippingRial
                        ) || 0;
                }


                var serviceInput =
                    document.getElementById(
                        "adminNewOrderServiceF"
                    );


                if (serviceInput) {

                    serviceInput.value =
                        Number(
                            order.serviceRial
                        ) || 0;
                }


                var paymentInput =
                    document.getElementById(
                        "adminNewOrderPaymentF"
                    );


                if (paymentInput) {

                    paymentInput.value =
                        order.paymentStatus ||
                        "pending";
                }


                var container =
                    document.getElementById(
                        "adminOrderItemsF"
                    );


                if (container) {

                    container.innerHTML =
                        "";


                    var products =
                        Array.isArray(order.products)
                            ? order.products
                            : [];


                    products.forEach(
                        function (product) {

                            var row =
                                createOrderItemRowF(
                                    product
                                );


                            if (row) {

                                container.appendChild(
                                    row
                                );
                            }

                        }
                    );


                    if (!products.length) {

                        var emptyRow =
                            createOrderItemRowF();


                        if (emptyRow) {

                            container.appendChild(
                                emptyRow
                            );
                        }
                    }
                }


                modal.hidden =
                    false;
            };


        openBtn.addEventListener(
            "click",
            openNewOrderModal
        );


        if (closeBtn) {

            closeBtn.addEventListener(
                "click",
                closeNewOrderModal
            );

        }


        if (cancelBtn) {

            cancelBtn.addEventListener(
                "click",
                closeNewOrderModal
            );

        }


        var backdrop =
            modal.querySelector(
                ".modal__backdrop"
            );


        if (backdrop) {

            backdrop.addEventListener(
                "click",
                closeNewOrderModal
            );

        }






























  




    ["adminNewOrderShippingF", "adminNewOrderServiceF"].forEach(function (id) {
        var input = document.getElementById(id);
        if (input) {
            input.addEventListener("input", updateOrderGrandTotalPreviewF);
            input.addEventListener("change", updateOrderGrandTotalPreviewF);
        }
    });


    form.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            showFormErrorF("");

            var customerSelect =
                document.getElementById(
                    "adminNewOrderCustomerF"
                );

            var shippingInput =
                document.getElementById(
                    "adminNewOrderShippingF"
                );

            var serviceInput =
                document.getElementById(
                    "adminNewOrderServiceF"
                );

            var paymentInput =
                document.getElementById(
                    "adminNewOrderPaymentF"
                );

            var customer =
                customerSelect
                    ? customerSelect.value
                    : "";

            var shippingRial =
                shippingInput
                    ? Number(
                        shippingInput.value
                    ) || 0
                    : 0;

            var serviceRial =
                serviceInput
                    ? Number(
                        serviceInput.value
                    ) || 0
                    : 0;

            var paymentStatus =
                paymentInput
                    ? paymentInput.value
                    : "pending";

            // =========================
            // Customer validation
            // =========================

            if (!customer) {

                showFormErrorF(
                    "لطفاً مشتری سفارش را انتخاب کنید."
                );

                return;
            }

            // =========================
            // Items
            // =========================

            var itemsResult =
                readOrderItemsF();

            if (!itemsResult.items) {

                showFormErrorF(
                    itemsResult.error
                );

                return;
            }

            var items =
                itemsResult.items;

            // =========================
            // Loading
            // =========================
            var isEditing =
                Boolean(
                    editingOrderId
                );


            var originalLabel =
                submitBtn
                    ? submitBtn.textContent
                    : "";


            if (submitBtn) {

                submitBtn.disabled =
                    true;

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

                    var calc =
                        buildInvoiceCalcF(
                            items,
                            rates,
                            shippingRial,
                            serviceRial
                        );

                    // =====================
                    // FormData
                    // =====================

                    var formData =
                        new FormData();

                    var csrfInput =
                        form.querySelector(
                            'input[name="csrfmiddlewaretoken"]'
                        );

                    if (csrfInput) {

                        formData.append(
                            "csrfmiddlewaretoken",
                            csrfInput.value
                        );
                    }

                    formData.append(
                        "customer_id",
                        customer
                    );

                    formData.append(
                        "shipping_cost",
                        String(shippingRial)
                    );

                    formData.append(
                        "service_cost",
                        String(serviceRial)
                    );

                    formData.append(
                        "payment_status",
                        paymentStatus
                    );

                    var usdItem = items.find(function (item) {
                        return item.currency === "USD" && Number(item.exchangeRate) > 0;
                    });
                    var usdRate = usdItem
                        ? Number(usdItem.exchangeRate)
                        : (rates && rates.USD ? rates.USD.rate : 0);

                    formData.append(
                        "usd_rate",
                        String(usdRate)
                    );

                    // =====================
                    // Products
                    // =====================

                    var backendItems =
                        items.map(
                            function (
                                item,
                                index
                            ) {

                                var exchangeRate =
                                    Number(item.exchangeRate) || 0;

                                if (item.file) {

                                    formData.append(
                                        "item_photo_" +
                                            index,
                                        item.file
                                    );
                                }

                                return {

                                    id:
                                        item.id || null,

                                    product_name:
                                        item.name,

                                    brand:
                                        item.brand,

                                    size:
                                        item.size,

                                    description:
                                        item.description,

                                    quantity:
                                        item.qty,

                                    currency:
                                        item.currency,

                                    product_price:
                                        item.price,

                                    markup_percent:
                                        item.markup,

                                    exchange_rate:
                                        exchangeRate

                                };
                            }
                        );

                    formData.append(
                        "items",
                        JSON.stringify(
                            backendItems
                        )
                    );

                    var requestUrl =
                        isEditing
                            ?
                            buildOrderUrlF(
                                form.dataset
                                    .updateUrlTemplate,
                                editingOrderId
                            )
                            :
                            form.dataset
                                .createUrl;


                    console.log(
                        isEditing
                            ? "Update order URL:"
                            : "Create order URL:",
                        requestUrl
                    );


                    console.log(
                        "Customer ID:",
                        customer
                    );


                    console.log(
                        "Items:",
                        backendItems
                    );
                    // =====================
                    // Django request
                    // =====================

                    return fetch(
                        requestUrl,
                        {
                            method: "POST",
                            body: formData
                        }
                    )
                    .then(
                        function (response) {

                            return response
                                .text()
                                .then(
                                    function (text) {

                                        var data = {};

                                        try {

                                            data =
                                                JSON.parse(
                                                    text
                                                );

                                        } catch (error) {

                                            console.error(
                                                "Invalid backend response:",
                                                text
                                            );
                                        }

                                        return {
                                            ok:
                                                response.ok,

                                            status:
                                                response.status,

                                            data:
                                                data,

                                            raw:
                                                text,

                                            calc:
                                                calc
                                        };
                                    }
                                );
                        }
                    );

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
                            result.data &&
                            result.data.message
                                ?
                                result.data.message
                                :
                                (
                                    "خطای سرور با کد " +
                                    result.status
                                );


                        throw new Error(
                            message
                        );
                    }


                    if (
                        !result.data ||
                        !result.data.order
                    ) {

                        throw new Error(
                            "اطلاعات سفارش از سرور دریافت نشد."
                        );
                    }


                    var savedOrder =
                        result.data.order;


                    var calc =
                        result.calc;


                    // اطلاعات واقعی برگشتی Django
                    // جای Order قبلی را می‌گیرد.
                    replaceOrderF(
                        savedOrder
                    );


                    // =====================
                    // Invoice
                    // =====================

                    var paymentLabels = {

                        pending:
                            "در انتظار پرداخت",

                        paid:
                            "پرداخت‌شده",

                        partial:
                            "پرداخت ناقص",

                        failed:
                            "پرداخت ناموفق",

                        cancelled:
                            "لغوشده"

                    };


                    var meta = {

                        orderNumber:
                            savedOrder.number,

                        date:
                            savedOrder.date,

                        customerName:
                            savedOrder.customer.name,

                        paymentLabel:
                            paymentLabels[
                                savedOrder.paymentStatus
                            ]
                            ||
                            savedOrder.paymentStatus

                    };


                    var customerInvoiceEl =
                        document.getElementById(
                            "adminCustomerInvoiceF"
                        );


                    var adminInvoiceEl =
                        document.getElementById(
                            "adminInternalInvoiceF"
                        );


                    if (customerInvoiceEl) {

                        customerInvoiceEl.innerHTML =
                            renderInvoiceHtmlF(
                                calc,
                                meta,
                                false
                            );
                    }


                    if (adminInvoiceEl) {

                        adminInvoiceEl.innerHTML =
                            renderInvoiceHtmlF(
                                calc,
                                meta,
                                true
                            );
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
                        document.getElementById(
                            "adminOrderSearchF"
                        );


                    if (searchInput) {

                        searchInput.value =
                            "";
                    }


                    // لیست را دوباره از ordersF رندر کن
                    applyFiltersF();


                    closeNewOrderModal();


                    openInvoiceModalF(
                        "adminCustomerInvoiceModalF"
                    );


                    showToastF(

                        isEditing
                            ?
                            (
                                "سفارش " +
                                savedOrder.number +
                                " با موفقیت ویرایش شد."
                            )
                            :
                            (
                                "سفارش " +
                                savedOrder.number +
                                " با موفقیت ثبت شد."
                            ),

                        "success"
                    );

                })

                .catch(function (error) {

                    console.error(
                        "Create / update order error:",
                        error
                    );

                    showFormErrorF(
                        error.message ||
                        "ذخیره سفارش انجام نشد."
                    );

                })

                // =========================
                // Finally
                // =========================

                .finally(function () {

                    if (submitBtn) {

                        submitBtn.disabled =
                            false;

                        submitBtn.textContent =
                            originalLabel;
                    }

                });

        }
    );

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
            observer.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
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


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initAdminOrdersF
        );

    } else {

        initAdminOrdersF();

    }

})();
