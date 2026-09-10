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

        confirmed: {
            label: "تأییدشده",
            color: "info"
        },

        preparing: {
            label: "در حال آماده‌سازی",
            color: "warning"
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

        returned: {
            label: "مرجوع‌شده",
            color: "danger"
        }

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

        return Math.round(value).toLocaleString("fa-IR");

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


    function unitPriceF(product) {

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


    // Admin's own cost for the item (what Sanaa actually paid) —
    // used only for the internal profit calculation, never shown
    // on the customer invoice. Defaults to 0 (full price counted
    // as margin) when not entered.
    function unitCostF(product) {

        return typeof product.costPrice === "number"
            ? product.costPrice
            : 0;

    }


    function orderTotalsF(order) {

        var products =
            Array.isArray(order.products)
                ? order.products
                : [];

        var baseAmount =
            products.reduce(
                function (sum, product) {

                    return (
                        sum +
                        unitPriceF(product) *
                        (Number(product.qty) || 0)
                    );

                },
                0
            );


        var productsRial =
            products.reduce(
                function (sum, product) {

                    var currency =
                        product.currency ||
                        order.currency;

                    var rate =
                        typeof product.exchangeRate === "number"
                            ? product.exchangeRate
                            : (
                                EXCHANGE_RATES_F[currency]
                                    ? EXCHANGE_RATES_F[currency].rate
                                    : 0
                            );

                    return (
                        sum +
                        unitPriceF(product) *
                        (Number(product.qty) || 0) *
                        rate
                    );

                },
                0
            );


        var totalRial =
            productsRial -
            (Number(order.discountRial) || 0) +
            (Number(order.shippingRial) || 0) +
            (Number(order.serviceRial) || 0);


        return {

            baseAmount: baseAmount,
            productsRial: productsRial,
            totalRial: totalRial,

            rate:
                EXCHANGE_RATES_F[order.currency]
                    ? EXCHANGE_RATES_F[order.currency].rate
                    : 0

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


            '<div class="admin-menu-f">' +

            '<button type="button" class="admin-icon-btn-f" ' +
            'data-more-menu-btn-f="' +
            orderNumber +
            '" ' +
            'aria-haspopup="true" ' +
            'aria-expanded="false" ' +
            'title="بیشتر">' +

            '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
            '<circle cx="5" cy="12" r="1.6"/>' +
            '<circle cx="12" cy="12" r="1.6"/>' +
            '<circle cx="19" cy="12" r="1.6"/>' +
            "</svg>" +

            "</button>" +


            '<div class="admin-menu-f__panel" ' +
            'data-more-menu-panel-f="' +
            orderNumber +
            '" hidden>' +


            '<button type="button" class="admin-menu-f__item" ' +
            'data-edit-order-f="' +
            orderNumber +
            '">' +

            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<path d="M4 20h4l11-11-4-4L4 16v4Z" stroke-linecap="round" stroke-linejoin="round"/>' +
            "</svg>" +

            "ویرایش سفارش" +

            "</button>" +


            '<button type="button" class="admin-menu-f__item" ' +
            'data-resend-invoice-f="' +
            orderNumber +
            '">' +

            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<path d="M4 4v6h6M20 20v-6h-6" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M5 15a7 7 0 0 0 12 3l3-3M19 9A7 7 0 0 0 7 6L4 9" stroke-linecap="round" stroke-linejoin="round"/>' +
            "</svg>" +

            "ارسال مجدد فاکتور" +

            "</button>" +


            '<button type="button" class="admin-menu-f__item admin-menu-f__item--danger-f" ' +
            'data-delete-order-f="' +
            orderNumber +
            '">' +

            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<circle cx="12" cy="12" r="9" stroke-linecap="round"/>' +
            '<path d="m9 9 6 6m0-6-6 6" stroke-linecap="round"/>' +
            "</svg>" +

            "حذف سفارش" +

            "</button>" +


            "</div>" +

            "</div>"

        );

    }


    function tableRowHtmlF(order) {

        var totals =
            orderTotalsF(order);


        var currencyLabel =
            EXCHANGE_RATES_F[
                order.currency
            ].label;


        return (

            "<tr data-order-row-f=\"" +
            order.number +
            "\">" +


            "<td>" +
            order.number +
            "</td>" +


            '<td class="admin-orders-f__table-product">' +
            productSummaryF(order) +
            "</td>" +


            "<td>" +
            order.customer.name +
            "</td>" +


            "<td>" +
            order.date +
            "</td>" +


            "<td>" +
            formatNumberF(
                totals.baseAmount
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


            '<span class="admin-orders-f__card-product">' +
            order.products[0].name +
            (
                order.products.length > 1
                    ? " (+ " +
                    formatNumberF(
                        order.products.length - 1
                    ) +
                    " محصول دیگر)"
                    : ""
            ) +
            "</span>" +


            '<span class="admin-orders-f__card-date">' +
            order.date +
            "</span>" +


            '<span class="admin-orders-f__card-amount">' +
            formatNumberF(
                totals.totalRial
            ) +
            " ریال</span>" +

            "</div>" +


            '<div class="admin-orders-f__card-bottom">' +

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


        var clearBtn =
            document.getElementById(
                "adminClearFiltersF"
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


        if (clearBtn) {

            clearBtn.addEventListener(
                "click",
                function () {

                    filtersF = {

                        search: "",
                        orderStatus: "all",
                        paymentStatus: "all",
                        invoiceStatus: "all",
                        sort: "newest"

                    };


                    if (searchInput) {
                        searchInput.value = "";
                    }


                    if (orderStatusSelect) {
                        orderStatusSelect.value = "all";
                    }


                    if (paymentStatusSelect) {
                        paymentStatusSelect.value = "all";
                    }


                    if (invoiceStatusSelect) {
                        invoiceStatusSelect.value = "all";
                    }


                    if (sortSelect) {
                        sortSelect.value = "newest";
                    }


                    applyFiltersF();


                    showToastF(
                        "فیلترها پاک شد.",
                        "success"
                    );

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

                    var isHidden =
                        filtersPanel.hasAttribute(
                            "hidden"
                        );


                    if (isHidden) {

                        filtersPanel.removeAttribute(
                            "hidden"
                        );

                    } else {

                        filtersPanel.setAttribute(
                            "hidden",
                            ""
                        );

                    }


                    filtersToggle.setAttribute(
                        "aria-expanded",
                        String(isHidden)
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
                    function (product) {

                        var price =
                            unitPriceF(product);


                        return (

                            '<div class="admin-orders-f__sheet-product">' +

                            "<div>" +

                            '<p class="admin-orders-f__sheet-product-name">' +
                            product.name +
                            "</p>" +

                            '<span class="admin-orders-f__sheet-product-qty">' +

                            "تعداد: " +
                            formatNumberF(
                                product.qty
                            ) +

                            " · قیمت واحد: " +

                            formatNumberF(
                                price
                            ) +

                            " " +

                            currencyLabel +

                            "</span>" +

                            "</div>" +


                            "<span>" +

                            formatNumberF(
                                price *
                                product.qty *
                                totals.rate
                            ) +

                            " ریال</span>" +

                            "</div>"

                        );

                    }
                )
                .join("")

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

            '<div class="admin-orders-f__sheet-row">' +

            "<span>تخفیف</span>" +

            "<span>" +

            (
                order.discountRial
                    ?
                    "-" +
                    formatNumberF(
                        order.discountRial
                    ) +
                    " ریال"
                    :
                    "ندارد"
            ) +

            "</span>" +

            "</div>"

            +

            '<div class="admin-orders-f__sheet-row">' +

            "<span>هزینه ارسال</span>" +

            "<span>" +

            (
                order.shippingRial
                    ?
                    formatNumberF(
                        order.shippingRial
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
                formatNumberF(
                    totals.baseAmount
                ) +
                " " +
                currencyLabel
            )

            +

            sheetRowF(
                "نوع ارز",
                currencyLabel
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


    function downloadOrderF(
        orderNumber
    ) {

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


        triggers.forEach(
            function (button) {

                button.setAttribute(
                    "aria-busy",
                    "true"
                );

                button.disabled = true;

            }
        );


        showToastF(
            "در حال آماده‌سازی فایل PDF سفارش " +
            orderNumber +
            "…",
            null
        );


        fetchInvoicePdfBlobF(
            orderNumber
        )

            .then(
                function (blob) {

                    var url =
                        URL.createObjectURL(
                            blob
                        );


                    var link =
                        document.createElement(
                            "a"
                        );


                    link.href = url;

                    link.download =
                        "invoice-" +
                        orderNumber +
                        ".pdf";


                    document.body.appendChild(
                        link
                    );

                    link.click();

                    document.body.removeChild(
                        link
                    );


                    URL.revokeObjectURL(
                        url
                    );


                    showToastF(
                        "فایل سفارش " +
                        orderNumber +
                        " با موفقیت دانلود شد.",
                        "success"
                    );

                }
            )

            .catch(
                function () {

                    showToastF(
                        "سرویس تولید فاکتور هنوز به بک‌اند متصل نشده. لطفاً بعداً دوباره تلاش کنید.",
                        "error"
                    );

                }
            )

            .then(
                function () {

                    triggers.forEach(
                        function (button) {

                            button.removeAttribute(
                                "aria-busy"
                            );

                            button.disabled =
                                false;

                        }
                    );

                }
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

                    if (!activeOrderNumber) {
                        return;
                    }

                    showToastF(
                        "تغییر وضعیت سفارش هنوز به بک‌اند متصل نشده است.",
                        "error"
                    );

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


        var costInput =
            row.querySelector(
                ".admin-order-item-f__cost"
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
                    unitPriceF(
                        product
                    );
            }


            if (currencyInput) {

                currencyInput.value =
                    product.currency ||
                    "USD";
            }


            if (costInput) {

                costInput.value =
                    Number(
                        product.costPrice
                    ) || 0;
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
        }


        return row;
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

            var costInput =
                row.querySelector(
                    ".admin-order-item-f__cost"
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

            var cost =
                costInput
                    ? Number(costInput.value) || 0
                    : 0;

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
                !qty ||
                qty < 1
            ) {

                error =
                    "برای هر آیتم، نام و قیمت معتبر و حداقل ۱ عدد تعداد وارد کنید.";

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

                cost:
                    cost,

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

        // Per-currency subtotal in that currency's own units —
        // covers orders that mix currencies across items.
        var byCurrency = {};

        var itemsRial = 0;
        var profitRial = 0;

        var lines = items.map(function (item) {

            var rate =
                rates[item.currency]
                    ? rates[item.currency].rate
                    : 0;

            var lineForeign = item.price * item.qty;
            var lineRial = lineForeign * rate;
            var lineProfitRial =
                (item.price - item.cost) * item.qty * rate;

            itemsRial += lineRial;
            profitRial += lineProfitRial;

            byCurrency[item.currency] =
                (byCurrency[item.currency] || 0) + lineForeign;

            return {
                name: item.name,
                image: item.image,
                qty: item.qty,
                currency: item.currency,
                price: item.price,
                lineForeign: lineForeign,
                lineRial: lineRial,
                rate: rate
            };

        });

        var grandTotalRial =
            itemsRial + shippingRial + serviceRial;

        return {
            lines: lines,
            byCurrency: byCurrency,
            itemsRial: itemsRial,
            shippingRial: shippingRial,
            serviceRial: serviceRial,
            grandTotalRial: grandTotalRial,
            profitRial: profitRial
        };

    }


    /* ----------------------------------------------------------
     * Invoice rendering — one shared layout, two content sets
     * (the admin version adds the profit block).
     * ---------------------------------------------------------- */

    function renderInvoiceHtmlF(calc, meta, isAdminF) {

        var currencyRows = Object.keys(calc.byCurrency).map(
            function (code) {

                var label =
                    EXCHANGE_RATES_F[code]
                        ? EXCHANGE_RATES_F[code].label
                        : code;

                var rate =
                    EXCHANGE_RATES_F[code]
                        ? EXCHANGE_RATES_F[code].rate
                        : 0;

                return (
                    '<div class="admin-invoice-f__summary-row">' +
                    "<span>جمع کل (" + label + ") — نرخ روز: " +
                    formatNumberF(rate) + " ریال</span>" +
                    "<span>" +
                    calc.byCurrency[code].toLocaleString("en-US") +
                    " " + code + "</span>" +
                    "</div>"
                );

            }
        ).join("");


        var itemRows = calc.lines.map(function (line) {

            return (
                "<tr>" +
                '<td><div class="admin-invoice-f__item-cell">' +
                (line.image
                    ? '<img class="admin-invoice-f__item-img" src="' + line.image + '" alt="">'
                    : '<div class="admin-invoice-f__item-img"></div>') +
                "<span>" + line.name + "</span>" +
                "</div></td>" +
                "<td data-num>" + line.price.toLocaleString("en-US") + " " + line.currency + "</td>" +
                "<td data-num>" + line.qty.toLocaleString("fa-IR") + "</td>" +
                "<td data-num>" + line.lineForeign.toLocaleString("en-US") + " " + line.currency + "</td>" +
                "<td data-num>" + formatNumberF(line.lineRial) + " ریال</td>" +
                "</tr>"
            );

        }).join("");


        var profitBlock = "";

        if (isAdminF) {

            profitBlock =
                '<div class="admin-invoice-f__profit-f">' +
                '<p class="admin-invoice-f__profit-f-title">سود ادمین</p>' +
                '<div class="admin-invoice-f__summary-row">' +
                "<span>سود این سفارش (قیمت فروش − قیمت خرید)</span>" +
                "<span>" + formatNumberF(calc.profitRial) + " ریال</span>" +
                "</div>" +
                "</div>";

        }


        return (
            '<div class="admin-invoice-f__brand">' +
            '<span class="admin-invoice-f__logo" dir="ltr">SANAA</span>' +
            '<span class="admin-invoice-f__kind' +
            (isAdminF ? " admin-invoice-f__kind--admin-f" : "") + '">' +
            (isAdminF ? "فاکتور داخلی (ادمین)" : "فاکتور مشتری") +
            "</span>" +
            "</div>" +

            '<dl class="admin-invoice-f__meta">' +
            '<div class="admin-invoice-f__meta-row"><dt>شماره سفارش</dt><dd>' + meta.orderNumber + "</dd></div>" +
            '<div class="admin-invoice-f__meta-row"><dt>تاریخ صدور</dt><dd>' + meta.date + "</dd></div>" +
            '<div class="admin-invoice-f__meta-row"><dt>مشتری</dt><dd>' + meta.customerName + "</dd></div>" +
            '<div class="admin-invoice-f__meta-row"><dt>وضعیت پرداخت</dt><dd>' + meta.paymentLabel + "</dd></div>" +
            "</dl>" +

            '<table class="admin-invoice-f__table">' +
            "<thead><tr>" +
            "<th>محصول</th><th>قیمت واحد</th><th>تعداد</th><th>جمع (ارز اصلی)</th><th>جمع (ریال)</th>" +
            "</tr></thead>" +
            "<tbody>" + itemRows + "</tbody>" +
            "</table>" +

            '<div class="admin-invoice-f__summary">' +
            currencyRows +
            '<div class="admin-invoice-f__summary-row">' +
            "<span>هزینه خدمات</span><span>" + formatNumberF(calc.serviceRial) + " ریال</span>" +
            "</div>" +
            '<div class="admin-invoice-f__summary-row">' +
            "<span>هزینه باربری</span><span>" + formatNumberF(calc.shippingRial) + " ریال</span>" +
            "</div>" +
            '<div class="admin-invoice-f__summary-row admin-invoice-f__summary-row--total-f">' +
            "<span>مجموع کل</span><span>" + formatNumberF(calc.grandTotalRial) + " ریال</span>" +
            "</div>" +
            "</div>" +

            profitBlock +

            '<p class="admin-invoice-f__footer-note">' +
            "این فاکتور بر اساس نرخ ارز لحظه‌ی ثبت سفارش صادر شده است — Sanaa Online Shop" +
            "</p>"
        );

    }


    /* ----------------------------------------------------------
     * Invoice modals — open/close/navigate/print
     * ---------------------------------------------------------- */

    function openInvoiceModalF(id) {

        var modal = document.getElementById(id);

        if (modal) {
            modal.hidden = false;
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

    function printInvoiceF(containerId) {

        var content =
            document.getElementById(containerId);

        if (!content) {
            return;
        }


        // Inlined directly so the print window never depends on a
        // second network request for the site's stylesheet (which
        // was the actual cause of blank/empty PDFs — that request
        // doesn't always finish before print() fires, especially
        // right after a fresh page load).
        var printCss =
            "body{margin:0;padding:32px;background:#fff;" +
            "font-family:Tahoma,Arial,sans-serif;color:#191715;}" +
            ".admin-invoice-f{max-width:640px;margin:0 auto;}" +
            ".admin-invoice-f__brand{display:flex;align-items:center;" +
            "justify-content:space-between;margin-bottom:24px;" +
            "padding-bottom:16px;border-bottom:2px solid #191715;}" +
            ".admin-invoice-f__logo{color:#A61579;font-size:1.6rem;" +
            "letter-spacing:0.12em;font-weight:700;}" +
            ".admin-invoice-f__kind{padding:4px 12px;border-radius:999px;" +
            "background:#F6F2EC;color:#8A8178;font-size:0.7rem;" +
            "font-weight:600;}" +
            ".admin-invoice-f__kind--admin-f{background:rgba(166,21,121,.12);" +
            "color:#A61579;}" +
            ".admin-invoice-f__meta{display:grid;" +
            "grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:24px;" +
            "padding:16px;border-radius:8px;background:#F6F2EC;" +
            "font-size:0.78rem;}" +
            ".admin-invoice-f__meta-row dt{color:#8A8178;margin-bottom:2px;}" +
            ".admin-invoice-f__meta-row dd{margin:0;font-weight:600;}" +
            ".admin-invoice-f__table{width:100%;margin-bottom:24px;" +
            "border-collapse:collapse;}" +
            ".admin-invoice-f__table th{padding:8px;" +
            "border-bottom:1.5px solid #191715;color:#8A8178;" +
            "font-size:0.7rem;font-weight:600;text-align:right;}" +
            ".admin-invoice-f__table td{padding:8px;" +
            "border-bottom:1px solid #DCD4C8;font-size:0.8rem;" +
            "vertical-align:middle;}" +
            ".admin-invoice-f__item-cell{display:flex;align-items:center;" +
            "gap:8px;}" +
            ".admin-invoice-f__item-img{width:40px;height:40px;" +
            "flex-shrink:0;border-radius:4px;object-fit:cover;" +
            "background:#F6F2EC;}" +
            ".admin-invoice-f__summary{margin-right:auto;width:100%;" +
            "max-width:320px;display:flex;flex-direction:column;gap:4px;}" +
            ".admin-invoice-f__summary-row{display:flex;" +
            "align-items:center;justify-content:space-between;" +
            "font-size:0.8rem;color:#8A8178;}" +
            ".admin-invoice-f__summary-row span:last-child{color:#191715;}" +
            ".admin-invoice-f__summary-row--total-f{margin-top:4px;" +
            "padding-top:8px;border-top:1.5px solid #191715;" +
            "font-size:1rem;font-weight:700;color:#191715;}" +
            ".admin-invoice-f__summary-row--total-f span:last-child{" +
            "color:#A61579;}" +
            ".admin-invoice-f__profit-f{margin-top:24px;padding:16px;" +
            "border-radius:8px;border:1.5px dashed #A61579;" +
            "background:rgba(166,21,121,.05);}" +
            ".admin-invoice-f__profit-f-title{margin:0 0 8px;color:#A61579;" +
            "font-size:0.78rem;font-weight:700;}" +
            ".admin-invoice-f__footer-note{margin-top:32px;" +
            "padding-top:16px;border-top:1px solid #DCD4C8;" +
            "color:#8A8178;font-size:0.7rem;text-align:center;}" +
            "@media print{body{padding:0;}}";


        var printWindow =
            window.open(
                "",
                "_blank",
                "width=850,height=1000"
            );

        if (!printWindow) {

            showToastF(
                "مرورگر اجازه‌ی باز کردن پنجره‌ی چاپ را نداد — لطفاً پاپ‌آپ‌بلاکر را غیرفعال کنید.",
                "error"
            );

            return;

        }


        printWindow.document.write(
            "<!DOCTYPE html>" +
            '<html lang="fa" dir="rtl">' +
            "<head>" +
            '<meta charset="UTF-8">' +
            "<title>فاکتور — Sanaa</title>" +
            "<style>" + printCss + "</style>" +
            "</head>" +
            "<body>" +
            content.outerHTML +
            "</body>" +
            "</html>"
        );

        printWindow.document.close();


        // Give the new document a moment to finish painting
        // (images especially) before the print dialog opens —
        // waiting only on "load" isn't always enough for content
        // written via document.write().
        printWindow.addEventListener(
            "load",
            function () {

                setTimeout(function () {

                    printWindow.focus();
                    printWindow.print();

                }, 250);

            }
        );

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

                    var usdRate =
                        rates &&
                        rates.USD
                            ? rates.USD.rate
                            : 0;

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

                                var rateData =
                                    rates[
                                        item.currency
                                    ];

                                var exchangeRate =
                                    rateData
                                        ? rateData.rate
                                        : 0;

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

                                    quantity:
                                        item.qty,

                                    currency:
                                        item.currency,

                                    product_price:
                                        item.price,

                                    admin_cost:
                                        item.cost,

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

    function initAdminOrdersF() {

        initToolbarF();

        initDetailsSheetF();

        initGlobalActionsF();

        initNewOrderF();

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